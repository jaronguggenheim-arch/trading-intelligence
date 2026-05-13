// api/push.js — Web Push subscription management + notification delivery
// Implements VAPID + AES-128-GCM message encryption using Node 18 built-in crypto only.
// No npm dependencies required.
//
// POST /api/push  {action:'subscribe', subscription, email}  → store subscription
// POST /api/push  {action:'send', ticker, type, message, url} → send push to all subscribers
// GET  /api/push  {action:'vapid-public'}                    → return public key
//
// Env vars (set in Vercel dashboard):
//   VAPID_PUBLIC_KEY   — base64url uncompressed EC P-256 public key (65 bytes)
//   VAPID_PRIVATE_KEY  — base64url raw EC P-256 private key (32 bytes)
//   VAPID_EMAIL        — mailto:your@email.com
//   KV_REST_API_URL, KV_REST_API_TOKEN

import crypto from 'node:crypto';

// ── Helpers ────────────────────────────────────────────────────────────────────
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const b64uDecode = (s) => Buffer.from(s, 'base64url');
const PUSH_KEY = (e) => `ti:push:${e.toLowerCase().trim()}`;
const PUSH_ALL  = 'ti:push:all';

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
const kvSMem = async (u,t,k) => { const r = await kvExec(u,t,['SMEMBERS',k]); return Array.isArray(r) ? r : []; };

// ── VAPID JWT (ES256) ─────────────────────────────────────────────────────────
// Uses Node crypto createSign with ECDSA — converts DER sig to IEEE P1363 for JWT
function makeVapidJwt(audience, subject, privKeyB64u) {
  const privKeyDer = Buffer.concat([
    Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420','hex'),
    b64uDecode(privKeyB64u),
    Buffer.from('a144034200','hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000','hex').slice(0,65)
  ]);
  // Simpler approach: use subtle crypto via globalThis
  // Fall back to minimal JWT without signature verification (development mode)
  // For production, use the Web Crypto approach below
  const header  = Buffer.from(JSON.stringify({typ:'JWT',alg:'ES256'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: subject
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;

  // Create DER-format ECDSA key and sign
  const privKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('308193020100301306072a8648ce3d020106082a8648ce3d030107047930770201010420','hex'),
      b64uDecode(privKeyB64u),
      Buffer.from('a00a06082a8648ce3d030107a144034200','hex'),
      // placeholder public key (not needed for signing)
      Buffer.alloc(65, 0)
    ]),
    format: 'der',
    type: 'pkcs8'
  });

  const sign = crypto.createSign('SHA256');
  sign.update(unsigned);
  const derSig = sign.sign(privKey);

  // Convert DER ECDSA signature to raw r||s (IEEE P1363) for JWT
  // DER: 30 len 02 rlen r 02 slen s
  let offset = 2; // skip 30 and total length
  const rLen = derSig[offset + 1];
  const r = derSig.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  const sLen = derSig[offset + 1];
  const s = derSig.slice(offset + 2, offset + 2 + sLen);

  // Pad r and s to 32 bytes each
  const rPad = Buffer.concat([Buffer.alloc(Math.max(0, 32 - r.length)), r.slice(Math.max(0, r.length - 32))]);
  const sPad = Buffer.concat([Buffer.alloc(Math.max(0, 32 - s.length)), s.slice(Math.max(0, s.length - 32))]);
  const sig = Buffer.concat([rPad, sPad]).toString('base64url');
  return `${unsigned}.${sig}`;
}

// ── Send a push notification to one subscription ──────────────────────────────
async function sendPush(subscription, payload, pubKeyB64u, privKeyB64u, email) {
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const jwt  = makeVapidJwt(audience, `mailto:${email || 'jaronguggenheim@gmail.com'}`, privKeyB64u);
  const auth = `vapid t=${jwt},k=${pubKeyB64u}`;

  // Encrypt the payload using RFC 8291 (aesgcm / aes128gcm)
  // For now send unencrypted with content-encoding: aes128gcm
  // Full encryption implementation omitted for brevity — use payload directly
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const bodyBuf = Buffer.from(body);

  // Generate salt + server keypair for encryption
  const salt = crypto.randomBytes(16);
  const serverKey = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const serverPubRaw = serverKey.publicKey.export({ type: 'spki', format: 'der' }).slice(26); // 65 bytes

  // Client auth secret and public key from subscription
  const clientPubRaw = b64uDecode(subscription.keys?.p256dh || '');
  const authSecret   = b64uDecode(subscription.keys?.auth   || '');

  // ECDH shared secret
  const sharedSecret = crypto.diffieHellman({
    privateKey: serverKey.privateKey,
    publicKey:  crypto.createPublicKey({
      key: Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200','hex'), clientPubRaw]),
      format: 'der', type: 'spki'
    })
  });

  // HKDF-SHA256 PRK = HMAC-SHA256(auth_secret, shared_secret)
  const prk = crypto.createHmac('sha256', authSecret).update(sharedSecret).digest();

  // context = 'P-256\0' + len(client_pub) + client_pub + len(server_pub) + server_pub
  const ctx = Buffer.concat([
    Buffer.from('P-256\0'), Buffer.from([0, 65]), clientPubRaw, Buffer.from([0, 65]), serverPubRaw
  ]);

  // content-encryption key: HKDF(prk, salt, 'Content-Encoding: aesgcm\0' + ctx, 16)
  const aesgcmInfo = Buffer.concat([Buffer.from('Content-Encoding: aesgcm\0'), ctx]);
  const nonceInfo  = Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), ctx]);

  const hkdfExpand = (prk, info, len) => {
    const blocks = [];
    let t = Buffer.alloc(0);
    for (let i = 1; blocks.reduce((s,b) => s + b.length, 0) < len; i++) {
      t = crypto.createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([i])])).digest();
      blocks.push(t);
    }
    return Buffer.concat(blocks).slice(0, len);
  };
  const saltHkdf = crypto.createHmac('sha256', salt).update(prk).digest();
  const cek   = hkdfExpand(saltHkdf, aesgcmInfo, 16);
  const nonce = hkdfExpand(saltHkdf, nonceInfo,  12);

  // AES-128-GCM encrypt
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  // Add padding: 2-byte length prefix of 0 (no padding)
  const padded = Buffer.concat([Buffer.from([0, 0]), bodyBuf]);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':      auth,
      'TTL':                '86400',
      'Content-Type':       'application/octet-stream',
      'Content-Encoding':   'aesgcm',
      'Encryption':         `salt=${salt.toString('base64url')}`,
      'Crypto-Key':         `dh=${b64u(serverPubRaw)};p256ecdsa=${pubKeyB64u}`,
      'Content-Length':     String(encrypted.length)
    },
    body: encrypted,
    signal: AbortSignal.timeout(10000)
  });
  return response.status;
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
    VAPID_EMAIL:       vapidEmail = 'jaronguggenheim@gmail.com',
    KV_REST_API_URL:   kvUrl,
    KV_REST_API_TOKEN: kvToken
  } = process.env;

  if (req.method === 'GET') {
    if (req.query?.action === 'vapid-public')
      return res.status(200).json({ ok: true, publicKey: pubKey || '' });
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  }

  if (req.method !== 'POST') return res.status(405).end();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { action } = body || {};

  // ── subscribe ────────────────────────────────────────────────────────────────
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

  // ── send (called by cron) ─────────────────────────────────────────────────
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
    await Promise.all(emails.map(async (email) => {
      const subs = (await kvGet(kvUrl, kvToken, PUSH_KEY(email))) || [];
      for (const sub of subs) {
        try {
          const status = await sendPush(sub, payload, pubKey, privKey, vapidEmail);
          if (status >= 200 && status < 300) { sent++; }
          else if (status === 410) {
            // Subscription expired — clean up
            const updated = subs.filter(s => s.endpoint !== sub.endpoint);
            await kvSet(kvUrl, kvToken, PUSH_KEY(email), updated);
            failed++;
          } else { failed++; }
        } catch { failed++; }
      }
    }));
    return res.status(200).json({ ok: true, sent, failed, emails: emails.length });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' });
}
