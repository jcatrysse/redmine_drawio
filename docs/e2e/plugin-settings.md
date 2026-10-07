# plugin-settings

Run 2026-10-07T16:20:23.534Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](plugin-settings-plugins-list.png) | admin | `/admin/plugins` | Administration > Plugins lists Redmine Drawio plugin 1.5.5 with Configure |
| ![](plugin-settings-saved.png) | admin | `/settings/plugin/redmine_drawio` | Settings saved: service URL https://drawio.example.net, SVG enabled |
| ![](plugin-settings-default.png) | admin | `/settings/plugin/redmine_drawio` | Empty URL saved; the hint shows the default //embed.diagrams.net that is then used |
| ![](plugin-settings-manager-refused.png) | manager | `/settings/plugin/redmine_drawio` | manager (not admin) is refused the plugin settings (403) |
