// api/subscribe.js — register email for Morning Brief digest
// POST /api/subscribe  body: {email}  → adds to KV subscriber set
// GET  /api/subscribe?action=unsub&email=...&token=...  → removes subscriber

function makeUnsubToken(email) {
  // Simple deterministic token from email — good enough for an unsubscribe link
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36) + email.length.toString(36);
}

async function kvSadd(url, token, key, member) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SADD', key, member])
  });
  return r.ok;
}

async function kvSrem(url, token, key, member) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SREM', key, member])
  });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(200).json({ ok: false, reason: 'KV not configured' });
  }

  // Unsubscribe via GET link in email footer
  if (req.method === 'GET' && req.query.action === 'unsub') {
    const { email, token: tok } = req.query;
    if (!email || !tok) return res.status(400).send('Missing params');
    if (tok !== makeUnsubToken(decodeURIComponent(email))) {
      return res.status(403).send('Invalid token');
    }
    await kvSrem(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:subscribers', decodeURIComponent(email));
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#111">
        <h2>You've been unsubscribed</h2>
        <p>You won't receive the Morning Brief anymore.</p>
        <a href="https://www.everythingisjustoneclickaway.com" style="color:#10b981">Back to app</a>
      </body></html>
    `);
  }

  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const normalised = email.toLowerCase().trim();
    await kvSadd(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:subscribers', normalised);
    return res.status(200).json({ ok: true, email: normalised });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
