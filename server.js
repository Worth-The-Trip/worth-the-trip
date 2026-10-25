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

// SiteGround runs the app from .nodeapp/<id>/app_source and recreates that
// folder on every deploy, so anything written inside it is wiped on the next
// `git push`. Keep runtime data (accounts, sessions, purchases, uploads)
// outside it. Locally there is no .nodeapp, so data stays in the repo dir and
// existing dev data is untouched. Override the location with WTT_DATA_DIR.
const ON_SITEGROUND = DATA_DIR.split(path.sep).indexOf('.nodeapp') !== -1;
function pickRuntimeDir() {
  const candidates = [];
  if (process.env.WTT_DATA_DIR) candidates.push(path.resolve(process.env.WTT_DATA_DIR));
  if (ON_SITEGROUND) {
    if (process.env.HOME) candidates.push(path.join(process.env.HOME, 'wtt-data'));
    candidates.push(path.resolve(DATA_DIR, '..', '..', '..', 'wtt-data'));
  }
  candidates.push(DATA_DIR);
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, '.wtt-write-test');
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
      return dir;
    } catch (e) { /* not writable, try the next candidate */ }
  }
  return DATA_DIR;
}
const RUNTIME_DIR = pickRuntimeDir();

const PUBLIC_DIR = path.join(DATA_DIR, 'public');
const UPLOAD_DIR = path.join(RUNTIME_DIR, 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const GUIDES_IMG_DIR = path.join(UPLOAD_DIR, 'Guide Images');

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
const CATEGORIES = [
  'culture', 'food', 'nature', 'hiking', 'luxury',
  'temples', 'nightlife', 'shopping', 'onsen', 'family',
  'romance', 'photography', 'art', 'festivals', 'wellness',
  'adventure', 'budget', 'daytrips', 'seasonal', 'local',
];
const TRAVEL_MODES = ['walk', 'train', 'bus', 'taxi', 'car', 'ferry', 'bike'];
const VIDEO_PLATFORMS = ['youtube', 'instagram', 'tiktok', 'twitch', 'other'];

const AUTH_FILE = path.join(RUNTIME_DIR, 'auth.jsonl');
const SESSIONS_FILE = path.join(RUNTIME_DIR, 'sessions.jsonl');
const PURCHASES_FILE = path.join(RUNTIME_DIR, 'purchases.jsonl');
const FREE_CLAIMS_FILE = path.join(RUNTIME_DIR, 'freeguides.jsonl');
const CREATORS_FILE = path.join(RUNTIME_DIR, 'creators.json');
const GUIDES_SRC = path.join(DATA_DIR, 'src', 'js', 'data', 'guides.js');
// Creator-authored guides are runtime data: SiteGround recreates the app dir on
// every deploy, so writing them next to the source would destroy them.
const GUIDES_FILE = path.join(RUNTIME_DIR, 'guides.json');

const vm = require('vm');
// The account runs Managed Payments, which needs API version 2025-03-31.basil or
// newer — the SDK's bundled default is older and is rejected outright.
const STRIPE = require('stripe')(STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || '2025-03-31.basil',
});

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
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  fs.mkdirSync(GUIDES_IMG_DIR, { recursive: true });
  if (!fs.existsSync(GUIDES_FILE)) fs.writeFileSync(GUIDES_FILE, '[]');
  // Seed runtime creator records from the committed copy on first run so the
  // demo creator survives; afterwards applications persist in RUNTIME_DIR.
  if (!fs.existsSync(CREATORS_FILE)) {
    try { fs.copyFileSync(path.join(DATA_DIR, 'creators.json'), CREATORS_FILE); }
    catch (e) { fs.writeFileSync(CREATORS_FILE, '[]'); }
  }
}
ensureDataFiles();

// ------------------------------------------------------- follower counts
// Real counts are fetched from the platforms' own APIs, server-side, and cached
// in RUNTIME_DIR so a redeploy does not lose them.
//
// What is actually possible today (checked 2026-10):
//   YouTube — yes. Needs a Google Cloud project with the YouTube Data API v3
//             enabled and an API key. No user login required. 1 quota unit a call.
//   Twitch  — yes. Needs a registered app's Client ID + Client Secret. No user
//             login required for the follower total.
//   Instagram — no. The Basic Display API was shut down in Dec 2024; the
//             replacement only works for accounts that log in AND are
//             Business/Creator accounts, behind App Review.
//   TikTok  — no. The Display API only returns stats for the logged-in user's
//             own account; other accounts cannot be queried.
// So Instagram/TikTok counts stay whatever the creator typed, and are labelled
// as such rather than presented as live.
const FOLLOWERS_FILE = path.join(RUNTIME_DIR, 'followers.json');
const FOLLOWERS_TTL_MS = 6 * 60 * 60 * 1000; // refresh about every 6 hours

function readFollowerCache() {
  try { return JSON.parse(fs.readFileSync(FOLLOWERS_FILE, 'utf8')) || {}; } catch { return {}; }
}
function writeFollowerCache(cache) {
  try { fs.writeFileSync(FOLLOWERS_FILE, JSON.stringify(cache, null, 2)); } catch (e) { /* best effort */ }
}
function followerCacheFresh(entry) {
  const t = Date.parse((entry || {}).updatedAt || '');
  return Number.isFinite(t) && (Date.now() - t) < FOLLOWERS_TTL_MS;
}

// A pasted number, or empty. 0 means "no figure", which renders as nothing.
function clampCount(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 999999999);
}

// Turn a pasted URL or bare handle into the platform's lookup key.
function youtubeHandle(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  let m = /(?:youtube\.com|youtu\.be)\/(@?[A-Za-z0-9_.-]+)/i.exec(s);
  if (m) return m[1].replace(/^@/, '');
  if (/^@?[A-Za-z0-9_.-]{3,}$/.test(s)) return s.replace(/^@/, '');
  return null;
}
function twitchHandle(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  const m = /twitch\.tv\/([A-Za-z0-9_]{3,25})/i.exec(s);
  if (m) return m[1];
  if (/^[A-Za-z0-9_]{3,25}$/.test(s)) return s;
  return null;
}

async function fetchYouTubeSubs(handle) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { error: 'no key' };
  const u = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics'
    + '&forHandle=' + encodeURIComponent(handle) + '&key=' + encodeURIComponent(key);
  const r = await fetch(u, { headers: { Accept: 'application/json' } });
  if (!r.ok) return { error: 'HTTP ' + r.status };
  const j = await r.json();
  const ch = j && j.items && j.items[0];
  if (!ch) return { error: 'not found' };
  return { count: Number(ch.statistics && ch.statistics.subscriberCount) || 0 };
}

let twitchToken = null;
async function getTwitchToken() {
  if (twitchToken && twitchToken.expires > Date.now()) return twitchToken.value;
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;
  const r = await fetch('https://id.twitch.tv/oauth2/token?client_id=' + encodeURIComponent(id)
    + '&client_secret=' + encodeURIComponent(secret) + '&grant_type=client_credentials', { method: 'POST' });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.access_token) return null;
  twitchToken = { value: j.access_token, expires: Date.now() + (j.expires_in - 60) * 1000 };
  return twitchToken.value;
}

async function fetchTwitchFollowers(handle) {
  const id = process.env.TWITCH_CLIENT_ID;
  if (!id) return { error: 'no key' };
  const token = await getTwitchToken();
  if (!token) return { error: 'no token' };
  const hdr = { Authorization: 'Bearer ' + token, 'Client-Id': id };
  const u = 'https://api.twitch.tv/helix/users?login=' + encodeURIComponent(handle);
  const r = await fetch(u, { headers: hdr });
  if (!r.ok) return { error: 'HTTP ' + r.status };
  const j = await r.json();
  const user = j && j.data && j.data[0];
  if (!user) return { error: 'not found' };
  const f = await fetch('https://api.twitch.tv/helix/channels/followers?broadcaster_id=' + encodeURIComponent(user.id), { headers: hdr });
  if (!f.ok) return { error: 'HTTP ' + f.status };
  const fj = await f.json();
  return { count: Number(fj.total) || 0 };
}

// Refresh every creator's counts. Never throws — a failed platform must not take
// the site down, and the previous cache is left in place.
async function refreshFollowerCounts(force) {
  const creators = readCreators().filter((c) => c.status === 'accepted');
  if (!creators.length) return;
  const cache = readFollowerCache();
  let changed = false;
  for (const c of creators) {
    const entry = cache[c.id] || {};
    if (!force && followerCacheFresh(entry)) continue;
    const next = Object.assign({}, entry);
    const yt = youtubeHandle(c.youtubeUrl);
    if (yt) {
      const r = await fetchYouTubeSubs(yt);
      if (typeof r.count === 'number') { next.youtube = r.count; next.youtubeAt = new Date().toISOString(); changed = true; }
      else if (r.error && r.error !== 'no key') console.error('YouTube lookup failed for', c.id + ':', r.error);
    }
    const tw = twitchHandle(c.twitchUrl);
    if (tw) {
      const r = await fetchTwitchFollowers(tw);
      if (typeof r.count === 'number') { next.twitch = r.count; next.twitchAt = new Date().toISOString(); changed = true; }
      else if (r.error && r.error !== 'no key') console.error('Twitch lookup failed for', c.id + ':', r.error);
    }
    next.updatedAt = new Date().toISOString();
    cache[c.id] = next;
  }
  if (changed) writeFollowerCache(cache);
}

// 128000 -> "128K", 486000 -> "486K", 8920000 -> "8.9M"
function formatCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  if (v >= 1000000) return (v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace(/\\.0$/, '') + 'M';
  if (v >= 1000) return Math.round(v / 1000) + 'K';
  return String(v);
}

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
function readFreeClaims() {
  return loadLines(FREE_CLAIMS_FILE).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
// The first free guide is tracked per email, case-insensitive — Stripe and the
// browser both hand us mixed-case addresses.
function findFreeClaim(email) {
  const e = String(email || '').toLowerCase();
  return readFreeClaims().find((c) => String(c.email || '').toLowerCase() === e) || null;
}
function readCreators() { return loadArray(CREATORS_FILE); }
function parseGuidesJs(file) {
  const src = fs.readFileSync(file, 'utf8');
  return JSON.parse(src.replace(/^const WTT_GUIDES = /, '').replace(/;\s*$/, ''));
}
function readGuides() {
  // WTT's own guides come from the repo so a deploy always updates them; guides
  // authored in the studio live in the persistent runtime dir and survive deploys.
  const base = parseGuidesJs(GUIDES_SRC);
  const baseIds = new Set(base.map((g) => g.id));
  const extra = loadArray(GUIDES_FILE).filter((g) => !baseIds.has(g.id));
  return base.concat(extra).map(canonicalizeGuide);
}
function canonicalizeGuide(g) {
  const ja = g.ja || {};
  // Studio guides store `video`; older/committed ones use `youtubeRef`. Prefer
  // whichever is present, or guideProblems would report the video link as
  // missing on every studio guide.
  const video = (g.video && g.video.url)
    ? { platform: g.video.platform || 'youtube', url: g.video.url, handle: g.video.handle || '' }
    : (g.youtubeRef ? { platform: 'youtube', url: g.youtubeRef.url, handle: g.youtubeRef.handle } : {});
  return {
    id: g.id, creatorId: g.creatorId, status: g.status || 'published', title: g.title,
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
    reviewNote: g.reviewNote || null, location: g.location
  };
}
function hashJa(ja) {
  const s = JSON.stringify(ja).toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
function writeGuides(arr) {
  // Only creator-authored guides are runtime data — writing the whole list would
  // pin stale copies of WTT's own guides and block repo updates from landing.
  const baseIds = new Set(parseGuidesJs(GUIDES_SRC).map((g) => g.id));
  const creatorGuides = arr.filter((g) => !baseIds.has(g.id));
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(GUIDES_FILE, JSON.stringify(creatorGuides, null, 2));
}
// What the buyer sees on the checkout page and their receipt.
function guideDescription(g) {
  const bits = [];
  if (g.duration) bits.push(String(g.duration));
  if (g.category) bits.push(String(g.category).replace(/-/g, ' '));
  bits.push('instantly downloadable Japan travel guide by local experts');
  return bits.join(' · ').slice(0, 200);
}
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
function findUser(email) {
  const e = String(email || '').toLowerCase();
  return readUsers().find((u) => String(u.email || '').toLowerCase() === e);
}
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
// Never let the CDN/proxy cache API responses. SiteGround's proxy keys its
// cache on the URL alone, so a plain `GET /api/me` keeps serving an old
// per-session body — the account page then shows a stale avatar and an empty
// purchases list, and one user's data can be served to another. no-store
// forces every API call through to Node.
// HTML page paths (extensionless routes plus their .html aliases). These must
// never be cached: the proxy keys on the URL and serves stale shells.
const HTML_PAGES = new Set(['/', '/account', '/admin', '/creator']);

app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Cookie');
  } else if (HTML_PAGES.has(p) || p.endsWith('.html')) {
    // Never let the proxy or the browser pin an old page shell — a stale
    // account.html keeps calling uncacheable API URLs and hangs on load.
    res.set('Cache-Control', 'no-store');
  }
  next();
});

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
    const buyerEmail = session.customer_details && session.customer_details.email
      ? String(session.customer_details.email).toLowerCase() : null;
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
      passwordHash: hashPassword(password), phone: '', address: '', avatar: null, banned: false,
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
    if (user.banned) return jsonError(res, 403, 'This account has been banned.');
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
  if (req.user.banned) return jsonError(res, 403, 'This account has been banned.');
  next();
}
function jsonError(res, status, msg) { res.status(status).json({ error: msg }); }
// Never echo an API key back to the browser — Stripe's own messages include the
// masked key, and a raw key could appear too.
function redactKeys(msg) {
  let m = String(msg == null ? '' : msg).replace(/[sr]k_(?:live|test)_[A-Za-z0-9_.*-]+/g, '[redacted]');
  if (STRIPE_SECRET_KEY) m = m.split(STRIPE_SECRET_KEY).join('[redacted]');
  return m;
}

app.get('/api/me', requireUser, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar, createdAt: u.createdAt, updatedAt: u.updatedAt, freeGuideClaimed: !!findFreeClaim(u.email), bio: u.bio || '', area: u.area || '', handle: u.handle || '', youtubeUrl: u.youtubeUrl || '', instagramUrl: u.instagramUrl || '', tiktokUrl: u.tiktokUrl || '', twitchUrl: u.twitchUrl || '', instagramFollowers: u.instagramFollowers || 0, tiktokFollowers: u.tiktokFollowers || 0 });
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
    // Public creator-profile fields. These live on the account so there is one
    // place to edit them, and are mirrored onto the creator record below so the
    // Creators tab reflects them without a separate admin step.
    if (body.bio !== undefined) u.bio = clip(body.bio, 600).trim();
    if (body.area !== undefined) u.area = clip(body.area, 80).trim();
    if (body.handle !== undefined) {
      const h = clip(body.handle, 80).trim();
      u.handle = h || ('@' + u.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24));
    }
    if (body.youtubeUrl !== undefined) u.youtubeUrl = clip(body.youtubeUrl, 300).trim();
    if (body.instagramUrl !== undefined) u.instagramUrl = clip(body.instagramUrl, 300).trim();
    if (body.tiktokUrl !== undefined) u.tiktokUrl = clip(body.tiktokUrl, 300).trim();
    if (body.twitchUrl !== undefined) u.twitchUrl = clip(body.twitchUrl, 300).trim();
    // Instagram and TikTok have no API that reports on other people's accounts,
    // so those figures are entered by hand. Store them as plain integers.
    if (body.instagramFollowers !== undefined) u.instagramFollowers = clampCount(body.instagramFollowers);
    if (body.tiktokFollowers !== undefined) u.tiktokFollowers = clampCount(body.tiktokFollowers);
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
    syncCreatorProfile(u);
    res.json({
      id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar,
      bio: u.bio || '', area: u.area || '', handle: u.handle || '',
      youtubeUrl: u.youtubeUrl || '', instagramUrl: u.instagramUrl || '',
      tiktokUrl: u.tiktokUrl || '', twitchUrl: u.twitchUrl || '',
      instagramFollowers: u.instagramFollowers || 0, tiktokFollowers: u.tiktokFollowers || 0,
      updatedAt: u.updatedAt
    });
  } catch (e) { jsonError(res, 500, redactKeys(e.message)); }
});

// Mirror an account's public profile onto its creator record so the Creators
// tab stays in step. Only the fields the user owns are copied — never status.
function syncCreatorProfile(u) {
  try {
    const creators = readCreators();
    const idx = creators.findIndex(
      (c) => String(c.email || '').toLowerCase() === String(u.email || '').toLowerCase()
    );
    if (idx < 0) return;
    const c = creators[idx];
    c.name = u.name || c.name;
    c.bio = u.bio || '';
    c.area = u.area || '';
    c.handle = u.handle || c.handle;
    if (u.youtubeUrl !== undefined) c.youtubeUrl = u.youtubeUrl;
    if (u.instagramUrl !== undefined) c.instagramUrl = u.instagramUrl;
    if (u.tiktokUrl !== undefined) c.tiktokUrl = u.tiktokUrl;
    if (u.twitchUrl !== undefined) c.twitchUrl = u.twitchUrl;
    c.profileUpdatedAt = new Date().toISOString();
    creators[idx] = c;
    writeArray(CREATORS_FILE, creators);
  } catch (e) {
    console.error('Creator profile sync error:', e.message);
  }
}

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
    banned: !!u.banned,
    createdAt: u.createdAt, purchaseCount: purchases.filter((p) => String(p.buyerEmail || '').toLowerCase() === String(u.email || '').toLowerCase()).length,
  }));
  res.json({ users: list, total: list.length });
});

app.get('/api/users/:id', requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return jsonError(res, 404, 'User not found');
  const purchases = readPurchases().filter((p) => p.buyerEmail === u.email).sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  res.json({ user: { id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, avatar: u.avatar, banned: !!u.banned, createdAt: u.createdAt }, purchases });
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
  if (body.password) {
    // Admin route: a password sent here is a reset, so no old password is needed.
    u.passwordHash = hashPassword(body.password);
  }
  if (body.banned !== undefined) {
    u.banned = !!body.banned;
    // Ban takes effect immediately: drop the user's live sessions.
    if (u.banned) writeLines(SESSIONS_FILE, readSessions().filter((s) => s.userId !== u.id));
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
  const email = String(req.user.email || '').toLowerCase();
  const since = req.query.since;
  const list = readPurchases()
    .filter((p) => String(p.buyerEmail || '').toLowerCase() === email)
    .sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  if (since) list = list.filter((p) => (p.purchasedAt || 0) >= Date.parse(since));

  // The free first guide is a claim, not a payment — but it belongs on the
  // customer's own list, tagged "Free unlock".
  const claim = findFreeClaim(email);
  if (claim) {
    const g = findGuide(claim.guideId);
    list.unshift({
      guideId: claim.guideId,
      guideTitle: g ? g.title : claim.guideId,
      buyerEmail: claim.email,
      amount: 0,
      currency: null,
      purchasedAt: Date.parse(claim.claimedAt),
      type: 'free',
    });
  }
  res.json({ purchases: list, total: list.length });
});

// ---- Customer: first free guide claim (once per email, recorded server-side) ----
// The claim used to live only in the browser's localStorage, so it was invisible
// to the server, reset on another device, and could be re-claimed by clearing
// storage. It is now a record keyed on the account email.
app.get('/api/free-guides/status', requireUser, (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  const claim = findFreeClaim(email);
  res.json(claim
    ? { claimed: true, guideId: claim.guideId, claimedAt: claim.claimedAt }
    : { claimed: false });
});

app.post('/api/free-guides/claim', requireUser, (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  const guideId = String((req.body || {}).guideId || '').trim();
  if (!guideId) return jsonError(res, 400, 'guideId is required');

  const existing = findFreeClaim(email);
  if (existing) {
    return res.json({ ok: true, alreadyClaimed: true, guideId: existing.guideId, claimedAt: existing.claimedAt });
  }

  const claims = readFreeClaims();
  const claimedAt = new Date().toISOString();
  claims.push({ email, guideId, userId: req.user.id, claimedAt });
  writeLines(FREE_CLAIMS_FILE, claims);
  res.json({ ok: true, alreadyClaimed: false, guideId, claimedAt });
});

// ---- Admin: who has claimed the first free guide ----
app.get('/api/free-guides', requireAdmin, (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  let list = readFreeClaims();
  if (email) list = list.filter((c) => String(c.email || '').toLowerCase() === email);
  list.sort((a, b) => String(b.claimedAt).localeCompare(String(a.claimedAt)));
  res.json({ claims: list, total: list.length });
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

// ---- Admin: pull completed Checkout sessions from Stripe and record any the
// site never captured (e.g. payments taken before the webhook existed).
// Idempotent — a session already recorded is skipped.
app.post('/api/admin/purchases/sync', requireAdmin, async (req, res) => {
  try {
    let result;
    try {
      result = await STRIPE.checkout.sessions.list({ limit: 100, expand: ['data.line_items'] });
    } catch (e) {
      result = await STRIPE.checkout.sessions.list({ limit: 100 });
    }
    const purchases = readPurchases();
    const seen = new Set(purchases.map((p) => p.sessionId || p.id));
    let added = 0;
    let skipped = 0;
    for (const s of (result && result.data) || []) {
      const paid = s.status === 'complete' || s.payment_status === 'paid';
      if (!paid || seen.has(s.id)) { skipped++; continue; }
      const li = s.line_items && s.line_items.data && s.line_items.data[0];
      // Product names are "<guide id with spaces> — Worth The Trip".
      const rawName = String((li && (li.description || (li.price && li.price.nickname))) || '');
      const guideId = (s.metadata && s.metadata.guideId) ||
        (rawName ? slugify(rawName.split('—')[0]) : null);
      const amount = (s.amount_total != null)
        ? s.amount_total
        : (li && li.amount_total != null ? li.amount_total : null);
      // Prefer the guide's real title over Stripe's raw product name
      // ("tokyo city explorer — Worth The Trip").
      const g = guideId ? findGuide(guideId) : null;
      purchases.push({
        id: s.id,
        sessionId: s.id,
        type: s.mode === 'subscription' ? 'subscription' : 'payment',
        guideId: guideId,
        guideTitle: (s.metadata && s.metadata.guideTitle) || (g ? g.title : (rawName || null)),
        buyerEmail: (s.customer_details && s.customer_details.email)
          ? String(s.customer_details.email).toLowerCase() : null,
        stripeCustomerId: (s.customer && s.customer.id) || s.customer || null,
        amount: amount,
        currency: s.currency || 'jpy',
        purchasedAt: s.created || Math.floor(Date.now() / 1000),
      });
      seen.add(s.id);
      added++;
    }
    writeLines(PURCHASES_FILE, purchases);
    res.json({ ok: true, added, skipped, total: purchases.length });
  } catch (e) {
    // Never echo an API key back to the browser — Stripe's own messages
    // include the (masked) key, and a raw key could appear too.
    let msg = String((e && e.message) || e);
    msg = msg.replace(/[sr]k_(?:live|test)_[A-Za-z0-9_.*-]+/g, '[redacted]');
    if (STRIPE_SECRET_KEY) msg = msg.split(STRIPE_SECRET_KEY).join('[redacted]');
    res.status(500).json({ error: msg });
  }
});

// ---- Customer: start a guide purchase ----
// Checkout Sessions are single-use: a URL created ahead of time dies after the
// first payment (or ~24h), which is why the old hardcoded links showed Stripe's
// "You're all done here". A fresh session is created per click instead.
app.post('/api/checkout/guide', async (req, res) => {
  try {
    const guideId = String((req.body || {}).guideId || '').trim();
    const g = guideId ? findGuide(guideId) : null;
    if (!g) return jsonError(res, 404, 'Guide not found');
    const price = Number(g.price) || 0;
    if (!price) return jsonError(res, 400, 'This guide has no price yet');

    const base = process.env.WTT_BASE_URL || 'https://worththetripapp.com';
    const session = await STRIPE.checkout.sessions.create({
      mode: 'payment',
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      success_url: base + '/?session_id={CHECKOUT_SESSION_ID}&guide_id=' + encodeURIComponent(guideId),
      cancel_url: base + '/',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'jpy',
          unit_amount: price,
          product_data: {
            // The customer sees this on the checkout page and their bank
            // statement — use the guide's real title, never the slug.
            name: (g.title || guideId) + ' — Worth The Trip',
            description: guideDescription(g),
            // Stripe's managed-payments model requires an eligible digital-goods
            // tax code on the product. Guides are downloaded digital books.
            tax_code: 'txcd_10302000',
          },
        },
      }],
      metadata: { guideId: guideId, guideTitle: g.title || guideId },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout session error:', e.message);
    jsonError(res, 502, 'Could not start checkout: ' + redactKeys(e.message));
  }
});

// ---- Customer: start an "unlock all guides" subscription ----
app.post('/api/checkout/unlock-all', async (req, res) => {
  try {
    const priceId = process.env.UNLOCK_ALL_PRICE_ID || 'price_1UPk8UGlWwt59oq4nOxRuzT5';
    const base = process.env.WTT_BASE_URL || 'https://worththetripapp.com';
    const session = await STRIPE.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: false,
      success_url: base + '/?unlock_all=1',
      cancel_url: base + '/',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { unlockAll: '1' },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Unlock-all session error:', e.message);
    jsonError(res, 502, 'Could not start checkout: ' + redactKeys(e.message));
  }
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
  const dir = path.join(GUIDES_IMG_DIR, guideId);
  fs.mkdirSync(dir, { recursive: true });
  const name = Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(dir, name), buf);
  return { path: '/guide-images/' + guideId + '/' + name };
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
    if (!u || u.banned) return { kind: null };
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
    if (!name) return jsonError(res, 400, 'Your name is required');
    // A social handle is optional — derive one from the name when it is blank,
    // so a creator without social media is not blocked from applying.
    const handle = clip(b.handle, 80).trim() ||
      ('@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24));
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
    res.status(201).json({ guide: guide, problems: guideProblems(guide) });
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

// ---- Admin: force a follower-count refresh ----
app.post('/api/admin/followers/refresh', requireAdmin, async (req, res) => {
  try {
    await refreshFollowerCounts(true);
    const cache = readFollowerCache();
    const summary = Object.keys(cache).map((id) => ({
      id: id,
      youtube: cache[id].youtube || 0,
      twitch: cache[id].twitch || 0,
      updatedAt: cache[id].updatedAt || null,
    }));
    res.json({ ok: true, creators: summary });
  } catch (e) {
    console.error('Follower refresh error:', e.message);
    jsonError(res, 502, 'Could not refresh follower counts: ' + redactKeys(e.message));
  }
});

// ---- Public: approved creators (the Creators tab) ----
// NOTE: `/api/creators` is already taken by an admin-only route (creator
// applications), and Express matches the first one — hence this distinct path.
// Guides from creator-guides.js only carry a creatorId, so the app used to invent
// a placeholder ("Creator", no avatar) for anyone approved after launch. This
// returns the real profile, including the account's uploaded avatar.
app.get('/api/creator-profiles', (req, res) => {
  try {
    const users = readUsers();
    const fcache = readFollowerCache();
    const list = readCreators()
      .filter((c) => c.status === 'accepted')
      .map((c) => {
        const u = users.find(
          (x) => String(x.email || '').toLowerCase() === String(c.email || '').toLowerCase()
        );
        const live = fcache[c.id] || {};
        // Live counts where the platform allows them; manual figures for the
        // platforms whose APIs cannot report on other people's accounts.
        const manual = {
          instagram: Number(u && u.instagramFollowers) || 0,
          tiktok: Number(u && u.tiktokFollowers) || 0,
        };
        const counts = {
          youtube: Number(live.youtube) || 0,
          twitch: Number(live.twitch) || 0,
          instagram: manual.instagram,
          tiktok: manual.tiktok,
        };
        const countsAt = {
          youtube: live.youtubeAt || null,
          twitch: live.twitchAt || null,
        };
        // Legacy single figure, kept so existing data still renders.
        const hasLive = counts.youtube > 0 || counts.twitch > 0;
        const followers = hasLive
          ? [counts.youtube && 'YouTube ' + formatCount(counts.youtube),
             counts.twitch && 'Twitch ' + formatCount(counts.twitch)].filter(Boolean).join(' · ')
          : (c.followers || '');
        return {
          id: c.id,
          name: c.name,
          handle: c.handle || '',
          role: c.role || 'Creator',
          area: c.area || '',
          city: c.area || '',
          bio: c.bio || '',
          avatar: (u && u.avatar) || null,
          // Guides are stamped with the account id, not the creator-record id.
          userId: (u && u.id) || null,
          platforms: [
            ...(c.youtubeUrl ? ['youtube'] : []),
            ...(c.instagramUrl ? ['instagram'] : []),
            ...(c.tiktokUrl ? ['tiktok'] : []),
            ...(c.twitchUrl ? ['twitch'] : []),
          ],
          youtubeUrl: c.youtubeUrl || '',
          instagramUrl: c.instagramUrl || '',
          tiktokUrl: c.tiktokUrl || '',
          twitchUrl: c.twitchUrl || '',
          followers: followers,
          counts: counts,
          countsAt: countsAt,
          countsLive: hasLive,
          followersUpdatedAt: live.updatedAt || null,
          verified: true,
        };
      });
    res.json({ creators: list });
  } catch (e) {
    console.error('Creator list error:', e.message);
    jsonError(res, 500, 'Could not load creators');
  }
});

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
    // Same field set the studio sends, so the admin panel and the studio agree.
    if (b.category !== undefined && CATEGORIES.includes(b.category)) g.category = b.category;
    if (b.title !== undefined && clip(b.title, 120).trim()) g.title = clip(b.title, 120).trim();
    if (b.city !== undefined) g.city = clip(b.city, 80).trim();
    if (b.prefecture !== undefined) g.prefecture = clip(b.prefecture, 80).trim();
    if (b.duration !== undefined) g.duration = clip(b.duration, 80).trim();
    if (b.tagline !== undefined) g.tagline = clip(b.tagline, 200).trim();
    g.reviewedAt = new Date().toISOString();
    g.updatedAt = g.reviewedAt;
    guides[i] = g;
    writeGuides(guides);
    res.json({ ok: true, guide: g });
  } catch (e) { jsonError(res, 500, e.message); }
});

// Admins can remove a guide outright. Unlike the creator's own delete route
// there is no published-guide guard and no notice is sent to the creator.
app.delete('/api/admin/guides/:id', requireAdmin, (req, res) => {
  const guides = readGuides();
  const g = guides.find((x) => x.id === req.params.id);
  if (!g) return jsonError(res, 404, 'Guide not found');
  writeGuides(guides.filter((x) => x.id !== g.id));
  res.json({ ok: true });
});

// Pass a relative path + root (same as express.static). An absolute path makes
// `send` treat SiteGround's hidden ".nodeapp" dir as a dotfile and 404.
app.get('/account', (req, res) => res.sendFile('account.html', { root: DATA_DIR, cacheControl: false }));
app.get('/admin', (req, res) => res.sendFile('admin.html', { root: DATA_DIR, cacheControl: false }));
app.get('/creator', (req, res) => res.sendFile('creator.html', { root: DATA_DIR, cacheControl: false }));

// ------------------------------------------------------------------ start
// User uploads live in the persistent runtime dir; committed images stay in
// DATA_DIR. Mount the runtime copies first so new uploads win, then fall
// through to the committed tree.
app.use('/avatars', express.static(AVATAR_DIR));
// Space-free mount: the old '/public/Guide Images' path can never match, because
// browsers request it percent-encoded (/public/Guide%20Images/...) and Express
// matches the mount against the raw path. Uploads are served from here; the
// committed images under public/Guide Images still work via the DATA_DIR mount.
app.use('/guide-images', express.static(GUIDES_IMG_DIR));
// Legacy safety net: covers uploaded before the mount fix were addressed under
// the spacey path. Missing here, they fall through to the committed tree.
app.use('/public/Guide%20Images', express.static(GUIDES_IMG_DIR));
app.use(express.static(DATA_DIR));

app.listen(PORT, HOST, () => {
  console.log('WTT app server running at http://' + HOST + ':' + PORT);
  console.log('API:        http://' + HOST + ':' + PORT + '/api/*');
  console.log('Webhook:    http://' + HOST + ':' + PORT + '/webhooks/stripe');
  console.log('Admin:      http://' + HOST + ':' + PORT + '/admin (password: ' + ADMIN_PASSWORD + ')');
  console.log('Account:    http://' + HOST + ':' + PORT + '/account');
  console.log('Data dir:   ' + RUNTIME_DIR);
  if (ON_SITEGROUND && RUNTIME_DIR === DATA_DIR) {
    console.log('⚠️  No writable persistent data dir found — signups and purchases will be LOST on the next deploy.');
  }
  if (STRIPE_SECRET_KEY === '__STRIPE_NO_KEY__') {
    console.log('⚠️  STRIPE_SECRET_KEY is not set — Stripe checkout/webhook will NOT work until env is configured.');
  }
  if (STRIPE_WEBHOOK_SECRET === '__STRIPE_WEBHOOK_NO_KEY__') {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET is not set — real Stripe events will be rejected. Set it from the Stripe Dashboard.');
  }
  if (process.env.YOUTUBE_API_KEY) console.log('Follower counts: YouTube live');
  else console.log('⚠️  YOUTUBE_API_KEY is not set — YouTube follower counts will not refresh.');
  if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) console.log('Follower counts: Twitch live');
  else console.log('⚠️  TWITCH_CLIENT_ID/SECRET not set — Twitch follower counts will not refresh.');

  // Refresh follower counts in the background so a slow platform never blocks a
  // request, then keep them roughly in step.
  refreshFollowerCounts(false).catch((e) => console.error('Follower refresh failed:', e.message));
  setInterval(() => {
    refreshFollowerCounts(false).catch((e) => console.error('Follower refresh failed:', e.message));
  }, FOLLOWERS_TTL_MS).unref();
});
