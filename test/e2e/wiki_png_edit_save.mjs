// Function: edit and save a png diagram on a wiki page ({{drawio_attach(flow)}}).
// Double click opens the editor (here the local diagrams.net stub), Save uploads
// flow_1.png as an attachment through the REST API with the key fetched from
// POST /drawio/api_key, and rewrites the macro to flow_1.
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
t.page.on('request', r => { if (r.url().endsWith('/drawio/api_key')) keyRequests.push(r.method()); });
await img.dblclick();
const frame = t.page.frameLocator('iframe.drawioEditor');
await frame.locator('#status').filter({ hasText: 'loaded png' }).waitFor({ timeout: 15000 });
await t.shot('editor-open', 'Double click opens the editor iframe (stub) with the png loaded, ui=kennedy, lang=en');

const saved = t.page.waitForResponse(r => /\/wiki\/Drawio_png\.json/.test(r.url()) && r.request().method() === 'PUT');
await frame.locator('#save').click();
const put = await saved;
if (put.status() !== 204 && put.status() !== 200) t.problems.push(`PUT wiki page: HTTP ${put.status()}`);
await t.page.waitForTimeout(1500);
if (keyRequests.join() !== 'POST') t.problems.push(`api key requests: ${keyRequests.join() || 'none'}`);
await t.shot('saved-in-place', 'After Save: editor closed, the red diagram shown in place, attachment list updated without reload');

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
