// Function: saving a diagram whose name has characters that mean something in a
// URL query (& and +): the upload must keep the whole name, so the attachment is
// "R&D plan+v2_1.png" and the macro is rewritten to it.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, openEditor, saveInEditor, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('special-filename');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_name');
const frame = await openEditor(t, t.page.locator('img.drawioDiagram'), 'png');
const upload = t.page.waitForRequest(r => r.url().includes('/uploads.json'));
const status = await saveInEditor(t, frame, /\/wiki\/Drawio_name\.json/);
const url = (await upload).url();
if (status !== 204 && status !== 200) t.problems.push(`PUT wiki page: HTTP ${status}`);
await t.go('/projects/e2e-project/wiki/Drawio_name');
const files = await t.page.locator('.attachments').innerText();
if (!files.includes('R&D plan+v2_1.png')) t.problems.push(`attachment name wrong: ${files.replace(/\s+/g, ' ')} (upload ${url})`);
// the upload itself must carry the whole name, else Redmine stores it as "R"
// without extension and the attachment loses its image type (no thumbnail)
if (!url.includes('filename=R%26D%20plan%2Bv2_1.png')) t.problems.push(`upload not URL-encoded: ${url}`);
await t.page.locator('fieldset legend').filter({ hasText: 'Files' }).first().click();
await t.page.mouse.move(800, 700);
const thumb = t.page.locator('.attachments .thumbnails img').first();
await thumb.scrollIntoViewIfNeeded().catch(() => {});
await t.page.waitForFunction(() => { const i = document.querySelector('.attachments .thumbnails img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 10000 })
  .catch(() => t.problems.push('no thumbnail for the saved png'));
await t.shot('saved', `Upload ${url.replace(t.BASE, '')}: the attachment keeps its full name "R&D plan+v2_1.png", image type and thumbnail`);
await t.go('/projects/e2e-project/wiki/Drawio_name/edit');
if (!(await t.page.inputValue('#content_text')).includes('{{drawio_attach(R&D plan+v2_1.png)}}')) t.problems.push('macro not rewritten to R&D plan+v2_1.png');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
