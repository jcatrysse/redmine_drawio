# svg-sanitizer

Run 2026-10-07T16:03:41.875Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](svg-sanitizer-admin.png) | admin | `/projects/e2e-project/wiki/Drawio_svg_xss` | admin: SVG with XSS vectors shown inline (svg setting on); no script ran, the links do nothing; shapes, html label and data: image kept |
| ![](svg-sanitizer-manager.png) | manager | `/projects/e2e-project/wiki/Drawio_svg_xss` | manager: SVG with XSS vectors shown inline (svg setting on); no script ran, the links do nothing; shapes, html label and data: image kept |
| ![](svg-sanitizer-reporter.png) | reporter | `/projects/e2e-project/wiki/Drawio_svg_xss` | reporter: SVG with XSS vectors shown inline (svg setting on); no script ran, the links do nothing; shapes, html label and data: image kept |
| ![](svg-sanitizer-outsider.png) | outsider | `/projects/e2e-project/wiki/Drawio_svg_xss` | outsider: SVG with XSS vectors shown inline (svg setting on); no script ran, the links do nothing; shapes, html label and data: image kept |

## Problems

- admin: "<iframe" still in the page
- admin: "<animate" still in the page
- admin: "script:" still in the page
- admin: script ran (iframe)
- manager: "<iframe" still in the page
- manager: "<animate" still in the page
- manager: "script:" still in the page
- manager: script ran (iframe)
- reporter: "<iframe" still in the page
- reporter: "<animate" still in the page
- reporter: "script:" still in the page
- reporter: script ran (iframe)
- outsider: "<iframe" still in the page
- outsider: "<animate" still in the page
- outsider: "script:" still in the page
- outsider: script ran (iframe)
