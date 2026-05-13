// api/push.js — Push notifications + email digest subscriptions
// Merged: was api/subscribe.js (email) + api/push.js (Web Push)
//
// GET  /api/push?action=vapid-public         → return VAPID public key
// GET  /api/push?action=unsub&email=...      → unsubscribe from email digest
// POST /api/push {action:'subscribe',...}    → store Web Push subscription
// POST /api/push {action:'send',...}         → broadcast push to all subscribers
// POST /api/push {action:'email', email}     → subscribe to email digest

const PUSH_KEY = (e) => `ti:push:${e.toLowerCase().trim()}`;
const PUSH_ALL  = 'ti:push:all';

// ── Base64url helpers ──────────────────────────────────────────────────────────
function b64uEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function b64uDecode(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// ── KV helpers ─────────────────────────────────────────────────────────────────
async function kvExec(url, token, cmd) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(6000)
    });
    return (await r.json()).result ?? null;
  } catch { return null; }
}
const kvGet  = async (u,t,k) => { const r = await kvExec(u,t,['GET',k]); try { return r ? JSON.parse(r) : null; } catch { return null; } };
const kvSet  = (u,t,k,v)     => kvExec(u,t,['SET',k,JSON.stringify(v)]);
const kvSAdd = (u,t,k,...m)   => kvExec(u,t,['SADD',k,...m]);
const kvSRem = (u,t,k,m)     => kvExec(u,t,['SREM',k,m]);
const kvSMem = async (u,t,k) => { const r = await kvExec(u,t,['SMEMBERS',k]); return Array.isArray(r) ? r : []; };

// ── Email unsubscribe token ────────────────────────────────────────────────────
function makeUnsubToken(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36) + email.length.toString(36);
}

// ── VAPID JWT using Web Crypto ─────────────────────────────────────────────────
async function makeVapidJwt(audience, subject, privKeyB64u) {
  const header  = b64uEncode(new TextEncoder().encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: subject
  })));
  const unsigned = `${header}.${payload}`;

  const privKey = await globalThis.crypto.subtle.importKey(
    'pkcs8', buildPkcs8(b64uDecode(privKeyB64u)),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sigBuf = await globalThis.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privKey,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${b64uEncode(sigBuf)}`;
}

function buildPkcs8(rawKey) {
  const ecHeader = new Uint8Array([
    0x30,0x41, 0x02,0x01,0x00,
    0x30,0x13, 0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,
               0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,
    0x04,0x27, 0x30,0x25, 0x02,0x01,0x01, 0x04,0x20
  ]);
  const result = new Uint8Array(ecHeader.length + 32);
  result.set(ecHeader);
  result.set(rawKey.slice(0, 32), ecHeader.length);
  return result.buffer;
}

// ── RFC 8291 push encryption ───────────────────────────────────────────────────
async function sendPush(subscription, payloadStr, pubKeyB64u, privKeyB64u, vapidEmail) {
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const jwt  = await makeVapidJwt(audience, vapidEmail, privKeyB64u);
  const auth = `vapid t=${jwt},k=${pubKeyB64u}`;

  const clientPubRaw = b64uDecode(subscription.keys?.p256dh || '');
  const authSecret   = b64uDecode(subscription.keys?.auth   || '');
  if (!clientPubRaw.length || !authSecret.length) {
    const r = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: { Authorization: auth, TTL: '86400', 'Content-Type': 'application/json' },
      body: payloadStr, signal: AbortSignal.timeout(10000)
    });
    return r.status;
  }

  const serverKP = await globalThis.crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  const serverPubRaw = new Uint8Array(await globalThis.crypto.subtle.exportKey('raw', serverKP.publicKey));
  const clientPubKey = await globalThis.crypto.subtle.importKey('raw', clientPubRaw, { name:'ECDH', namedCurve:'P-256' }, false, []);
  const sharedBits   = await globalThis.crypto.subtle.deriveBits({ name:'ECDH', public: clientPubKey }, serverKP.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits);

  const hmacKey = await globalThis.crypto.subtle.importKey('raw', authSecret, { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const prk     = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', hmacKey, sharedSecret));

  const ctx = concat(new TextEncoder().encode('P-256\0'), new Uint8Array([0,65]), clientPubRaw, new Uint8Array([0,65]), serverPubRaw);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const saltKey    = await globalThis.crypto.subtle.importKey('raw', salt,    { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const saltedPrk  = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', saltKey, prk));
  const saltedKey  = await globalThis.crypto.subtle.importKey('raw', saltedPrk, { name:'HMAC', hash:'SHA-256' }, false, ['sign']);

  const cekInfo   = concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'), ctx);
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'),  ctx);
  const cek   = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', saltedKey, concat(cekInfo,   new Uint8Array([1])))).slice(0,16);
  const nonce = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', saltedKey, concat(nonceInfo, new Uint8Array([1])))).slice(0,12);

  const aesKey    = await globalThis.crypto.subtle.importKey('raw', cek, { name:'AES-GCM' }, false, ['encrypt']);
  const plaintext = concat(new Uint8Array([0,0]), new TextEncoder().encode(payloadStr));
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name:'AES-GCM', iv:nonce, tagLength:128 }, aesKey, plaintext));

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth, TTL: '86400',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      Encryption: `salt=${b64uEncode(salt)}`,
      'Crypto-Key': `dh=${b64uEncode(serverPubRaw)};p256ecdsa=${pubKeyB64u}`,
      'Content-Length': String(ciphertext.length)
    },
    body: ciphertext, signal: AbortSignal.timeout(10000)
  });
  return response.status;
}

function concat(...arrays) {
  const total = arrays.reduce((s,a) => s + a.length, 0);
  const out = new Uint8Array(total); let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    VAPID_PUBLIC_KEY:  pubKey,
    VAPID_PRIVATE_KEY: privKey,
    VAPID_EMAIL:       vapidEmail = 'mailto:jaronguggenheim@gmail.com',
    KV_REST_API_URL:   kvUrl,
    KV_REST_API_TOKEN: kvToken
  } = process.env;

  if (req.method === 'GET') {
    const { action, email, token: tok } = req.query || {};
    if (action === 'vapid-public')
      return res.status(200).json({ ok: true, publicKey: pubKey || '' });

    // Email unsubscribe (moved from api/subscribe.js)
    if (action === 'unsub') {
      if (!email || !tok) return res.status(400).send('Missing params');
      if (tok !== makeUnsubToken(decodeURIComponent(email))) return res.status(403).send('Invalid token');
      if (kvUrl && kvToken) await kvSRem(kvUrl, kvToken, 'ti:subscribers', decodeURIComponent(email));
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#111"><h2>You've been unsubscribed</h2><p>You won't receive the Morning Brief anymore.</p><a href="https://www.everythingisjustoneclickaway.com" style="color:#10b981">Back to app</a></body></html>`);
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  }

  if (req.method !== 'POST') return res.status(405).end();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { action } = body || {};

  // ── Email subscribe (moved from api/subscribe.js) ─────────────────────────
  if (action === 'email') {
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    const { email } = body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const normalised = email.toLowerCase().trim();
    await kvSAdd(kvUrl, kvToken, 'ti:subscribers', normalised);
    return res.status(200).json({ ok: true, email: normalised });
  }

  // ── Web Push subscribe ────────────────────────────────────────────────────
  if (action === 'subscribe') {
    if (!kvUrl || !kvToken) return res.status(500).json({ ok: false, error: 'KV not configured' });
    const { subscription, email = 'anon' } = body;
    if (!subscription?.endpoint) return res.status(400).json({ ok: false, error: 'subscription required' });
    const key      = PUSH_KEY(email);
    const existing = (await kvGet(kvUrl, kvToken, key)) || [];
    const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
    filtered.push({ ...subscription, createdAt: Date.now() });
    await kvSet(kvUrl, kvToken, key, filtered.slice(-5));
    await kvSAdd(kvUrl, kvToken, PUSH_ALL, email);
    return res.status(200).json({ ok: true, devices: filtered.length });
  }

  // ── Web Push send (cron) ──────────────────────────────────────────────────
  if (action === 'send') {
    if (!pubKey || !privKey) return res.status(500).json({ ok: false, error: 'VAPID keys not configured' });
    if (!kvUrl || !kvToken)  return res.status(500).json({ ok: false, error: 'KV not configured' });
    const { ticker, type = 'chain', message, url = '/' } = body;
    const title   = type === 'chain'    ? `⚡ Chain Window: ${ticker}` :
                    type === 'velocity' ? `🚀 Score Spike: ${ticker}` :
                    type === 'insider'  ? `👀 Insider Signal: ${ticker}` :
                                          `📈 Signal: ${ticker}`;
    const payload = JSON.stringify({ title, body: message || title, url, tag: ticker });
    const emails  = await kvSMem(kvUrl, kvToken, PUSH_ALL);
    let sent = 0, failed = 0;
    await Promise.all(emails.map(async (em) => {
      const subs = (await kvGet(kvUrl, kvToken, PUSH_KEY(em))) || [];
      for (const sub of subs) {
        try {
          const status = await sendPush(sub, payload, pubKey, privKey, vapidEmail);
          if (status >= 200 && status < 300) sent++;
          else { if (status === 410) await kvSet(kvUrl, kvToken, PUSH_KEY(em), subs.filter(s => s.endpoint !== sub.endpoint)); failed++; }
        } catch { failed++; }
      }
    }));
    return res.status(200).json({ ok: true, sent, failed, emails: emails.length });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' });
}
