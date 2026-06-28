// api/subscribe.js — Morning Brief email list management
// POST /api/subscribe            {email}            -> add to ti:subscribers (+ Resend Audience)
// GET  /api/subscribe?action=unsub&email=...        -> remove from ti:subscribers (+ Resend Audience)
// GET  /api/subscribe?action=backfill               -> push all current KV subscribers into the Resend Audience
//
// KV is the source of truth for the automated digest (api/digest.js reads SMEMBERS ti:subscribers).
// The Resend Audience mirror lets you send manual newsletters from Resend > Broadcasts.
// Requires env: KV_REST_API_URL + KV_REST_API_TOKEN (fallbacks accepted), RESEND_API_KEY (optional — sync is best-effort).

function kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN;
  return { url, token };
}

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

// ── Resend Audience sync (best-effort) ───────────────────────────────────────
const RESEND_BASE = 'https://api.resend.com';
async function resendFetch(apiKey, path, method, body) {
  try {
    const r = await fetch(RESEND_BASE + path, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(6000)
    });
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}
async function getAudienceId(apiKey) {
  const list = await resendFetch(apiKey, '/audiences', 'GET');
  if (list && Array.isArray(list.data) && list.data.length) return list.data[0].id;
  const created = await resendFetch(apiKey, '/audiences', 'POST', { name: 'Morning Brief' });
  return (created && (created.id || (created.data && created.data.id))) || null;
}
async function audienceAdd(apiKey, email) {
  if (!apiKey) return;
  const id = await getAudienceId(apiKey); if (!id) return;
  await resendFetch(apiKey, `/audiences/${id}/contacts`, 'POST', { email, unsubscribed: false });
}
async function audienceRemove(apiKey, email) {
  if (!apiKey) return;
  const id = await getAudienceId(apiKey); if (!id) return;
  await resendFetch(apiKey, `/audiences/${id}/contacts/${encodeURIComponent(email)}`, 'DELETE');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url: kvUrl, token: kvToken } = kvEnv();
  const resendKey = process.env.RESEND_API_KEY;

  // ── Backfill: push every KV subscriber into the Resend Audience ────────────
  if (req.method === 'GET' && req.query && req.query.action === 'backfill') {
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    if (!resendKey) return res.status(200).json({ ok: false, reason: 'RESEND_API_KEY not configured' });
    const members = await kvExec(kvUrl, kvToken, ['SMEMBERS', 'ti:subscribers']);
    const list = Array.isArray(members) ? members : [];
    const id = await getAudienceId(resendKey);
    if (!id) return res.status(200).json({ ok: false, reason: 'no audience' });
    let synced = 0;
    for (const email of list) {
      const r = await resendFetch(resendKey, `/audiences/${id}/contacts`, 'POST', { email, unsubscribed: false });
      if (r) synced++;
    }
    return res.status(200).json({ ok: true, audienceId: id, subscribers: list.length, synced });
  }

  // ── Check (read-only): is an email subscribed + total list size ────────────
  if (req.method === 'GET' && req.query && req.query.action === 'check') {
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    const email = req.query.email ? decodeURIComponent(req.query.email).toLowerCase().trim() : '';
    const total = await kvExec(kvUrl, kvToken, ['SCARD', 'ti:subscribers']);
    const isMember = email ? await kvExec(kvUrl, kvToken, ['SISMEMBER', 'ti:subscribers', email]) : null;
    return res.status(200).json({ ok: true, email, subscribed: isMember === 1, total: total || 0 });
  }

  // ── Unsubscribe (GET, from the link in the email footer) ───────────────────
  if (req.method === 'GET' && req.query && req.query.action === 'unsub') {
    const email = req.query.email ? decodeURIComponent(req.query.email) : '';
    if (email && kvUrl && kvToken) {
      await kvExec(kvUrl, kvToken, ['SREM', 'ti:subscribers', email.toLowerCase().trim()]);
      try { await audienceRemove(resendKey, email.toLowerCase().trim()); } catch (e) {}
    }
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send('<html><body style="font-family:-apple-system,sans-serif;padding:48px;text-align:center;color:#111"><h2 style="margin-bottom:8px;">You have been unsubscribed</h2><p style="color:#666">You will not receive the Morning Brief anymore.</p><a href="https://www.everythingisjustoneclickaway.com" style="color:#10b981;text-decoration:none;font-weight:600">Back to the app</a></body></html>');
  }

  // ── Subscribe (POST {email}) ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; }
    } else if (!body) {
      try { const chunks = []; for await (const c of req) chunks.push(c); body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (e) { body = {}; }
    }
    const email = (body && body.email ? String(body.email) : '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ ok: false, error: 'Valid email required' });
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    await kvExec(kvUrl, kvToken, ['SADD', 'ti:subscribers', email]);
    try { await audienceAdd(resendKey, email); } catch (e) {}
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
