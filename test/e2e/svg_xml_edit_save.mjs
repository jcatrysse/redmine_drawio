// Function: edit and save svg (inline) and xml diagrams on wiki pages.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, openEditor, saveInEditor, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('svg-xml-edit-save');
await setDrawioSettings(t, { url: STUB_URL, svg: true });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_svg');
let frame = await openEditor(t, t.page.locator('span.drawioDiagram'), 'svg');
let status = await saveInEditor(t, frame, /\/wiki\/Drawio_svg\.json/);
if (status !== 204 && status !== 200) t.problems.push(`svg save: HTTP ${status}`);
await t.go('/projects/e2e-project/wiki/Drawio_svg');
if (!(await t.page.locator('span.drawioDiagram').innerHTML()).includes('Saved by the e2e stub')) t.problems.push('saved svg not shown');
await t.shot('svg-saved', 'svg diagram saved as flow_1.svg and rendered inline after reload ("Saved by the e2e stub")');

await t.go('/projects/e2e-project/wiki/Drawio_xml');
await t.page.locator('.mxgraph svg').first().waitFor({ timeout: 15000 }).catch(() => {});
await t.page.locator('.mxgraph').first().hover();
// the viewer puts its toolbar outside the .mxgraph container
const edit = t.page.locator('div[title="Edit"]').first();
frame = null;
if (await edit.count()) {
  await edit.click();
  frame = t.page.frameLocator('iframe.drawioEditor');
  await frame.locator('#status').filter({ hasText: 'loaded xml' }).waitFor({ timeout: 15000 });
} else {
  t.problems.push('xml viewer toolbar has no Edit button');
}
if (frame) {
  await t.shot('xml-editor', 'The viewer toolbar Edit button opens the editor with the xml loaded');
  status = await saveInEditor(t, frame, /\/wiki\/Drawio_xml\.json/);
  if (status !== 204 && status !== 200) t.problems.push(`xml save: HTTP ${status}`);
}
await t.go('/projects/e2e-project/wiki/Drawio_xml');
await t.page.locator('.mxgraph svg').first().waitFor({ timeout: 15000 }).catch(() => {});
if (!/flow_1\.xml/.test(await t.page.content())) t.problems.push('flow_1.xml not attached');
await t.shot('xml-saved', 'xml diagram saved as flow_1.xml; the viewer draws "Saved by the e2e stub"');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
