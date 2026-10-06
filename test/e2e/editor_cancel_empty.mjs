// Function: leaving the editor without saving, and refusing an empty diagram.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, openEditor, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('editor-cancel-empty');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png/history');
const versions = await t.page.locator('table.wiki-page-versions tbody tr').count();
await t.go('/projects/e2e-project/wiki/Drawio_png');
const dialogs = [];
t.page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
const frame = await openEditor(t, t.page.locator('img.drawioDiagram'), 'png');
await frame.locator('#save-empty').click();
await t.page.waitForTimeout(500);
if (!dialogs.some(m => /empty/i.test(m))) t.problems.push(`no empty-diagram alert: ${dialogs.join(' | ')}`);
await t.page.evaluate(m => {
  const p = document.createElement('pre'); p.textContent = `alert shown: ${m}`;
  p.style.cssText = 'position:fixed;bottom:0;left:0;z-index:2147483647;background:#ffd;padding:8px;border:1px solid #cc9';
  document.body.append(p);
}, dialogs.join(' | '));
await t.shot('empty-refused', `Saving an empty diagram is refused with an alert ("${dialogs[0] || 'none'}"); the editor stays open`);
await frame.locator('#exit').click();
await t.page.waitForTimeout(500);
if (await t.page.locator('iframe.drawioEditor').count()) t.problems.push('editor still open after exit');
await t.go('/projects/e2e-project/wiki/Drawio_png/history');
if ((await t.page.locator('table.wiki-page-versions tbody tr').count()) !== versions) t.problems.push('a version was added although nothing was saved');
await t.shot('exit-nothing-saved', 'Exit closes the editor; no new version in the page history');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
