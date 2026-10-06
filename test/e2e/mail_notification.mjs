// Function: diagrams in notification mails. A note with {{drawio_attach(...)}}
// is mailed with the diagram inline (a data: png). Known, not a regression: the
// macro renders for the recipient, so a recipient who may edit gets the editor's
// ondblclick/title attributes in the mail too (inert in a mail client).
import { e2e } from '../../.codex/e2e/lib.mjs';
import { reseed } from '../e2e_support/drawio.mjs';

const seeded = reseed();
const id = seeded.match(/issue #(\d+)/)[1];
const t = await e2e('mail-notification');
const since = Date.now();
await t.login('manager');
await t.go(`/issues/${id}`);
await t.page.locator('a.icon-edit, a:has-text("Edit")').first().click();
await t.page.fill('#issue_notes', 'Mail check:\n\n{{drawio_attach(mail_flow)}}');
await t.page.locator('#issue-form input[name=commit]').first().click();
await t.settle();
await t.page.waitForTimeout(2000);
const mails = t.mails(since).filter(m => m.body.includes('Mail check'));
if (!mails.length) t.problems.push('no notification mail for the note');
// delivery_method :file appends every mail for a recipient to one file: keep the
// part from the last "Mail check" on, which is the html part of this mail
const m = mails[0];
const all = m ? m.body.replace(/=\r?\n/g, '').replace(/=3D/g, '=') : '';
const html = all.slice(all.lastIndexOf('Mail check'));
if (m && !/<img[^>]*Diagram mail_flow\.png[^>]*drawioDiagram/.test(html)) t.problems.push('mail has no mail_flow diagram');
await t.page.setContent(`<pre style="white-space:pre-wrap;font:12px monospace">Mail to ${m ? m.to : '-'}\n` +
  `contains drawioDiagram: ${/drawioDiagram/.test(html)}\ncontains data:image/png: ${/data:image\/png/.test(html)}\n` +
  `contains editDiagram/ondblclick: ${/editDiagram|ondblclick/.test(html)}\n\n` +
  `${(html.match(/<img[^>]*Diagram mail_flow\.png[^>]*>/) || ['(no diagram img)'])[0].replace(/base64,[A-Za-z0-9+/=]{60,}/, 'base64,...').replace(/</g, '&lt;')}</pre>`);
await t.shot('mail', 'Notification mail for the note: the diagram is inline as a data: png (editor attributes present for a recipient who may edit, inert in mail)');
await t.done();
