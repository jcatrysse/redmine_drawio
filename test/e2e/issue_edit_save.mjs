// Function: edit and save diagrams on an issue, in the description and in a note.
// Saving the description diagram rewrites the description and attaches
// issue_flow_1.png; saving the note diagram adds a new note that references
// note_flow_1.png (the plugin cannot change the old note).
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startStub, setDrawioSettings, reseed, openEditor, saveInEditor, STUB_URL } from '../e2e_support/drawio.mjs';

const seeded = reseed();
const id = seeded.match(/issue #(\d+)/)[1];
const stub = await startStub();
const t = await e2e('issue-edit-save');
await setDrawioSettings(t, { url: STUB_URL, svg: false });

await t.login('manager');
await t.go(`/issues/${id}`);
await t.shot('before', 'Issue with a diagram in the description and one in a note (default images, editable)');
let frame = await openEditor(t, t.page.locator('.description img.drawioDiagram'), 'png');
let status = await saveInEditor(t, frame, new RegExp(`/issues/${id}\\.json`));
if (status !== 204 && status !== 200) t.problems.push(`description save: HTTP ${status}`);
await t.go(`/issues/${id}`);
await t.shot('description-saved', 'After saving the description diagram: red diagram, issue_flow_1.png attached, history entry');

frame = await openEditor(t, t.page.locator('#history img.drawioDiagram').first(), 'png');
status = await saveInEditor(t, frame, new RegExp(`/issues/${id}\\.json`));
if (status !== 204 && status !== 200) t.problems.push(`note save: HTTP ${status}`);
await t.go(`/issues/${id}`);
const page = await t.page.content();
if (!/issue_flow_1\.png/.test(page) || !/note_flow_1\.png/.test(page)) t.problems.push('attachments issue_flow_1.png / note_flow_1.png missing');
await t.shot('note-saved', 'After saving the note diagram: a new note references note_flow_1.png, both attachments listed');

await t.login('reporter');
await t.go(`/issues/${id}`);
const dbl = await t.page.locator('.description img.drawioDiagram').getAttribute('ondblclick');
if (!dbl) t.problems.push('reporter: issue diagram not editable although add_issue_notes makes the issue editable');
await t.shot('reporter', 'reporter (add_issue_notes only): Issue#editable? is true, so the issue diagrams are editable for him too');

await setDrawioSettings(t, { url: '//embed.diagrams.net', svg: false });
await stub.close();
await t.done();
