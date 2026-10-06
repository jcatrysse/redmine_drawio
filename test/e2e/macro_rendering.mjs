// Function: the drawio_attach macro renders diagrams in wiki pages: png (default
// image when the attachment is missing, the attachment when it exists), xml and
// drawio through the diagrams.net viewer, size=, the deprecated drawio macro, svg
// refused while the svg setting is off and rendered inline when it is on, and
// what an unsupported extension does.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('macro-rendering');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_attached');
const stored = await t.page.locator('img.drawioDiagram').getAttribute('src');
if (!/^data:image\/png/.test(stored) || stored.length > 1000) t.problems.push('stored.png not rendered from its 259-byte attachment');
await t.shot('png-attachment', 'Existing attachment stored.png (16x16 icon) rendered inline as a data: png');

await t.go('/projects/e2e-project/wiki/Drawio_xml');
await t.page.locator('.mxgraph svg, .geDiagramContainer').first().waitFor({ timeout: 15000 }).catch(() => t.problems.push('xml viewer did not draw'));
await t.shot('xml-drawio', 'flow.xml and other.drawio (zoom=true) drawn by the diagrams.net viewer (viewer-static.min.js from the service URL)');

await t.go('/projects/e2e-project/wiki/Drawio_options', { allow: { js: [] } });
const width = await t.page.locator('img.drawioDiagram').first().evaluate(e => e.getBoundingClientRect().width);
if (Math.round(width) !== 120) t.problems.push(`size=120 gave width ${width}`);
const body = await t.page.locator('#content .wiki').first().innerText();
if (!body.includes('The drawio macro is deprecated')) t.problems.push('deprecated macro message missing');
await t.shot('options', 'size=120 gives a 120px wide diagram; the deprecated drawio macro shows its message; notes.txt shows a macro error (see caption in plan)');

await t.go('/projects/e2e-project/wiki/Drawio_svg');
if (!(await t.page.locator('#content .wiki').first().innerText()).includes('svg diagrams are disabled by the administrator')) t.problems.push('svg refusal message missing');
await t.shot('svg-disabled', 'With the svg setting off the svg macro is refused with a message');

await setDrawioSettings(t, { url: STUB_URL, svg: true });
await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_svg');
if (!(await t.page.locator('span.drawioDiagram svg').count())) t.problems.push('svg not rendered inline');
if ((await t.page.locator('#content .wiki').first().innerText()).includes('DOCTYPE')) t.problems.push('DOCTYPE shown as text above the svg');
await t.shot('svg-enabled', 'With the svg setting on the default svg diagram is rendered inline (span.drawioDiagram > svg), without DOCTYPE text above it');

await t.anonymous();
await t.go('/projects/e2e-project/wiki/Drawio_attached');
if (await t.page.locator('img.drawioDiagram[title]').count()) t.problems.push('anonymous: diagram editable');
if (await t.page.evaluate(() => typeof window.Drawio !== 'undefined' && !!window.Drawio.settings)) t.problems.push('anonymous: editor settings on the page');
await t.shot('anonymous', 'Anonymous on a public project sees the diagram, not editable (no title, no editor script)');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
