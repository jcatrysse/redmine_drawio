// Function: the jsToolBar button "drawio_attach" opens the macro dialog, which
// inserts {{drawio_attach(...)}} with the chosen type and options, and edits an
// existing macro when the caret is inside it. SVG is offered only when enabled.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { setDrawioSettings, reseed } from '../e2e_support/drawio.mjs';

reseed();
const t = await e2e('toolbar-macro-dialog');
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });

await t.login('manager');
await t.go('/projects/e2e-project/wiki/Drawio_new/edit');
const button = t.page.locator('.jstElements button.jstb_drawio_attach, .jstElements .jstb_drawio_attach').first();
if (!(await button.count())) t.problems.push('toolbar button jstb_drawio_attach missing');
await t.shot('toolbar', 'Wiki editor toolbar with the drawio button (last icon)', { full: false });
await t.page.fill('#content_text', 'Intro\n\n');
await t.page.locator('#content_text').evaluate(e => { e.focus(); e.setSelectionRange(e.value.length, e.value.length); });
await button.click();
const dlg = t.page.locator('#dlg_redmine_drawio');
await dlg.waitFor({ state: 'visible' });
if (await dlg.locator('input[value=svg]').count()) t.problems.push('svg offered while disabled');
await dlg.locator('#drawio__P1').fill('architecture');
await dlg.locator('#drawio_diagTypeXml').check();
await dlg.locator('#drawio_size').fill('300');
await dlg.locator('#drawio_zoom').check();
await t.shot('dialog-xml', 'Macro dialog: name, type XML (xml options shown), size 300, zoom on; no SVG choice while svg is disabled', { full: false });
await t.page.locator('.ui-dialog-buttonpane button').first().click();
let text = await t.page.inputValue('#content_text');
if (!/\{\{drawio_attach\(architecture\.xml[^)]*size=300[^)]*\)\}\}/.test(text) || !/zoom=true/.test(text)) t.problems.push(`inserted macro: ${text}`);
await t.shot('inserted', `Inserted: ${text.trim().split('\n').pop()}`, { full: false });

// caret inside the macro: the dialog edits it
await t.page.locator('#content_text').evaluate(e => { const i = e.value.indexOf('architecture') + 3; e.focus(); e.setSelectionRange(i, i); });
await button.click();
await dlg.waitFor({ state: 'visible' });
const name = await dlg.locator('#drawio__P1').inputValue();
if (name !== 'architecture.xml') t.problems.push(`edit: name prefilled as "${name}"`);
await dlg.locator('#drawio_size').fill('250');
await t.shot('dialog-edit', 'Caret inside the macro: the dialog opens with its values, size changed to 250', { full: false });
await t.page.locator('.ui-dialog-buttonpane button').first().click();
text = await t.page.inputValue('#content_text');
if ((text.match(/drawio_attach/g) || []).length !== 1 || !/size=250/.test(text)) t.problems.push(`edited macro: ${text}`);
await t.shot('edited', `Edited in place: ${text.trim().split('\n').pop()}`, { full: false });

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: true });
await t.login('manager');
await t.go('/projects/e2e-project/issues/new');
await t.page.locator('#issue_description').evaluate(e => e.focus());
await t.page.locator('.jstb_drawio_attach').first().click();
const dlg2 = t.page.locator('#dlg_redmine_drawio');
await dlg2.waitFor({ state: 'visible' });
if (!(await dlg2.locator('input[value=svg]').count())) t.problems.push('svg not offered while enabled');
await t.shot('dialog-svg-issue', 'New issue form: the same button; with svg enabled the dialog offers SVG', { full: false });
await t.page.locator('.ui-dialog-titlebar-close').first().click();

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await t.done();
