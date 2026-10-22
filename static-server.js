/**
 * static-server.js — tiny dependency-free static server with SPA fallback.
 *
 * Worth The Trip local test server.
 * - Serves files under the current directory (the WTT site).
 * - Falls back to index.html for any non-file route (so /guide?session_id=... works).
 * - Correct content-types for .js, .css, .svg, .png, etc.
 *
 * Run: node static-server.js          (port 8080)
 * Or:  NODE_PORT=3000 node static-server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.NODE_PORT || 8080;
const ROOT = __dirname;

// MIME types for common static assets
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  'default': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  // Root path -> index.html
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.join(ROOT, path.normalize(urlPath));
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback: serve index.html for routes that are not real files.
      const indexPath = path.join(ROOT, 'index.html');
      fs.readFile(indexPath, (err2, data) => {
        if (err2) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 — static-server.js could not find index.html');
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME['.html'] || 'text/html',
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      });
      return;
    }

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 — not found: ' + urlPath);
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[ext] || MIME['default'],
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\u2713 static-server listening on http://localhost:${PORT}`);
  console.log(`   SPA fallback enabled: /guide?session_id=... loads index.html`);
});
