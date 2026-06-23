// api/subscribe.js — Morning Brief email list management
// POST /api/subscribe            {email}            -> add to ti:subscribers
// GET  /api/subscribe?action=unsub&email=...&token=... -> remove from ti:subscribers
//
// The digest cron (api/digest.js) reads SMEMBERS ti:subscribers and emails each one.
// Requires env: KV_REST_API_URL + KV_REST_API_TOKEN (Upstash/Vercel KV; fallbacks accepted).

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url: kvUrl, token: kvToken } = kvEnv();

  // Unsubscribe (GET, from the link in the email footer)
  if (req.method === 'GET' && (req.query && req.query.action === 'unsub')) {
    const email = req.query.email ? decodeURIComponent(req.query.email) : '';
    if (email && kvUrl && kvToken) {
      await kvExec(kvUrl, kvToken, ['SREM', 'ti:subscribers', email.toLowerCase().trim()]);
    }
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send('<html><body style="font-family:-apple-system,sans-serif;padding:48px;text-align:center;color:#111"><h2 style="margin-bottom:8px;">You have been unsubscribed</h2><p style="color:#666">You will not receive the Morning Brief anymore.</p><a href="https://www.everythingisjustoneclickaway.com" style="color:#10b981;text-decoration:none;font-weight:600">Back to the app</a></body></html>');
  }

  // Subscribe (POST {email})
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; }
    } else if (!body) {
      try { const chunks = []; for await (const c of req) chunks.push(c); body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (e) { body = {}; }
    }
    const email = (body && body.email ? String(body.email) : '').trim();
    if (!email || !email.includes('@')) return res.status(400).json({ ok: false, error: 'Valid email required' });
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    await kvExec(kvUrl, kvToken, ['SADD', 'ti:subscribers', email.toLowerCase().trim()]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
