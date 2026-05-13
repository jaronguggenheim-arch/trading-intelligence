// api/push.js — Web Push subscription management + notification delivery
// POST /api/push  {action:'subscribe', subscription, email}
// POST /api/push  {action:'send', ticker, type, message, url}   (internal, cron use)
// GET  /api/push  {action:'vapid-public'}                       → return public key
//
// Env vars needed (set in Vercel dashboard):
//   VAPID_PUBLIC_KEY   — base64url EC P-256 public key
//   VAPID_PRIVATE_KEY  — base64url EC P-256 private key
//   VAPID_EMAIL        — mailto:your@email.com
//   KV_REST_API_URL, KV_REST_API_TOKEN

import webpush from 'web-push';

const PUSH_KEY = (email) => `ti:push:${email.toLowerCase().trim()}`;
const PUSH_ALL_KEY = 'ti:push:all';  // set of emails with active subscriptions

// ── KV helpers ─────────────────────────────────────────────────────────────────
async function kvExec(url, token, cmd) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(6000)
    });
    const j = await r.json();
    return j.result ?? null;
  } catch (e) { return null; }
}

async function kvGet(url, token, key) {
  const raw = await kvExec(url, token, ['GET', key]);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function kvSet(url, token, key, value) {
  return kvExec(url, token, ['SET', key, JSON.stringify(value)]);
}

async function kvSAdd(url, token, key, ...members) {
  return kvExec(url, token, ['SADD', key, ...members]);
}

async function kvSMembers(url, token, key) {
  const r = await kvExec(url, token, ['SMEMBERS', key]);
  return Array.isArray(r) ? r : [];
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

  // ── GET: return public VAPID key ────────────────────────────────────────────
  if (req.method === 'GET') {
    const action = req.query?.action;
    if (action === 'vapid-public') {
      return res.status(200).json({ ok: true, publicKey: pubKey || '' });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }

  const { action } = body || {};

  // ── POST subscribe ──────────────────────────────────────────────────────────
  if (action === 'subscribe') {
    if (!kvUrl || !kvToken) return res.status(500).json({ ok: false, error: 'KV not configured' });

    const { subscription, email = 'anon' } = body;
    if (!subscription?.endpoint) return res.status(400).json({ ok: false, error: 'subscription required' });

    const key = PUSH_KEY(email);
    const existing = (await kvGet(kvUrl, kvToken, key)) || [];
    // Deduplicate by endpoint
    const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
    filtered.push({ ...subscription, createdAt: Date.now() });
    // Keep max 5 devices per email
    const pruned = filtered.slice(-5);

    await kvSet(kvUrl, kvToken, key, pruned);
    await kvSAdd(kvUrl, kvToken, PUSH_ALL_KEY, email);

    return res.status(200).json({ ok: true, devices: pruned.length });
  }

  // ── POST send (internal, called by scores/digest cron) ────────────────────
  if (action === 'send') {
    if (!pubKey || !privKey) return res.status(500).json({ ok: false, error: 'VAPID not configured' });
    if (!kvUrl || !kvToken)  return res.status(500).json({ ok: false, error: 'KV not configured' });

    webpush.setVapidDetails(vapidEmail, pubKey, privKey);

    const { ticker, type = 'chain', message, url = '/' } = body;
    const title = type === 'chain'    ? `⚡ Chain Window: ${ticker}` :
                  type === 'velocity' ? `🚀 Score Spike: ${ticker}` :
                  type === 'insider'  ? `👀 Insider Signal: ${ticker}` :
                                        `📊 Signal: ${ticker}`;
    const notifPayload = JSON.stringify({ title, body: message || title, url, tag: ticker });

    // Broadcast to all subscribed users
    const emails = await kvSMembers(kvUrl, kvToken, PUSH_ALL_KEY);
    let sent = 0, failed = 0;

    await Promise.all(emails.map(async (email) => {
      const subs = (await kvGet(kvUrl, kvToken, PUSH_KEY(email))) || [];
      await Promise.all(subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, notifPayload, { TTL: 86400 });
          sent++;
        } catch (err) {
          failed++;
          // 410 Gone = subscription expired, clean it up
          if (err.statusCode === 410) {
            const updated = subs.filter(s => s.endpoint !== sub.endpoint);
            await kvSet(kvUrl, kvToken, PUSH_KEY(email), updated);
          }
        }
      }));
    }));

    return res.status(200).json({ ok: true, sent, failed, emails: emails.length });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' });
}
