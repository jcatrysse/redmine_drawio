// Function: the per-user "Drawio UI" preference on My account, passed to the
// editor as ui=<theme>.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, openEditor, STUB_URL } from '../e2e_support/drawio.mjs';

reseed();
const stub = await startStub();
const t = await e2e('my-account-ui');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go('/my/account');
const select = t.page.locator('#pref_drawio_ui');
if ((await select.inputValue()) !== 'kennedy') t.problems.push('default is not kennedy');
await select.selectOption('atlas');
await t.shot('preference', 'My account > Preferences: Drawio UI select (Default, Atlas, Simple, Minimal, Sketch), Atlas chosen');
await t.page.locator('#my_account_form input[type=submit], input[name=commit]').first().click();
await t.settle();
await t.sudo();
await t.go('/my/account');
if ((await select.inputValue()) !== 'atlas') t.problems.push('atlas not saved');
await t.go('/projects/e2e-project/wiki/Drawio_png');
const frame = await openEditor(t, t.page.locator('img.drawioDiagram'), 'png');
if (!(await frame.locator('#params').innerText()).includes('ui=atlas')) t.problems.push('editor not opened with ui=atlas');
await t.shot('editor-atlas', 'The editor is opened with ui=atlas');
await frame.locator('#exit').click();

await t.go('/my/account');
await select.selectOption('kennedy');
await t.page.locator('#my_account_form input[type=submit], input[name=commit]').first().click();
await t.settle();
await t.sudo();
await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
