// Shared helpers for the redmine_drawio scenarios in test/e2e/. Not a scenario
// itself (e2e.sh runs only test/e2e/*.mjs).
//
// startStub() serves a stand-in for embed.diagrams.net on 127.0.0.1:3100 that
// speaks the embed protocol, so editing and saving run without the external
// service. Its "Save" button returns a red png / svg / xml diagram.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STUB_PORT = Number(process.env.RMP_DRAWIO_STUB_PORT || 3100);
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;

// zlib.crc32 exists from Node 20.15 / 22.2; older Node gets this table-less one.
const crc32 = zlib.crc32 || (buf => {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
});

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

// A plain RGB png of w x h pixels, one colour.
export function png(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export function startStub() {
  const exportPng = png(240, 80, [220, 60, 60]);
  // The XML viewer (viewer-static.min.js) is loaded from the service URL; serve
  // a copy when one was downloaded to redmine/tmp, else XML diagrams stay empty.
  const viewer = path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'viewer-static.min.js');
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, STUB_URL);
    requests.push(url.pathname);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(path.join(HERE, 'drawio_stub', 'index.html')));
    } else if (url.pathname === '/export.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(exportPng);
    } else if (url.pathname === '/js/viewer-static.min.js' && fs.existsSync(viewer)) {
      res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(fs.readFileSync(viewer));
    } else if (url.pathname === '/images/ajax-loader.gif') {
      res.writeHead(200, { 'Content-Type': 'image/gif' }); res.end(GIF);
    } else {
      res.writeHead(404); res.end();
    }
  });
  return new Promise(resolve => server.listen(STUB_PORT, '127.0.0.1', () => resolve({
    requests,
    close: () => new Promise(r => server.close(r)),
  })));
}

// Sets the plugin settings through the admin page (as admin, sudo when asked).
export async function setDrawioSettings(t, { url, svg }) {
  await t.login('admin');
  await t.go('/settings/plugin/redmine_drawio');
  await t.sudo();
  await t.page.fill('input[name="settings[drawio_service_url]"]', url);
  const box = t.page.locator('input[name="settings[drawio_svg_enabled]"]');
  if ((await box.isChecked()) !== !!svg) await box.click();
  await t.page.click('#settings input[type=submit], form input[type=submit][name=commit]');
  await t.settle();
  await t.sudo();
  t.check('save drawio settings');
}

// Sets Redmine's REST API setting through Administration > Settings > Integrations
// (the API tab before Redmine 7).
export async function setRestApi(t, enabled) {
  await t.login('admin');
  await t.go('/settings?tab=integrations');
  await t.sudo();
  const box = t.page.locator('#settings_rest_api_enabled');
  if ((await box.isChecked()) !== enabled) await box.click();
  await box.locator('xpath=ancestor::form').locator('input[type=submit]').click();
  await t.settle();
  await t.sudo();
  t.check('save rest api setting');
}

// Resets the drawio pages and issue (test/e2e/seed.rb) so a save scenario can
// run again on the same server. Runs like start_server.sh does (.codex/e2e/env.sh
// picks the Redmine checkout and its Ruby).
export function reseed() {
  const root = path.resolve(HERE, '..', '..');
  const seed = path.join(root, 'test', 'e2e', 'seed.rb');
  const out = execSync(`. .codex/e2e/env.sh && RAILS_ENV="$RMP_SERVER_ENV" run bundle exec rails runner '${seed}'`,
    { cwd: root, shell: '/bin/bash', env: process.env }).toString().trim();
  return out.split('\n').pop();
}

// Opens the editor on a diagram (double click) and waits until the stub has the
// diagram loaded; returns the stub's frame.
export async function openEditor(t, locator, kind) {
  await locator.dblclick();
  const frame = t.page.frameLocator('iframe.drawioEditor');
  await frame.locator('#status').filter({ hasText: `loaded ${kind}` }).waitFor({ timeout: 15000 });
  return frame;
}

// Clicks Save in the stub and waits for the PUT that rewrites the page or issue.
export async function saveInEditor(t, frame, putPattern) {
  const put = t.page.waitForResponse(r => putPattern.test(r.url()) && r.request().method() === 'PUT', { timeout: 20000 });
  await frame.locator('#save').click();
  const res = await put;
  await t.page.waitForTimeout(1500);
  return res.status();
}
