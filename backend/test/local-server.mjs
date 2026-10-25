// Dev helper: serves the Worker API (on an in-memory SQLite database) AND the web app on one port.
// Used by the end-to-end sync test. Not part of the deployment.
//   node test/local-server.mjs [port] [path-to-index.html]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import worker from '../src/index.js';
import { createTestDb } from './d1-adapter.mjs';

const port = Number(process.argv[2] || 8799);
const htmlPath = process.argv[3];
const db = createTestDb();
// local testing only: fixed pepper, founder key "local-founder-key"
const env = { DB: db, ALLOWED_ORIGINS: '', PASSWORD_PEPPER: 'local-pepper-0123456789', FOUNDER_KEY_SHA256: createHash('sha256').update('local-founder-key').digest('hex') };
const code = 'kb_' + randomBytes(24).toString('base64url');
db.sqlite.prepare('INSERT INTO users (name, token_hash, created_at) VALUES (?,?,?)').run('Test', createHash('sha256').update(code).digest('hex'), Date.now());

http.createServer(async (req, res) => {
  if (req.url.startsWith('/v1/') || req.method === 'OPTIONS') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await worker.fetch(new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } else if (req.url.startsWith('/mkuser')) {
    const n = new URL(req.url, 'http://x').searchParams.get('n') || 'Test';
    const ip = '10.0.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
    const r = await worker.fetch(new Request('http://localhost/v1/register', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ name: n }) }), env);
    const j = await r.json();
    res.end(JSON.stringify({ ...j, code: j.code || j.id || j.kobel_id || j.token }));
  } else if (req.url === '/code') {
    res.end(code);
  } else if (htmlPath) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(htmlPath));
  } else {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log('listening on', port));
