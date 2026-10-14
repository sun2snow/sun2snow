#!/usr/bin/env python3
"""Publish validated SVGs to output, preserving other assets and source history.

Uses only Python's standard library and Git. Authentication comes from the
existing checkout (actions/checkout); no PAT or token in a remote URL is needed.
"""

import argparse
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET


OUTPUT_REF = "refs/heads/output"
SVG_TAG = "{http://www.w3.org/2000/svg}svg"


def git(repo, *args, check=True):
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=check,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    )


def validate_assets(paths):
    assets = {}
    for path in paths:
        path = Path(path).resolve(strict=True)
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]*\.svg", path.name):
            raise ValueError("Expected an SVG filename: {}".format(path.name))
        if path.name in assets:
            raise ValueError("Duplicate output filename: {}".format(path.name))
        root = ET.parse(path).getroot()
        if root.tag != SVG_TAG or len(root) == 0:
            raise ValueError("Invalid or empty SVG: {}".format(path.name))
        # Snapshot all inputs before touching Git, so a bad/missing second file
        # cannot result in a partial update or replace the last good assets.
        assets[path.name] = path.read_bytes()
    if not assets:
        raise ValueError("At least one SVG is required")
    return assets


def publish(repo, paths, message):
    assets = validate_assets(paths)
    repo = Path(git(repo, "rev-parse", "--show-toplevel").stdout.strip())
    remote = git(repo, "ls-remote", "--exit-code", "--heads", "origin", OUTPUT_REF, check=False)
    if remote.returncode not in (0, 2):
        # Exit 2 means a genuinely missing branch; authentication/network
        # failures must never be mistaken for an empty output branch.
        raise RuntimeError("Cannot inspect output branch: " + remote.stderr.strip())

    parent = None
    if remote.returncode == 0:
        git(repo, "fetch", "--no-tags", "origin", OUTPUT_REF)
        parent = git(repo, "rev-parse", "FETCH_HEAD").stdout.strip()
    base = parent or git(repo, "rev-parse", "HEAD").stdout.strip()

    with tempfile.TemporaryDirectory(prefix="profile-output-") as temporary:
        worktree = Path(temporary) / "worktree"
        git(repo, "worktree", "add", "--detach", str(worktree), base)
        try:
            if parent is None:
                git(worktree, "rm", "-r", "-f", "--ignore-unmatch", ".")
            for name, content in assets.items():
                destination = worktree / name
                if destination.is_symlink() or (destination.exists() and not destination.is_file()):
                    raise ValueError("Refusing to overwrite non-file output: " + name)
                destination.write_bytes(content)
            git(worktree, "add", "--", *assets)
            if parent and git(worktree, "diff", "--cached", "--quiet", check=False).returncode == 0:
                print("Generated assets are unchanged; nothing to publish.")
                return False

            tree = git(worktree, "write-tree").stdout.strip()
            parents = ["-p", parent] if parent else []
            commit = git(
                worktree,
                "-c", "user.name=github-actions[bot]",
                "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
                "commit-tree", tree, *parents, "-m", message,
            ).stdout.strip()
            # A new output branch has no source-code parent. Subsequent updates
            # are fast-forwards; no force push, even if an external writer races.
            git(worktree, "push", "origin", "{}:{}".format(commit, OUTPUT_REF))
            print("Published: " + ", ".join(sorted(assets)))
            return True
        finally:
            git(repo, "worktree", "remove", "--force", str(worktree))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", type=Path, nargs="+")
    parser.add_argument("--message", default="chore: refresh generated profile assets")
    args = parser.parse_args()
    try:
        publish(Path.cwd(), args.paths, args.message)
    except subprocess.CalledProcessError as error:
        parser.exit(1, "Git operation failed: {}\n".format(error.stderr.strip()))
    except (OSError, ValueError, RuntimeError, ET.ParseError) as error:
        parser.exit(1, "Publication failed: {}\n".format(error))


if __name__ == "__main__":
    main()
