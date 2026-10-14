// Function: edit and save a png diagram on a wiki page ({{drawio_attach(flow)}}).
// Double click opens the editor (here the local diagrams.net stub), Save uploads
// flow_1.png as an attachment through the REST API, authenticated with a short lived
// token fetched from POST /drawio/token (never the API key), and rewrites the macro to flow_1.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('wiki-png-edit-save');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png');
const img = t.page.locator('img.drawioDiagram');
await t.shot('default-image', 'Missing flow.png: the default diagram is shown, editable (title "Double click to edit diagram")');
if ((await img.getAttribute('title')) !== 'Double click to edit diagram') t.problems.push('manager: diagram not editable');
const html = await t.page.content();
if (/hashCode/.test(html)) t.problems.push('page still embeds hashCode');

const keyRequests = [];
const restAuth = [];
t.page.on('request', r => {
  if (r.url().endsWith('/drawio/token')) keyRequests.push(r.method());
  if (/\.json(\?|$)/.test(r.url())) {
    const h = r.headers();
    restAuth.push(`${r.method()} ${r.url().replace(t.BASE, '')} token=${!!h['x-redmine-drawio-token']} apikey=${!!h['x-redmine-api-key']}`);
  }
});
await img.dblclick();
const frame = t.page.frameLocator('iframe.drawioEditor');
await frame.locator('#status').filter({ hasText: 'loaded png' }).waitFor({ timeout: 15000 });
await t.shot('editor-open', 'Double click opens the editor iframe (stub) with the png loaded, ui=kennedy, lang=en');

const saved = t.page.waitForResponse(r => /\/wiki\/Drawio_png\.json/.test(r.url()) && r.request().method() === 'PUT');
await frame.locator('#save').click();
const put = await saved;
if (put.status() !== 204 && put.status() !== 200) t.problems.push(`PUT wiki page: HTTP ${put.status()}`);
await t.page.waitForTimeout(1500);
if (keyRequests.join() !== 'POST') t.problems.push(`token requests: ${keyRequests.join() || 'none'}`);
if (restAuth.length < 3 || restAuth.some(l => !l.includes('token=true') || l.includes('apikey=true'))) t.problems.push(`REST requests not all token-authenticated: ${restAuth.join(' | ')}`);
await t.page.evaluate(lines => {
  const p = document.createElement('pre'); p.textContent = 'REST requests of the save:\n' + lines.join('\n');
  p.style.cssText = 'background:#ffd;padding:8px;border:1px solid #cc9';
  document.querySelector('#content').prepend(p);
}, restAuth);
await t.shot('saved-in-place', 'After Save: the red diagram shown in place; every REST request of the save carried X-Redmine-Drawio-Token and none an API key');

await t.go('/projects/e2e-project/wiki/Drawio_png');
const att = await t.page.locator('.attachments').innerText();
if (!/flow_1\.png/.test(att)) t.problems.push('attachment flow_1.png missing after reload');
await t.shot('saved-reloaded', 'Reloaded: the page now shows flow_1.png (attachment listed)');
await t.go('/projects/e2e-project/wiki/Drawio_png/edit');
const text = await t.page.locator('#content_text').inputValue();
if (!/\{\{drawio_attach\(flow_1\.png\)\}\}/.test(text)) t.problems.push(`macro not rewritten: ${text}`);
await t.shot('macro-rewritten', 'The page source now references {{drawio_attach(flow_1.png)}}');
await t.go('/projects/e2e-project/wiki/Drawio_png/history');
await t.shot('history', 'Wiki history: new version with comment "flow.png -> flow_1.png" by manager');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
