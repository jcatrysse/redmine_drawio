// Function: who may edit. manager (edit_wiki_pages) gets an editable diagram and
// the editor scripts; reporter (no edit_wiki_pages) and outsider see it read-only;
// a private project's diagram stays invisible to outsider; POST /drawio/api_key
// is refused without login, without the CSRF token, and when nobody may edit.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { reseed } from '../e2e_support/drawio.mjs';

reseed();
const t = await e2e('permissions');

async function editable() {
  return {
    title: await t.page.locator('img.drawioDiagram').first().getAttribute('title'),
    dbl: await t.page.locator('img.drawioDiagram').first().getAttribute('ondblclick'),
    settings: await t.page.evaluate(() => typeof window.Drawio !== 'undefined' && !!window.Drawio.settings),
  };
}

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_png');
let e = await editable();
if (!e.dbl || !e.settings) t.problems.push(`manager: not editable ${JSON.stringify(e)}`);
const key = await t.page.evaluate(async () => {
  const r = await fetch('/drawio/api_key', { method: 'POST', headers: { 'X-CSRF-Token': document.querySelector('meta[name=csrf-token]').content, Accept: 'application/json' } });
  return { status: r.status, cache: r.headers.get('cache-control'), len: ((await r.json()).key || '').length };
});
if (key.status !== 200 || key.len !== 40 || key.cache !== 'no-store') t.problems.push(`manager api key: ${JSON.stringify(key)}`);
const noCsrf = await t.page.evaluate(async () => (await fetch('/drawio/api_key', { method: 'POST', headers: { Accept: 'application/json' } })).status);
if (noCsrf !== 422) t.problems.push(`api key without CSRF token: HTTP ${noCsrf}`);
await t.page.evaluate(([k, c]) => {
  const p = document.createElement('pre'); p.id = 'e2e-probe';
  p.textContent = `POST /drawio/api_key with CSRF token: HTTP ${k.status}, Cache-Control ${k.cache}, key of ${k.len} chars\nPOST /drawio/api_key without CSRF token: HTTP ${c}`;
  p.style.cssText = 'background:#ffd;padding:8px;border:1px solid #cc9';
  document.querySelector('#content').prepend(p);
}, [key, noCsrf]);
t.check('api key probes', { requests: ['422 fetch /drawio/api_key'] });
await t.shot('manager', 'manager: editable diagram; the key comes only from POST /drawio/api_key (200 no-store with CSRF token, 422 without)');

await t.login('reporter');
await t.go('/projects/e2e-project/wiki/Drawio_png');
e = await editable();
if (e.dbl || e.title || e.settings) t.problems.push(`reporter: editable ${JSON.stringify(e)}`);
await t.shot('reporter-wiki', 'reporter (no edit_wiki_pages): diagram shown read-only, no editor scripts on the page');

await t.login('outsider');
await t.go('/projects/e2e-private/wiki/Drawio_private', { status: 403 });
await t.shot('outsider-private', 'outsider: the private project wiki page with a diagram is refused (403)');
await t.go('/projects/e2e-project/wiki/Drawio_png');
e = await editable();
if (e.dbl || e.settings) t.problems.push(`outsider: editable ${JSON.stringify(e)}`);
await t.shot('outsider-public', 'outsider on the public project: diagram read-only');

await t.anonymous();
await t.go('/projects/e2e-project/wiki/Drawio_png');
const anon = await t.page.request.post(`${t.BASE}/drawio/api_key`, { headers: { Accept: 'application/json' } });
if (anon.status() !== 403 && anon.status() !== 422) t.problems.push(`anonymous api key: HTTP ${anon.status()}`);
if ((await anon.text()).length > 0) t.problems.push('anonymous api key: body not empty');
await t.page.evaluate(s => {
  const p = document.createElement('pre'); p.textContent = `anonymous POST /drawio/api_key: HTTP ${s}, empty body`;
  p.style.cssText = 'background:#ffd;padding:8px;border:1px solid #cc9';
  document.querySelector('#content').prepend(p);
}, anon.status());
await t.shot('anonymous', 'anonymous: diagram read-only, the API key endpoint is refused');
await t.done();
