/**
 * Worth The Trip — full app server
 * Serves the WTT site, the Stripe webhook, and the /api for accounts, analytics,
 * and admin (users/creators).
 *
 *   site:   http://localhost:8080
 *   API:    http://localhost:8080/api/*   (auth, users, purchases, creators)
 *   webhook: http://localhost:8080/webhooks/stripe
 *   admin:  http://localhost:8080/admin
 *   account: http://localhost:8080/account
 *
 * Run:  node server.js       (PORT defaults to 8080)
 * Env:  PORT, ADMIN_PASSWORD, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, .env file
 *
 * Deployed on SiteGround's managed Node.js project, which runs this file from
 *   .nodeapp/<id>/app_source and fronts it with a reverse proxy.
 *
 * NOTE — Stripe webhook registration must point at
 *   http://localhost:8080/webhooks/stripe   (not :3000)
 */
'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = __dirname;
const PUBLIC_DIR = path.join(DATA_DIR, 'public');
const AVATAR_DIR = path.join(PUBLIC_DIR, 'avatars');

// ------------------------------------------------------------------ env
function loadEnv() {
  try {
    const lines = fs.readFileSync(path.join(DATA_DIR, '.env'), 'utf8');
    for (const line of lines.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (e) { /* no .env present */ }
}
loadEnv();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1Deathknight90';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '__STRIPE_NO_KEY__';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '__STRIPE_WEBHOOK_NO_KEY__';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---- Creator guides ----
const PRICE_MIN = 100;   // ¥ — creator guide price floor
const PRICE_MAX = 2000;  // ¥ — creator guide price ceiling (enforced server-side)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CATEGORIES = ['culture', 'food', 'nature', 'hiking', 'luxury'];
const TRAVEL_MODES = ['walk', 'train', 'bus', 'taxi', 'car', 'ferry', 'bike'];
const VIDEO_PLATFORMS = ['youtube', 'instagram', 'tiktok', 'twitch', 'other'];

const AUTH_FILE = path.join(DATA_DIR, 'auth.jsonl');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.jsonl');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.jsonl');
const CREATORS_FILE = path.join(DATA_DIR, 'creators.json');
const GUIDES_FILE = path.join(DATA_DIR, 'src', 'js', 'data', 'guides.js');

const vm = require('vm');
const STRIPE = require('stripe')(STRIPE_SECRET_KEY);

// ------------------------------------------------------------------ data
function loadLines(file) {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim().length); } catch { return []; }
}
function writeLines(file, arr) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, arr.map(JSON.stringify).join('\n') + '\n');
  fs.renameSync(tmp, file);
}
function loadArray(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeArray(file, arr) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2));
  fs.renameSync(tmp, file);
}
function ensureDataFiles() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  if (!fs.existsSync(GUIDES_FILE)) fs.writeFileSync(GUIDES_FILE, 'const WTT_GUIDES = [];');
  if (!fs.existsSync(CREATORS_FILE)) fs.writeFileSync(CREATORS_FILE, '[]');
}
ensureDataFiles();

// ------------------------------------------------------------------ crypto
function hashPassword(p) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(p, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(p, stored) {
  const [salt, hash] = stored.split(':');
  const a = crypto.scryptSync(p, salt, 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function genToken() { return crypto.randomBytes(32).toString('hex'); }
function genId() { return crypto.randomUUID(); }

// ------------------------------------------------------------------ data access
function readUsers() {
  return loadLines(AUTH_FILE).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function readSessions() {
  return loadLines(SESSIONS_FILE).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function readPurchases() {
  return loadLines(PURCHASES_FILE).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function readCreators() { return loadArray(CREATORS_FILE); }
function readGuides() {
  const src = fs.readFileSync(GUIDES_FILE, 'utf8');
  const arr = JSON.parse(src.replace(/^const WTT_GUIDES = /, '').replace(/;\s*$/, ''));
  return arr.map(canonicalizeGuide);
}
function canonicalizeGuide(g) {
  const ja = g.ja || {};
  const video = g.youtubeRef ? { platform: 'youtube', url: g.youtubeRef.url, handle: g.youtubeRef.handle } : {};
  return {
    id: g.id, creatorId: g.creatorId, status: 'published', title: g.title,
    tagline: g.tagline, city: g.city, prefecture: g.prefecture, category: g.category,
    duration: g.duration, price: g.price, priceTier: g.priceTier, stay: g.stay,
    season: g.season || ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
    coordinates: g.coordinates, zoomLevel: g.zoomLevel, heroImage: g.heroImage,
    video: video, includes: g.includes, timeline: g.timeline, ja: ja,
    jaSourceHash: g.jaSourceHash || hashJa(ja),
    createdAt: g.createdAt || new Date().toISOString(),
    updatedAt: g.updatedAt || new Date().toISOString(),
    submittedAt: g.submittedAt || new Date().toISOString(),
    publishedAt: g.publishedAt || new Date().toISOString(),
    reviewedAt: g.reviewedAt || new Date().toISOString(),
    reviewNote: null, location: g.location
  };
}
function hashJa(ja) {
  const s = JSON.stringify(ja).toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
function writeGuides(arr) { fs.writeFileSync(GUIDES_FILE, 'const WTT_GUIDES = ' + JSON.stringify(arr, null, 2) + ';'); }
function findGuide(id) { return readGuides().find((g) => g.id === id); }
function findCreatorRecord(email) {
  const e = String(email || '').toLowerCase();
  return readCreators().find((c) => String(c.email || '').toLowerCase() === e);
}
function isApprovedCreator(email) {
  const rec = findCreatorRecord(email);
  return !!(rec && rec.status === 'accepted');
}
function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 48) || 'guide';
}
function clip(v, max) { return String(v == null ? '' : v).slice(0, max); }
function clampPrice(p) {
  const n = Math.round(Number(p));
  if (!Number.isFinite(n)) return null;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
}
function isLatLng(v) {
  return Array.isArray(v) && v.length === 2 &&
    Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1])) &&
    Math.abs(Number(v[0])) <= 90 && Math.abs(Number(v[1])) <= 180;
}
function findUser(email) { return readUsers().find((u) => u.email === email); }
function findUserById(id) { return readUsers().find((u) => u.id === id); }
function getSession(token) { return readSessions().find((s) => s.token === token); }

// ------------------------------------------------------------------ cookies
const COOKIE = 'wtt_session';
function readCookie(req) {
  const m = req.headers.cookie && req.headers.cookie.match(/(?:^|;)\s*wtt_session=([^;]*)/);
  return m ? m[1] : '';
}
function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', [`wtt_session=${token}; HttpOnly; Path=/; SameSite=lax; Max-Age=${SESSION_TTL_MS / 1000}`]);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [`wtt_session=; HttpOnly; Path=/; SameSite=lax; Max-Age=0`]);
}

// ------------------------------------------------------------------ middleware
const DATA_NAMES = new Set([
  'auth.jsonl', 'sessions.jsonl', 'purchases.jsonl', 'creators.json', 'guides.jsonl',
  'auth.jsonl.tmp', 'sessions.jsonl.tmp', 'purchases.jsonl.tmp', 'creators.json.tmp', 'guides.jsonl.tmp',
]);
app.use((req, res, next) => {
  const n = path.basename(req.path);
  if (DATA_NAMES.has(n)) return res.status(404).end();
  next();
});

// Parse incoming request bodies (JSON) for all routes. The verify hook captures
// the raw buffer so the Stripe webhook can verify its signature.
const captureRaw = (req, res, buf) => { req.rawBody = buf; };
const jsonSmall = express.json({ limit: '1mb', verify: captureRaw });
const jsonLarge = express.json({ limit: '15mb', verify: captureRaw });
app.use((req, res, next) => {
  // Image uploads carry base64 payloads; every other route stays on a tight limit.
  const parser = req.path === '/api/creator/images' ? jsonLarge : jsonSmall;
  return parser(req, res, next);
});

// Stripe webhook
app.post('/webhooks/stripe', (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = STRIPE.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send('Webhook Error: ' + err.message);
    }
    if (event.type !== 'checkout.session.completed') {
      return res.json({ received: true, ignored: event.type });
    }
    const session = event.data.object;
    const buyerEmail = session.customer_details && session.customer_details.email;
    const stripeCustomerId = (session.customer && session.customer.id) || null;
    const guideId = session.metadata && session.metadata.guideId;
    const guideTitle = session.metadata && session.metadata.guideTitle;
    let amount = session.amount_total || null;
    let currency = session.currency || 'jpy';
    if (session.line_items && session.line_items.data && session.line_items.data.length) {
      const li = session.line_items.data[0];
      if (amount == null) amount = li.price && li.price.unit_amount;
      if (guideTitle == null && li.price && li.price.product) {
        try {
          const prod = STRIPE.products.retrieve(li.price.product);
          guideTitle = prod.name;
        } catch (e) { /* keep metadata if present, else null */ }
      }
    }
    const record = {
      id: session.id,
      sessionId: session.id,
      type: session.mode === 'subscription' ? 'subscription' : 'payment',
      guideId: guideId,
      guideTitle: guideTitle,
      buyerEmail: buyerEmail,
      stripeCustomerId: stripeCustomerId,
      amount: amount,
      currency: currency,
      purchasedAt: (session.created || Date.now()),
    };
    const purchases = readPurchases();
    purchases.push(record);
    writeLines(PURCHASES_FILE, purchases);
    console.log('Recorded purchase:', record.id, '| guide=', record.guideId, '| email=', record.buyerEmail, '| amount=', record.amount, '| stripeCustomerId=', record.stripeCustomerId);
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---- API routes ----

// Signup
app.post('/api/users', (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return jsonError(res, 400, 'Email and password are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(res, 400, 'Please enter a valid email');
    if (password.length < 6) return jsonError(res, 400, 'Password must be at least 6 characters');
    if (findUser(email)) return jsonError(res, 409, 'An account with this email already exists');
    const user = {
      id: genId(), email: email.toLowerCase().trim(), name: (name || email.split('@')[0]).trim(),
      passwordHash: hashPassword(password), phone: '', address: '', avatar: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const users = readUsers();
    users.push(user);
    writeLines(AUTH_FILE, users);
    const token = genToken();
    const session = { token, userId: user.id, kind: 'user', expiresAt: Date.now() + SESSION_TTL_MS };
    const sessions = readSessions();
    sessions.push(session);
    writeLines(SESSIONS_FILE, sessions);
    res.setHeader('Set-Cookie', [`wtt_session=${token}; HttpOnly; Path=/; SameSite=lax; Max-Age=${SESSION_TTL_MS / 1000}`]);
    res.status(201).json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { jsonError(res, 500, e.message); }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = findUser(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return jsonError(res, 401, 'Email or password is incorrect');
    }
    const token = genToken();
    const session = { token, userId: user.id, kind: 'user', expiresAt: Date.now() + SESSION_TTL_MS };
    const sessions = readSessions();
    sessions.push(session);
    writeLines(SESSIONS_FILE, sessions);
    res.setHeader('Set-Cookie', [`wtt_session=${token}; HttpOnly; Path=/; SameSite=lax; Max-Age=${SESSION_TTL_MS / 1000}`]);
    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { jsonError(res, 500, e.message); }
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = readCookie(req);
  if (token) {
    const sessions = readSessions().filter((s) => s.token !== token);
    writeLines(SESSIONS_FILE, sessions);
  }
  res.setHeader('Set-Cookie', [`wtt_session=; HttpOnly; Path=/; SameSite=lax; Max-Age=0`]);
  res.json({ ok: true });
});

// Me (current logged-in user)
function requireUser(req, res, next) {
  const token = readCookie(req);
  const s = token ? getSession(token) : null;
  if (!s || s.kind !== 'user') return jsonError(res, 401, 'Not logged in');
  req.user = findUserById(s.userId);
  if (!req.user) return jsonError(res, 401, 'User no longer exists');
  next();
}
function jsonError(res, status, msg) { res.status(status).json({ error: msg }); }

app.get('/api/me', requireUser, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar, createdAt: u.createdAt, updatedAt: u.updatedAt });
});

app.patch('/api/me', requireUser, (req, res) => {
  try {
    const u = req.user;
    const body = req.body || {};
    if (body.name !== undefined) { if (!body.name.trim()) return jsonError(res, 400, 'Name is required'); u.name = body.name.trim(); }
    if (body.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return jsonError(res, 400, 'Invalid email');
      const other = findUser(body.email);
      if (other && other.id !== u.id) return jsonError(res, 409, 'An account with this email already exists');
      u.email = body.email.trim().toLowerCase();
    }
    if (body.phone !== undefined) u.phone = body.phone.trim();
    if (body.address !== undefined) u.address = body.address.trim();
    if (body.password && body.oldPassword) {
      if (!verifyPassword(body.oldPassword, u.passwordHash)) return jsonError(res, 401, 'Current password is incorrect');
      u.passwordHash = hashPassword(body.password);
    }
    if (body.avatarDataUrl) {
      const mime = saveAvatar(u.id, body.avatarDataUrl);
      if (mime) {
        u.avatar = '/avatars/' + u.id + '.' + mime;
      } else {
        return jsonError(res, 500, 'Could not save avatar');
      }
    }
    u.updatedAt = new Date().toISOString();
    const users = readUsers();
    const i = users.findIndex((x) => x.id === u.id);
    if (i >= 0) users[i] = u;
    writeLines(AUTH_FILE, users);
    res.json({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar, updatedAt: u.updatedAt });
  } catch (e) { jsonError(res, 500, e.message); }
});

// ---- Admin: users ----
function requireAdmin(req, res, next) {
  const token = readCookie(req);
  const s = token ? getSession(token) : null;
  if (!s || s.kind !== 'admin') return jsonError(res, 403, 'Admin access only');
  req.session = s;
  next();
}

app.get('/api/users', requireAdmin, (req, res) => {
  const users = readUsers();
  const purchases = readPurchases();
  const list = users.map((u) => ({
    id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar,
    createdAt: u.createdAt, purchaseCount: purchases.filter((p) => p.buyerEmail === u.email).length,
  }));
  res.json({ users: list, total: list.length });
});

app.get('/api/users/:id', requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return jsonError(res, 404, 'User not found');
  const purchases = readPurchases().filter((p) => p.buyerEmail === u.email).sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  res.json({ user: { id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar, createdAt: u.createdAt }, purchases });
});

app.patch('/api/users/:id', requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return jsonError(res, 404, 'User not found');
  const body = req.body || {};
  if (body.name !== undefined) { if (!body.name.trim()) return jsonError(res, 400, 'Name is required'); u.name = body.name.trim(); }
  if (body.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return jsonError(res, 400, 'Invalid email');
    const other = findUser(body.email);
    if (other && other.id !== u.id) return jsonError(res, 409, 'An account with this email already exists');
    u.email = body.email.trim().toLowerCase();
  }
  if (body.phone !== undefined) u.phone = body.phone.trim();
  if (body.address !== undefined) u.address = body.address.trim();
  if (body.password && body.oldPassword) {
    if (!verifyPassword(body.oldPassword, u.passwordHash)) return jsonError(res, 401, 'Current password is incorrect');
    u.passwordHash = hashPassword(body.password);
  }
  if (body.avatarDataUrl) {
    const mime = saveAvatar(u.id, body.avatarDataUrl);
    if (mime) {
      u.avatar = '/avatars/' + u.id + '.' + mime;
    } else {
      return jsonError(res, 500, 'Could not save avatar');
    }
  }
  u.updatedAt = new Date().toISOString();
  const users = readUsers();
  const i = users.findIndex((x) => x.id === u.id);
  if (i >= 0) users[i] = u;
  writeLines(AUTH_FILE, users);
  res.json({ ok: true, avatar: u.avatar });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return jsonError(res, 404, 'User not found');
  const sessions = readSessions().filter((s) => !(s.userId === u.id && s.kind === 'user'));
  writeLines(SESSIONS_FILE, sessions);
  const purchases = readPurchases().filter((p) => p.buyerEmail !== u.email);
  writeLines(PURCHASES_FILE, purchases);
  try { fs.unlinkSync(path.join(AVATAR_DIR, u.id + '.png')); } catch (e) {}
  const users = readUsers().filter((x) => x.id !== u.id);
  writeLines(AUTH_FILE, users);
  res.json({ ok: true });
});

// ---- Customer: own purchases ----
app.get('/api/purchases/my', requireUser, (req, res) => {
  const email = req.user.email;
  const since = req.query.since;
  const list = readPurchases().filter((p) => p.buyerEmail === email)
    .sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  if (since) list = list.filter((p) => (p.purchasedAt || 0) >= Date.parse(since));
  res.json({ purchases: list, total: list.length });
});

// ---- Admin: purchases ----
app.get('/api/purchases', requireAdmin, (req, res) => {
  let list = readPurchases();
  const email = (req.query.email || '').trim().toLowerCase();
  const guideId = (req.query.guideId || '').trim();
  const since = req.query.since;
  if (email) list = list.filter((p) => (p.buyerEmail || '').toLowerCase().includes(email));
  if (guideId) list = list.filter((p) => p.guideId === guideId);
  if (since) list = list.filter((p) => (p.purchasedAt || 0) >= Date.parse(since));
  list.sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  res.json({ purchases: list, total: list.length });
});

// ---- Admin: creators ----
app.get('/api/creators', requireAdmin, (req, res) => {
  const creators = readCreators().map((c) => ({
    id: c.id, name: c.name, handle: c.handle, area: c.area, email: c.email,
    youtube: c.youtubeUrl, instagram: c.instagramUrl, status: c.status,
    appliedAt: c.appliedAt, guidesCount: Array.isArray(c.guides) ? c.guides.length : 0,
  }));
  res.json({ creators, total: creators.length });
});

app.patch('/api/creators/:id', requireAdmin, (req, res) => {
  const creators = readCreators();
  const c = creators.find((x) => x.id === req.params.id);
  if (!c) return jsonError(res, 404, 'Creator not found');
  const body = req.body || {};
  if (body.status === 'pending' || body.status === 'accepted' || body.status === 'rejected') c.status = body.status;
  const idx = creators.findIndex((x) => x.id === c.id);
  if (idx >= 0) creators[idx] = c;
  writeArray(CREATORS_FILE, creators);
  res.json({ ok: true, status: c.status });
});

// ---- Admin: login ----
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return jsonError(res, 401, 'Incorrect admin password');
  const token = genToken();
  const session = { token, userId: null, kind: 'admin', expiresAt: Date.now() + SESSION_TTL_MS };
  const sessions = readSessions();
  sessions.push(session);
  writeLines(SESSIONS_FILE, sessions);
  res.setHeader('Set-Cookie', [`wtt_session=${token}; HttpOnly; Path=/; SameSite=lax; Max-Age=${SESSION_TTL_MS / 1000}`]);
  res.json({ ok: true, token });
});

app.post('/api/admin/logout', (req, res) => {
  const token = readCookie(req);
  if (token) {
    const sessions = readSessions().filter((s) => s.token !== token);
    writeLines(SESSIONS_FILE, sessions);
  }
  res.setHeader('Set-Cookie', [`wtt_session=; HttpOnly; Path=/; SameSite=lax; Max-Age=0`]);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, users: readUsers().length, purchases: readPurchases().length, creators: readCreators().length });
});

// ------------------------------------------------------------------ helpers
function saveAvatar(userId, dataUrl) {
  try {
    const [header] = dataUrl.split(',');
    if (!header) return false;
    const ext = (header.match(/data:(.*?);/)||[])[1] || 'image/png';
    const mime = ext === 'image/jpeg' ? 'jpeg' : 'png';
    fs.writeFileSync(path.join(AVATAR_DIR, userId + '.' + mime), Buffer.from(dataUrl.split(',')[1], 'base64'));
    return mime;
  } catch (e) { return false; }
}

// ---- Creator: what still needs doing before this guide can be published ----
function guideProblems(g) {
  const p = [];
  if (!clip(g.title, 999).trim()) p.push('Title');
  if (!clip(g.tagline, 999).trim()) p.push('Tagline');
  if (!clip(g.city, 999).trim()) p.push('City');
  if (!CATEGORIES.includes(g.category)) p.push('Category');
  if (!clip(g.duration, 999).trim()) p.push('Duration');
  if (!(Number(g.price) >= PRICE_MIN && Number(g.price) <= PRICE_MAX)) p.push('Price (¥' + PRICE_MIN + '–¥' + PRICE_MAX + ')');
  if (!g.heroImage) p.push('Cover image');
  if (!isLatLng(g.coordinates)) p.push('Explore map pin');
  if (!g.video || !clip(g.video.url, 999).trim()) p.push('Source video link');
  const stops = (g.timeline || []).filter((t) => t && clip(t.title, 999).trim() && isLatLng(t.mapPin));
  if (!stops.length) p.push('At least one location with a pin');
  return p;
}

// ---- Creator: save a base64 image to public/Guide Images/<guideId>/ ----
function saveGuideImage(guideId, dataUrl) {
  const m = /^data:(image\/(png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  let mime = m[2].toLowerCase();
  if (mime === 'jpg') mime = 'jpeg';
  const ext = mime === 'png' ? 'png' : (mime === 'webp' ? 'webp' : 'jpg');
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > MAX_IMAGE_BYTES) return { error: 'Image is larger than 5 MB' };
  const dir = path.join(PUBLIC_DIR, 'Guide Images', guideId);
  fs.mkdirSync(dir, { recursive: true });
  const name = Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(dir, name), buf);
  return { path: '/public/Guide Images/' + guideId + '/' + name };
}

// ---- Creator: access gate ----
function requireCreator(req, res, next) {
  const token = readCookie(req);
  const s = token ? getSession(token) : null;
  if (!s || s.kind !== 'user') return jsonError(res, 401, 'Please sign in');
  const u = findUserById(s.userId);
  if (!u) return jsonError(res, 401, 'User no longer exists');
  if (!isApprovedCreator(u.email)) return jsonError(res, 403, 'Creator access required');
  req.user = u;
  req.creator = findCreatorRecord(u.email);
  next();
}

// ---- Who is this session? (admin, creator, or nobody) ----
function sessionInfo(req) {
  const token = readCookie(req);
  const s = token ? getSession(token) : null;
  if (!s) return { kind: null };
  if (s.kind === 'admin') return { kind: 'admin' };
  if (s.kind === 'user') {
    const u = findUserById(s.userId);
    if (!u) return { kind: null };
    return { kind: 'user', user: u, creator: findCreatorRecord(u.email) };
  }
  return { kind: null };
}

// Guide editing is open to the owning creator AND to WTT admins. Admins may
// edit any guide in any status, including published ones — mistakes happen.
function requireGuideEditor(req, res, next) {
  const info = sessionInfo(req);
  if (info.kind === 'admin') { req.editor = { kind: 'admin' }; return next(); }
  if (info.kind === 'user' && info.creator && info.creator.status === 'accepted') {
    req.editor = { kind: 'creator', user: info.user, creator: info.creator };
    return next();
  }
  return jsonError(res, 403, 'Creator access required');
}

// Who am I — drives the creator gate (sign in / apply / dashboard / admin edit)
app.get('/api/creator/me', (req, res) => {
  const info = sessionInfo(req);
  if (info.kind === 'admin') {
    return res.json({
      user: { id: 'admin', name: 'WTT admin', email: '', avatar: null },
      isAdmin: true, isCreator: false, application: null,
    });
  }
  if (info.kind !== 'user') return jsonError(res, 401, 'Not signed in');
  const rec = info.creator;
  res.json({
    user: { id: info.user.id, name: info.user.name, email: info.user.email, avatar: info.user.avatar },
    isAdmin: false,
    isCreator: !!(rec && rec.status === 'accepted'),
    application: rec ? {
      status: rec.status, name: rec.name, handle: rec.handle, area: rec.area,
      bio: rec.bio || '', youtubeUrl: rec.youtubeUrl || '', instagramUrl: rec.instagramUrl || '',
      appliedAt: rec.appliedAt, reviewNote: rec.reviewNote || null,
    } : null,
  });
});

// Apply to become a creator (admin approves in /admin)
app.post('/api/creator/apply', requireUser, (req, res) => {
  try {
    const b = req.body || {};
    const name = clip(b.name, 120).trim();
    const handle = clip(b.handle, 80).trim();
    if (!name || !handle) return jsonError(res, 400, 'Your name and social handle are required');
    const creators = readCreators();
    const idx = creators.findIndex((c) => String(c.email || '').toLowerCase() === req.user.email);
    const existing = idx >= 0 ? creators[idx] : null;
    if (existing && existing.status === 'accepted') return jsonError(res, 409, 'You are already a creator');
    const record = {
      id: existing ? existing.id : genId(),
      name: name, handle: handle,
      area: clip(b.area, 80).trim(),
      email: req.user.email,
      bio: clip(b.bio, 600).trim(),
      youtubeUrl: clip(b.youtubeUrl, 300).trim(),
      instagramUrl: clip(b.instagramUrl, 300).trim(),
      tiktokUrl: clip(b.tiktokUrl, 300).trim(),
      status: 'pending',
      guides: existing && Array.isArray(existing.guides) ? existing.guides : [],
      appliedAt: new Date().toISOString(),
      reviewNote: null,
    };
    if (existing) creators[idx] = record; else creators.push(record);
    writeArray(CREATORS_FILE, creators);
    res.json({ ok: true, status: 'pending' });
  } catch (e) { jsonError(res, 500, e.message); }
});

// My guides
app.get('/api/creator/guides', requireCreator, (req, res) => {
  const mine = readGuides().filter((g) => g.creatorId === req.user.id)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  res.json({ guides: mine, total: mine.length });
});

// New draft
app.post('/api/creator/guides', requireCreator, (req, res) => {
  try {
    const guides = readGuides();
    const base = slugify((req.body || {}).title || 'guide');
    let id = base;
    while (guides.some((g) => g.id === id)) id = base + '-' + crypto.randomBytes(2).toString('hex');
    const now = new Date().toISOString();
    const guide = {
      id: id,
      creatorId: req.user.id,
      creatorEmail: req.user.email,
      creatorName: req.creator.name || req.user.name,
      creatorHandle: req.creator.handle || '',
      status: 'draft',
      title: clip((req.body || {}).title, 120).trim(),
      tagline: '', city: '', prefecture: '', category: '', season: [],
      duration: '', price: PRICE_MIN, heroImage: '',
      coordinates: null, zoomLevel: 10,
      video: { platform: 'youtube', url: '', handle: req.creator.handle || '' },
      includes: [], timeline: [], ja: {},
      createdAt: now, updatedAt: now,
    };
    guides.push(guide);
    writeGuides(guides);
    res.status(201).json({ guide: guide });
  } catch (e) { jsonError(res, 500, e.message); }
});

// Read one (owning creator, or any admin)
app.get('/api/creator/guides/:id', requireGuideEditor, (req, res) => {
  const g = findGuide(req.params.id);
  if (!g) return jsonError(res, 404, 'Guide not found');
  if (req.editor.kind !== 'admin' && g.creatorId !== req.editor.user.id) return jsonError(res, 403, 'Not your guide');
  res.json({ guide: g, problems: guideProblems(g), asAdmin: req.editor.kind === 'admin' });
});

// Update (owning creator, or any admin — admins can even edit published guides)
app.patch('/api/creator/guides/:id', requireGuideEditor, (req, res) => {
  try {
    const guides = readGuides();
    const i = guides.findIndex((g) => g.id === req.params.id);
    if (i < 0) return jsonError(res, 404, 'Guide not found');
    const g = guides[i];
    const asAdmin = req.editor.kind === 'admin';
    if (!asAdmin && g.creatorId !== req.editor.user.id) return jsonError(res, 403, 'Not your guide');
    // Creators CAN edit a published guide — but the change has to be reviewed
    // before it goes live again, so it drops back to "submitted".
    const wasPublished = !asAdmin && g.status === 'published';
    const b = req.body || {};
    if (b.title !== undefined) g.title = clip(b.title, 120).trim();
    if (b.tagline !== undefined) g.tagline = clip(b.tagline, 200).trim();
    if (b.city !== undefined) g.city = clip(b.city, 60).trim();
    if (b.prefecture !== undefined) g.prefecture = clip(b.prefecture, 60).trim();
    if (b.category !== undefined && CATEGORIES.includes(b.category)) g.category = b.category;
    if (b.season !== undefined) g.season = (Array.isArray(b.season) ? b.season : []).slice(0, 12).map((s) => clip(s, 20));
    if (b.duration !== undefined) g.duration = clip(b.duration, 40).trim();
    if (b.price !== undefined) {
      const p = clampPrice(b.price);
      if (p === null) return jsonError(res, 400, 'Price must be a number');
      g.price = p;
    }
    if (b.heroImage !== undefined) g.heroImage = clip(b.heroImage, 400);
    if (b.coordinates !== undefined) {
      if (b.coordinates === null) g.coordinates = null;
      else if (isLatLng(b.coordinates)) g.coordinates = [Number(b.coordinates[0]), Number(b.coordinates[1])];
      else return jsonError(res, 400, 'Invalid map coordinates');
    }
    if (b.zoomLevel !== undefined) {
      const z = Math.round(Number(b.zoomLevel));
      g.zoomLevel = Number.isFinite(z) ? Math.min(18, Math.max(1, z)) : g.zoomLevel;
    }
    if (b.video !== undefined) {
      const v = b.video || {};
      g.video = {
        platform: VIDEO_PLATFORMS.includes(v.platform) ? v.platform : 'youtube',
        url: clip(v.url, 500).trim(),
        handle: clip(v.handle, 80).trim(),
      };
    }
    if (b.includes !== undefined) g.includes = (Array.isArray(b.includes) ? b.includes : []).slice(0, 20).map((s) => clip(s, 160));
    if (b.timeline !== undefined) {
      const list = Array.isArray(b.timeline) ? b.timeline.slice(0, 40) : [];
      const out = [];
      for (const t of list) {
        if (!t) continue;
        out.push({
          day: Number.isFinite(Number(t.day)) ? Math.max(1, Math.round(Number(t.day))) : 1,
          time: clip(t.time, 10).trim(),
          title: clip(t.title, 140).trim(),
          desc: clip(t.desc, 1200).trim(),
          travelTime: clip(t.travelTime, 80).trim(),
          travelMode: TRAVEL_MODES.includes(t.travelMode) ? t.travelMode : 'walk',
          image: clip(t.image, 400),
          googleMapsUrl: clip(t.googleMapsUrl, 500).trim(),
          mapPin: isLatLng(t.mapPin) ? [Number(t.mapPin[0]), Number(t.mapPin[1])] : null,
        });
      }
      g.timeline = out;
    }
    // `ja` is platform-managed now: creators no longer write Japanese by hand,
    // and the guide is machine-translated when it is published.
    g.updatedAt = new Date().toISOString();
    if (wasPublished) {
      g.status = 'submitted';
      g.submittedAt = g.updatedAt;
      g.reviewNote = null;
    }
    guides[i] = g;
    writeGuides(guides);
    res.json({ guide: g, problems: guideProblems(g) });
  } catch (e) { jsonError(res, 500, e.message); }
});

app.delete('/api/creator/guides/:id', requireCreator, (req, res) => {
  const guides = readGuides();
  const g = guides.find((x) => x.id === req.params.id);
  if (!g) return jsonError(res, 404, 'Guide not found');
  if (g.creatorId !== req.user.id) return jsonError(res, 403, 'Not your guide');
  if (g.status === 'published') return jsonError(res, 409, 'Published guides cannot be deleted');
  writeGuides(guides.filter((x) => x.id !== g.id));
  res.json({ ok: true });
});

// Submit for review
app.post('/api/creator/guides/:id/submit', requireCreator, (req, res) => {
  const guides = readGuides();
  const i = guides.findIndex((g) => g.id === req.params.id);
  if (i < 0) return jsonError(res, 404, 'Guide not found');
  const g = guides[i];
  if (g.creatorId !== req.user.id) return jsonError(res, 403, 'Not your guide');
  if (g.status === 'published') return jsonError(res, 409, 'Already published');
  const problems = guideProblems(g);
  if (problems.length) return res.status(400).json({ error: 'Still missing', problems: problems });
  if (g.status === 'submitted') return res.json({ ok: true, guide: g }); // already awaiting review
  g.status = 'submitted';
  g.submittedAt = new Date().toISOString();
  g.updatedAt = g.submittedAt;
  g.reviewNote = null;
  guides[i] = g;
  writeGuides(guides);
  res.json({ ok: true, guide: g });
});

// Image upload — base64 in, public path out
app.post('/api/creator/images', requireGuideEditor, (req, res) => {
  try {
    const b = req.body || {};
    const guideId = String(b.guideId || '').replace(/[^a-z0-9-]/gi, '');
    if (!guideId) return jsonError(res, 400, 'guideId is required');
    const g = findGuide(guideId);
    if (!g || (req.editor.kind !== 'admin' && g.creatorId !== req.editor.user.id)) return jsonError(res, 403, 'Not your guide');
    const saved = saveGuideImage(guideId, b.dataUrl);
    if (!saved) return jsonError(res, 400, 'Only PNG, JPEG or WebP images are supported');
    if (saved.error) return jsonError(res, 413, saved.error);
    res.json({ ok: true, path: saved.path });
  } catch (e) { jsonError(res, 500, e.message); }
});

// ---- Creator: pull lat/lng out of any Google Maps link (incl. short share links) ----
function extractLatLng(text) {
  const s = String(text || '');
  const pats = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|destination|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,
  ];
  for (const p of pats) {
    const m = p.exec(s);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (isLatLng([lat, lng])) return [lat, lng];
    }
  }
  return null;
}

app.post('/api/creator/resolve-map-link', requireGuideEditor, async (req, res) => {
  const raw = clip((req.body || {}).url, 800).trim();
  if (!/^https?:\/\//i.test(raw)) return jsonError(res, 400, 'That does not look like a link');
  let host;
  try { host = new URL(raw).hostname.toLowerCase(); } catch (e) { return jsonError(res, 400, 'That does not look like a link'); }
  // Only Google hosts — never fetch an arbitrary URL on the creator's behalf.
  if (!/(^|\.)google\.[a-z.]{2,}$/.test(host) && !/(^|\.)goo\.gl$/.test(host)) {
    return jsonError(res, 400, 'Only Google Maps links are supported');
  }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(raw, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorthTheTrip/1.0)' } });
    clearTimeout(timer);
    let coords = extractLatLng(r.url);
    if (!coords) {
      const html = await r.text().catch(() => '');
      coords = extractLatLng(html);
    }
    if (!coords) return jsonError(res, 404, 'Could not find a pin in that link — open the place in Maps and copy the full URL');
    res.json({ ok: true, coordinates: coords, resolvedUrl: r.url });
  } catch (e) {
    jsonError(res, 502, 'Could not open that link (it may be private or offline)');
  }
});

// ---- Creator: pull name/coords out of a Google Maps place page ----
// The place page HTML is mostly JS-driven and often carries no readable name or
// address, but the resolved URL is /maps/place/<name>/@lat,lng — so the name and
// pin come from there, which is reliable for both full and short share links.
function decodeName(s) {
  try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return String(s).replace(/\+/g, ' '); }
}

function extractPlaceInfo(html, finalUrl) {
  const out = {};
  out.coordinates = extractLatLng(finalUrl) || extractLatLng(html);

  let name = '';
  const placePath = /\/maps\/place\/([^/]+)\//.exec(finalUrl);
  if (placePath) name = decodeName(placePath[1]);
  if (!name) {
    const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
            || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    name = og ? og[1] : '';
  }
  if (!name) { const t = /<title>([^<]*)<\/title>/i.exec(html); name = t ? t[1] : ''; }
  out.name = name
    .replace(/\s*[–—-]\s*Google\s*Maps\s*$/i, '')
    .replace(/\s*-\s*Google\s*$/i, '')
    .replace(/\s*[–—-]\s*Google\s*マップ\s*$/i, '')
    .trim();

  // Address is best effort — the page rarely exposes it as plain text.
  const addr = /data-item-id=["']address["'][^>]*aria-label=["']([^"']+)["']/i.exec(html)
            || /data-item-id=["']address["'][^>]*>([^<]{8,})</i.exec(html);
  if (addr) out.address = addr[1].replace(/\s+/g, ' ').trim();
  return out;
}

// ---- Creator: walking/driving distance + time between two pins (OSRM) ----
async function routeBetween(fromPin, toPin) {
  if (!isLatLng(fromPin) || !isLatLng(toPin)) return null;
  const u = fromPin[1] + ',' + fromPin[0];
  const v = toPin[1] + ',' + toPin[0];
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('https://router.project-osrm.org/route/v1/foot/' + u + ';' + v + '?overview=false', { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    const leg = j && j.routes && j.routes[0];
    if (!leg) return null;
    return { distanceM: Math.round(leg.distance), durationMin: Math.max(1, Math.round((leg.duration || 0) / 60)) };
  } catch (e) { return null; }
}

// Paste a Maps link for one stop -> name, pin, address, and how far it is
// from the previous stop. Everything it returns is editable by the creator.
app.post('/api/creator/resolve-step', requireGuideEditor, async (req, res) => {
  const raw = clip((req.body || {}).url, 800).trim();
  const fromPin = isLatLng((req.body || {}).fromPin) ? [Number(req.body.fromPin[0]), Number(req.body.fromPin[1])] : null;
  if (!/^https?:\/\//i.test(raw)) return jsonError(res, 400, 'That does not look like a link');
  let host;
  try { host = new URL(raw).hostname.toLowerCase(); } catch (e) { return jsonError(res, 400, 'That does not look like a link'); }
  if (!/(^|\.)google\.[a-z.]{2,}$/.test(host) && !/(^|\.)goo\.gl$/.test(host)) {
    return jsonError(res, 400, 'Only Google Maps links are supported');
  }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(raw, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorthTheTrip/1.0)' } });
    clearTimeout(timer);
    let html = '';
    try { html = await r.text(); } catch (e) { html = ''; }
    const info = extractPlaceInfo(html, r.url);
    if (!info.coordinates) return jsonError(res, 404, 'Could not find a pin in that link — open the place in Maps and copy the full URL');
    let leg = null;
    if (fromPin) leg = await routeBetween(fromPin, info.coordinates);
    res.json({ ok: true, name: info.name || '', address: info.address || '', coordinates: info.coordinates, from: fromPin, leg: leg });
  } catch (e) {
    jsonError(res, 502, 'Could not open that link (it may be private or offline)');
  }
});

// ---- Creator: machine-translate a guide into Japanese when it is published ----
// Creators write in English only; the platform produces the Japanese version so
// the app's existing g.ja.* override just works when a user switches language.
// Uses the same free MyMemory endpoint as the in-app Translator page.
const MM_URL = 'https://api.mymemory.translated.net/get';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mmTranslate(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(MM_URL + '?q=' + encodeURIComponent(t) + '&langpair=en|ja', { signal: ctl.signal });
    clearTimeout(timer);
    const j = await r.json();
    const out = j && j.responseData && j.responseData.translatedText;
    if (!out || out === t || /mymemory warning|query limit|invalid target/i.test(out)) return '';
    return out;
  } catch (e) { return ''; }
}

function guideJaSource(g) {
  return JSON.stringify([
    g.title || '', g.tagline || '', g.duration || '', g.includes || [],
    (g.timeline || []).map((s) => [s.title || '', s.desc || ''])
  ]);
}
function jaHash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }

async function translateGuideToJa(g) {
  const src = guideJaSource(g);
  const h = jaHash(src);
  if (g.ja && g.ja.title && g.jaSourceHash === h) return;   // translation already current

  const parts = [
    ['title', g.title], ['tagline', g.tagline], ['duration', g.duration],
    ...(g.includes || []).map((x, i) => ['inc:' + i, x]),
    ...(g.timeline || []).reduce((acc, s, i) => acc.concat([
      ['t:' + i + ':title', s.title], ['t:' + i + ':desc', s.desc],
    ]), [])
  ];

  const out = { title: '', tagline: '', duration: '', includes: [], timeline: [] };
  for (const [key, text] of parts) {
    const tr = await mmTranslate(text);
    if (tr) await sleep(120);   // be polite to the free tier
    if (key === 'title') out.title = tr;
    else if (key === 'tagline') out.tagline = tr;
    else if (key === 'duration') out.duration = tr;
    else if (key.startsWith('inc:')) out.includes[Number(key.slice(4))] = tr;
    else if (key.startsWith('t:')) {
      const [, i, f] = key.split(':');
      if (!out.timeline[i]) out.timeline[i] = {};
      out.timeline[i][f] = tr;
    }
  }
  g.ja = out;
  g.jaSourceHash = h;
}

// ---- Public: published creator guides (consumed by the explore page) ----
app.get('/api/guides', (req, res) => {
  const list = readGuides().filter((g) => g.status === 'published')
    .map((g) => { const out = Object.assign({}, g); delete out.creatorEmail; delete out.reviewNote; return out; });
  res.json({ guides: list, total: list.length });
});

// ---- Admin: guide review ----
app.get('/api/admin/guides', requireAdmin, (req, res) => {
  let list = readGuides();
  const status = clip(req.query.status, 20).trim();
  if (status) list = list.filter((g) => g.status === status);
  list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  res.json({ guides: list, total: list.length });
});

app.patch('/api/admin/guides/:id', requireAdmin, async (req, res) => {
  try {
    const guides = readGuides();
    const i = guides.findIndex((g) => g.id === req.params.id);
    if (i < 0) return jsonError(res, 404, 'Guide not found');
    const g = guides[i];
    const b = req.body || {};
    if (b.status && ['published', 'rejected', 'submitted', 'draft'].includes(b.status)) {
      if (b.status === 'published') {
        const problems = guideProblems(g);
        if (problems.length) return res.status(400).json({ error: 'Cannot publish — still incomplete', problems: problems });
        g.publishedAt = new Date().toISOString();
        g.status = 'published';
        // Creators write English only — produce the Japanese version here.
        await translateGuideToJa(g);
      } else {
        g.status = b.status;
      }
    }
    if (b.reviewNote !== undefined) g.reviewNote = clip(b.reviewNote, 600);
    g.reviewedAt = new Date().toISOString();
    g.updatedAt = g.reviewedAt;
    guides[i] = g;
    writeGuides(guides);
    res.json({ ok: true, guide: g });
  } catch (e) { jsonError(res, 500, e.message); }
});

// Pass a relative path + root (same as express.static). An absolute path makes
// `send` treat SiteGround's hidden ".nodeapp" dir as a dotfile and 404.
app.get('/account', (req, res) => res.sendFile('account.html', { root: DATA_DIR }));
app.get('/admin', (req, res) => res.sendFile('admin.html', { root: DATA_DIR }));
app.get('/creator', (req, res) => res.sendFile('creator.html', { root: DATA_DIR }));

// ------------------------------------------------------------------ start
app.use(express.static(DATA_DIR));

app.listen(PORT, HOST, () => {
  console.log('WTT app server running at http://' + HOST + ':' + PORT);
  console.log('API:        http://' + HOST + ':' + PORT + '/api/*');
  console.log('Webhook:    http://' + HOST + ':' + PORT + '/webhooks/stripe');
  console.log('Admin:      http://' + HOST + ':' + PORT + '/admin (password: ' + ADMIN_PASSWORD + ')');
  console.log('Account:    http://' + HOST + ':' + PORT + '/account');
  if (STRIPE_SECRET_KEY === '__STRIPE_NO_KEY__') {
    console.log('⚠️  STRIPE_SECRET_KEY is not set — Stripe checkout/webhook will NOT work until env is configured.');
  }
  if (STRIPE_WEBHOOK_SECRET === '__STRIPE_WEBHOOK_NO_KEY__') {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET is not set — real Stripe events will be rejected. Set it from the Stripe Dashboard.');
  }
});
