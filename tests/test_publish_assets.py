"""Offline integration tests: every push targets a disposable local repository."""

import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("publish_assets", ROOT / "scripts" / "publish_assets.py")
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)

SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>{}</text></svg>\n'


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="profile-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.remote = self.root / "remote.git"
        self.repo = self.root / "source"
        self.repo.mkdir()
        publisher.git(self.root, "init", "--bare", str(self.remote))
        publisher.git(self.repo, "init")
        publisher.git(self.repo, "symbolic-ref", "HEAD", "refs/heads/main")
        publisher.git(self.repo, "config", "user.name", "Profile test")
        publisher.git(self.repo, "config", "user.email", "profile-test@example.invalid")
        publisher.git(self.repo, "config", "commit.gpgsign", "false")
        publisher.git(self.repo, "config", "core.hooksPath", "/dev/null")
        (self.repo / "README.md").write_text("Source stays on main.\n", encoding="utf-8")
        publisher.git(self.repo, "add", "README.md")
        publisher.git(self.repo, "commit", "-m", "Initial source")
        publisher.git(self.repo, "remote", "add", "origin", str(self.remote))
        publisher.git(self.repo, "push", "origin", "main")
        self.source_head = publisher.git(self.repo, "rev-parse", "HEAD").stdout.strip()
        self.dist = self.root / "dist"
        self.dist.mkdir()

    def asset(self, name, label="Generated test fixture"):
        path = self.dist / name
        path.write_text(SVG.format(label), encoding="utf-8")
        return path

    def publish(self, *paths):
        return publisher.publish(self.repo, paths, "Test asset update")

    def remote_head(self):
        return publisher.git(self.remote, "rev-parse", "output").stdout.strip()

    def output_files(self):
        return set(publisher.git(self.remote, "ls-tree", "--name-only", "output").stdout.splitlines())

    def test_first_publish_is_an_orphan_and_leaves_main_alone(self):
        self.assertTrue(self.publish(self.asset("stats-light.svg"), self.asset("stats-dark.svg")))
        self.assertEqual(self.output_files(), {"stats-light.svg", "stats-dark.svg"})
        self.assertEqual(publisher.git(self.remote, "rev-list", "--count", "output").stdout.strip(), "1")
        self.assertEqual(publisher.git(self.remote, "rev-parse", "main").stdout.strip(), self.source_head)
        self.assertEqual(publisher.git(self.repo, "rev-parse", "HEAD").stdout.strip(), self.source_head)
        self.assertEqual(publisher.git(self.repo, "status", "--porcelain").stdout, "")

    def test_generators_preserve_each_others_files(self):
        stats = self.asset("stats-dark.svg", "First stats")
        self.publish(stats)
        first = self.remote_head()
        self.publish(self.asset("snake-dark.svg", "Snake"))
        self.assertEqual(publisher.git(self.remote, "rev-parse", "output^").stdout.strip(), first)
        self.assertEqual(self.output_files(), {"stats-dark.svg", "snake-dark.svg"})
        stats.write_text(SVG.format("Updated stats"), encoding="utf-8")
        self.publish(stats)
        self.assertEqual(self.output_files(), {"stats-dark.svg", "snake-dark.svg"})
        snake = publisher.git(self.remote, "show", "output:snake-dark.svg").stdout
        self.assertEqual(snake, SVG.format("Snake"))

    def test_unchanged_assets_do_not_create_a_commit(self):
        stats = self.asset("stats-light.svg")
        self.publish(stats)
        first = self.remote_head()
        self.assertFalse(self.publish(stats))
        self.assertEqual(self.remote_head(), first)

    def test_dirty_source_and_staged_changes_are_preserved(self):
        (self.repo / "README.md").write_text("Uncommitted local edit.\n", encoding="utf-8")
        publisher.git(self.repo, "add", "README.md")
        (self.repo / "local-note.txt").write_text("Do not touch.\n", encoding="utf-8")
        before = publisher.git(self.repo, "status", "--porcelain").stdout
        self.publish(self.asset("snake-light.svg"))
        self.assertEqual(publisher.git(self.repo, "status", "--porcelain").stdout, before)
        self.assertEqual(publisher.git(self.repo, "show", ":README.md").stdout, "Uncommitted local edit.\n")

    def test_invalid_second_svg_leaves_previous_output_untouched(self):
        stats = self.asset("stats-light.svg", "Last good stats")
        self.publish(stats)
        before = self.remote_head()
        stats.write_text(SVG.format("New but not publishable yet"), encoding="utf-8")
        broken = self.dist / "stats-dark.svg"
        broken.write_text("<svg>", encoding="utf-8")
        with self.assertRaises(ET.ParseError):
            self.publish(stats, broken)
        self.assertEqual(self.remote_head(), before)
        self.assertEqual(publisher.git(self.remote, "show", "output:stats-light.svg").stdout, SVG.format("Last good stats"))

    def test_missing_input_does_not_create_output(self):
        with self.assertRaises(FileNotFoundError):
            self.publish(self.asset("stats-light.svg"), self.dist / "missing.svg")
        result = publisher.git(self.remote, "show-ref", "--verify", "refs/heads/output", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_remote_failure_is_not_treated_as_a_missing_branch(self):
        stats = self.asset("stats-light.svg")
        self.publish(stats)
        before = self.remote_head()
        publisher.git(self.repo, "remote", "set-url", "origin", str(self.root / "nonexistent.git"))
        with self.assertRaisesRegex(RuntimeError, "Cannot inspect output branch"):
            self.publish(stats)
        self.assertEqual(self.remote_head(), before)

    def test_failed_push_cleans_up_worktree_and_preserves_output(self):
        stats = self.asset("stats-light.svg")
        self.publish(stats)
        before = self.remote_head()
        stats.write_text(SVG.format("Changed"), encoding="utf-8")
        original_git = publisher.git

        def rejecting_git(repo, *args, **kwargs):
            if args and args[0] == "push":
                raise subprocess.CalledProcessError(1, ["git", "push"], stderr="Rejected test push")
            return original_git(repo, *args, **kwargs)

        with patch.object(publisher, "git", side_effect=rejecting_git):
            with self.assertRaises(subprocess.CalledProcessError):
                self.publish(stats)
        self.assertEqual(self.remote_head(), before)
        worktrees = publisher.git(self.repo, "worktree", "list", "--porcelain").stdout
        self.assertEqual(sum(line.startswith("worktree ") for line in worktrees.splitlines()), 1)


class ValidationTests(unittest.TestCase):
    def test_headers_are_valid_accessible_svg(self):
        headers = [ROOT / "assets" / "header-dark.svg", ROOT / "assets" / "header-light.svg"]
        self.assertEqual(len(publisher.validate_assets(headers)), 2)
        for path in headers:
            root = ET.parse(path).getroot()
            self.assertIsNotNone(root.find("{http://www.w3.org/2000/svg}title"))
            self.assertIsNotNone(root.find("{http://www.w3.org/2000/svg}desc"))

    def test_empty_input_is_rejected(self):
        with self.assertRaises(ValueError):
            publisher.validate_assets([])

    def test_html_empty_svg_and_wrong_extension_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            for filename, content in [
                ("bad.svg", "<html><body>Error</body></html>"),
                ("empty.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>'),
                ("bad.txt", SVG.format("Text")),
            ]:
                with self.subTest(filename=filename):
                    path = Path(directory) / filename
                    path.write_text(content, encoding="utf-8")
                    with self.assertRaises(ValueError):
                        publisher.validate_assets([path])

    def test_duplicate_output_names_are_rejected(self):
        header = ROOT / "assets" / "header-dark.svg"
        with self.assertRaisesRegex(ValueError, "Duplicate output filename"):
            publisher.validate_assets([header, header])


if __name__ == "__main__":
    unittest.main()
