// Function: the plugin settings page (Administration > Plugins > Configure):
// diagrams.net service URL and the svg switch; refused to non-admins.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { setDrawioSettings } from '../e2e_support/drawio.mjs';

const t = await e2e('plugin-settings');
await t.login('admin');
await t.go('/admin/plugins');
await t.shot('plugins-list', 'Administration > Plugins lists Redmine Drawio plugin 1.5.5 with Configure');
await setDrawioSettings(t, { url: 'https://drawio.example.net', svg: true });
await t.go('/settings/plugin/redmine_drawio');
await t.sudo();
if ((await t.page.inputValue('input[name="settings[drawio_service_url]"]')) !== 'https://drawio.example.net') t.problems.push('url not saved');
if (!(await t.page.locator('input[name="settings[drawio_svg_enabled]"]').isChecked())) t.problems.push('svg not saved');
await t.shot('saved', 'Settings saved: service URL https://drawio.example.net, SVG enabled');
await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png');
const url = await t.page.evaluate(() => window.Drawio && Drawio.settings.drawioUrl);
if (url !== 'https://drawio.example.net') t.problems.push(`page uses ${url}`);
await setDrawioSettings(t, { url: '', svg: false });
await t.go('/settings/plugin/redmine_drawio');
await t.sudo();
await t.shot('default', 'Empty URL saved; the hint shows the default //embed.diagrams.net that is then used');
await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png');
const def = await t.page.evaluate(() => window.Drawio && Drawio.settings.drawioUrl);
if (def !== '//embed.diagrams.net') t.problems.push(`empty url falls back to ${def}`);
await t.go('/settings/plugin/redmine_drawio', { status: 403 });
await t.shot('manager-refused', 'manager (not admin) is refused the plugin settings (403)');
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await t.done();
