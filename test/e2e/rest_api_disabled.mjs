// Function: with Redmine's REST API disabled, administrators get a warning on
// every page, other users do not, and saving a diagram fails with a message
// (the key endpoint answers 403) instead of silently.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, setRestApi, reseed, openEditor, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('rest-api-disabled');
await setDrawioSettings(t, { url: STUB_URL, svg: false });
await setRestApi(t, false);

await t.go('/projects/e2e-project');
if (!(await t.page.locator('#flash_warning').count())) t.problems.push('admin: no REST API warning');
await t.shot('admin-warning', 'REST API off: the admin sees the drawio warning that the REST API must be enabled');

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png');
if (await t.page.locator('#flash_warning').count()) t.problems.push('manager sees the admin warning');
const dialogs = [];
t.page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
const frame = await openEditor(t, t.page.locator('img.drawioDiagram'), 'png');
const key = t.page.waitForResponse(r => r.url().endsWith('/drawio/api_key'));
await frame.locator('#save').click();
const res = await key;
await t.page.waitForTimeout(1000);
t.check('save with REST API off', { requests: ['403 xhr /drawio/api_key'], js: ['403'] });
if (res.status() !== 403) t.problems.push(`api key with REST off: HTTP ${res.status()}`);
if (!dialogs.length) t.problems.push('no error alert');
await t.page.evaluate(m => {
  const p = document.createElement('pre'); p.textContent = `alert shown: ${m}`;
  p.style.cssText = 'background:#ffd;padding:8px;border:1px solid #cc9';
  document.querySelector('#content').prepend(p);
}, dialogs.join(' | '));
await t.shot('save-refused', `manager, REST off: saving shows the alert "${(dialogs[0] || 'nothing').replace(/\s+/g, ' ')}" (the diagram is already replaced in the page, nothing is stored); no warning banner for non-admins`);
await t.go('/projects/e2e-project/wiki/Drawio_png/edit');
if (!/\{\{drawio_attach\(flow\)\}\}/.test(await t.page.inputValue('#content_text'))) t.problems.push('page changed although saving failed');

await setRestApi(t, true);
await t.go('/projects/e2e-project');
if (await t.page.locator('#flash_warning').count()) t.problems.push('warning still shown with REST on');
await t.shot('admin-no-warning', 'REST API on again: no warning');
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
