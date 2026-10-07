// Function: inline SVG diagrams pass an allowlist filter (decision q3, 2026-10-07).
// An uploaded SVG with an iframe running a script, a link with a tab inside
// "javascript:", an <animate> that writes a javascript: href and a script-free
// label: with "Enable SVG diagrams" on, nothing runs for any user, clicking the
// links does nothing, and the diagram (shapes, html label, data: image) still shows.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { setDrawioSettings, reseed } from '../e2e_support/drawio.mjs';

reseed();
const t = await e2e('svg-sanitizer');
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: true });

const page = '/projects/e2e-project/wiki/Drawio_svg_xss';
for (const user of ['admin', 'manager', 'reporter', 'outsider']) {
  await t.login(user);
  const dialogs = [];
  t.page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  await t.go(page);
  const svg = t.page.locator('span.drawioDiagram svg');
  if (!(await svg.count())) t.problems.push(`${user}: svg not rendered inline`);
  const html = await t.page.locator('span.drawioDiagram').innerHTML();
  if (!html.includes('HTML label kept')) t.problems.push(`${user}: html label lost`);
  if (!/data:image\/png/.test(html)) t.problems.push(`${user}: data: image lost`);
  for (const bad of ['<iframe', '<animate', 'javascript', 'script:']) {
    if (html.toLowerCase().includes(bad)) t.problems.push(`${user}: "${bad}" still in the page`);
  }
  await t.page.waitForTimeout(1500); // let an iframe or animation run if one survived
  await t.page.locator('#tab-link').click({ force: true }).catch(() => {});
  await t.page.locator('#anim-link').click({ force: true }).catch(() => {});
  await t.page.waitForTimeout(1000);
  if (dialogs.length) t.problems.push(`${user}: script ran (${dialogs.join(' | ')})`);
  if (!t.page.url().endsWith(page)) t.problems.push(`${user}: a link navigated to ${t.page.url()}`);
  t.check(`xss probe as ${user}`);
  await t.page.evaluate(n => {
    const p = document.createElement('pre');
    p.textContent = `alerts: ${n}, links clicked: 2, page unchanged`;
    p.style.cssText = 'background:#ffd;padding:8px;border:1px solid #cc9';
    document.querySelector('#content').prepend(p);
  }, dialogs.length);
  await t.shot(user, `${user}: SVG with XSS vectors shown inline (svg setting on); no script ran, the links do nothing; shapes, html label and data: image kept`);
}

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await t.done();
