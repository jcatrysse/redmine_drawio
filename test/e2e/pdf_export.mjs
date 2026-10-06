// Function: PDF export of wiki pages and issues with diagrams. For a stored
// diagram the macro returns an <img> to the attachment, which the plugin's RBPDF
// patch resolves to the file; the PDF pages are rendered to png (pdftoppm) and
// shown here.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { reseed } from '../e2e_support/drawio.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const seeded = reseed();
const id = seeded.match(/issue #(\d+)/)[1];
const t = await e2e('pdf-export');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drawio-pdf-'));

async function showPdf(url, shotName, caption) {
  const res = await t.page.request.get(t.BASE + url);
  if (res.status() !== 200 || !/application\/pdf/.test(res.headers()['content-type'])) {
    t.problems.push(`${url}: HTTP ${res.status()} ${res.headers()['content-type']}`);
    return;
  }
  const file = path.join(tmp, `${shotName}.pdf`);
  fs.writeFileSync(file, await res.body());
  execFileSync('pdftoppm', ['-png', '-r', '60', '-f', '1', '-l', '1', file, path.join(tmp, shotName)]);
  const png = fs.readdirSync(tmp).find(f => f.startsWith(shotName) && f.endsWith('.png'));
  const data = fs.readFileSync(path.join(tmp, png)).toString('base64');
  await t.page.setContent(`<div style="font:14px sans-serif;padding:8px">${url} (HTTP 200, ${fs.statSync(file).size} bytes), page 1:</div>` +
    `<img style="border:1px solid #999;margin:8px" src="data:image/png;base64,${data}">`);
  await t.shot(shotName, caption);
}

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_attached');
await showPdf('/projects/e2e-project/wiki/Drawio_attached.pdf', 'wiki-stored', 'Wiki PDF: the stored diagram (stored.png, 16x16 icon) is in the PDF');
await t.go('/projects/e2e-project/wiki/Drawio_png');
await showPdf('/projects/e2e-project/wiki/Drawio_png.pdf', 'wiki-default', 'Wiki PDF of a page whose diagram has no attachment yet');
await t.go(`/issues/${id}`);
await showPdf(`/issues/${id}.pdf`, 'issue', 'Issue PDF with the diagrams of description and note');
await t.done();
