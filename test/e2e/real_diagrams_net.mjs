// Function: editing and saving with the real editor of embed.diagrams.net (the
// default service URL), not the local stub. Needs internet access from the
// browser; without it the scenario records that it could not run.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { setDrawioSettings, reseed } from '../e2e_support/drawio.mjs';

reseed();
const t = await e2e('real-diagrams-net');
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });

await t.login('manager');
const probe = await t.page.request.get('https://embed.diagrams.net/', { timeout: 20000 }).catch(() => null);
if (!probe || probe.status() !== 200) {
  await t.go('/projects/e2e-project/wiki/Drawio_png');
  await t.shot('offline', 'embed.diagrams.net is not reachable from this browser: real editor not tested here (the stub scenarios cover the save flow)');
  await t.done();
  process.exit(0);
}

await t.go('/projects/e2e-project/wiki/Drawio_png');
await t.page.locator('img.drawioDiagram').dblclick();
const frame = t.page.frameLocator('iframe.drawioEditor');
// the embed editor shows Save / Exit buttons once it has the diagram
const save = frame.getByRole('button', { name: /^Save$/ }).or(frame.locator('button:has-text("Save")')).first();
await save.waitFor({ timeout: 60000 });
await t.page.waitForTimeout(2000);
// diagrams.net polls its own /notifications, which answers 404
t.check('real editor loaded', { requests: ['embed.diagrams.net/notifications'] });
await t.shot('editor', 'Double click opens the real diagrams.net editor (embed.diagrams.net, ui=kennedy) with the default diagram');
// add a shape from the General palette (a click inserts it next to the selection)
await frame.locator('.geSidebarContainer a.geItem').nth(4).click();
await t.page.waitForTimeout(1000);
await t.shot('edited', 'An ellipse added in the editor before saving');

const put = t.page.waitForResponse(r => /\/wiki\/Drawio_png\.json/.test(r.url()) && r.request().method() === 'PUT', { timeout: 60000 });
await save.click();
const res = await put;
if (res.status() !== 204 && res.status() !== 200) t.problems.push(`PUT wiki page: HTTP ${res.status()}`);
await t.page.waitForTimeout(2000);
await t.go('/projects/e2e-project/wiki/Drawio_png');
if (!/flow_1\.png/.test(await t.page.content())) t.problems.push('flow_1.png not attached');
await t.shot('saved', 'Saved through the real editor: flow_1.png (png with the diagram source embedded) attached and shown with the added ellipse');
const src = await t.page.locator('img.drawioDiagram').getAttribute('src');
const png = Buffer.from(src.split(',')[1], 'base64').toString('latin1');
if (!/mxfile|mxGraphModel|zTXt|tEXt/.test(png)) t.problems.push('saved png carries no diagram source');
await t.done();
