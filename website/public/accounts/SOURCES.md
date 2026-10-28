# Account favicons

These are local, unmodified snapshots from the platforms' own websites/CDNs, downloaded on 2026-10-17. They identify the linked services, not endorsement or affiliation. The marks remain the property of their respective owners; no blanket license to redistribute trademarks is implied.

| Local file | Original URL | Format |
| --- | --- | --- |
| `github.svg` | https://github.githubassets.com/favicons/favicon.svg | SVG |
| `x.png` | https://abs.twimg.com/favicons/twitter.3.ico | PNG bytes despite the upstream `.ico` extension; currently the X mark, not the Twitter bird |
| `qq.ico` | https://im.qq.com/favicon.ico | ICO, 16 × 16 |
| `luogu.ico` | https://www.luogu.com.cn/favicon.ico | ICO, 32 × 32; shared by both Luogu accounts |
| `codeforces.png` | https://codeforces.org/s/64791/favicon-32x32.png | PNG, 32 × 32; upstream URL is versioned |
| `atcoder.png` | https://img.atcoder.jp/assets/favicon.png | PNG, 280 × 280 |

The original bytes are preserved (the X file only has its extension corrected). SVG content was checked for external references and active content. Icons are served as decorative `<img>` elements alongside visible service names.

CSS in `src/styles/global.css` adapts contrast without repainting the original artwork:

- GitHub and AtCoder: render the existing alpha silhouettes in near-white on a dark badge.
- X: screen blending removes the visual black square against the badge.
- Luogu: multiply blending integrates its white backing into a pale blue badge while keeping the blue pattern.
- QQ and Codeforces: retain the original colors and transparency. QQ stays at its native 16px size to avoid enlarging a low-resolution source.

All rendering and blend operations are local. No visitor request is sent to these upstream hosts. Refresh assets deliberately and inspect their appearance before replacing them; official favicon URLs or branding may change.
