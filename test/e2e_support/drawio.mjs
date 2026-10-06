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
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STUB_PORT = Number(process.env.RMP_DRAWIO_STUB_PORT || 3100);
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
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

// Sets Redmine's REST API setting through Administration > Settings > API.
export async function setRestApi(t, enabled) {
  await t.login('admin');
  await t.go('/settings?tab=api');
  await t.sudo();
  const box = t.page.locator('#settings_rest_api_enabled');
  if ((await box.isChecked()) !== enabled) await box.click();
  await t.page.locator('#tab-content-api input[type=submit]').click();
  await t.settle();
  await t.sudo();
  t.check('save rest api setting');
}
