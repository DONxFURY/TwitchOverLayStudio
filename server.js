/* ==========================================================================
   Twitch Overlay Studio — server.js
   Zero-dependency static file server used by start.bat.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

let port = Number(process.env.PORT);
if (!port || !isFinite(port)) port = 8787;

function handler(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — not found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function start() {
  const server = http.createServer(handler);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < 8800) {
      port += 1;
      start();
    } else {
      console.error('\n  Could not start the server:', err.message);
      console.error('  Close the other process on port ' + port + ' and try again.\n');
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/`;
    console.log('');
    console.log('  ┌──────────────────────────────────────────┐');
    console.log('  │   Twitch Overlay Studio                  │');
    console.log('  │   ' + url.padEnd(38) + '│');
    console.log('  │   Ctrl+C in this window to stop          │');
    console.log('  └──────────────────────────────────────────┘');
    console.log('');
    if (process.env.NO_OPEN !== '1') openBrowser(url);
  });
}

start();
