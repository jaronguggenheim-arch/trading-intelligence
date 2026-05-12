// api/alerts.js — Server-side alert management + triggered-alert check
// GET  /api/alerts?email=x                  → list alerts for user
// POST /api/alerts  {email, ticker, threshold, type}  → set/update alert
// DELETE /api/alerts?email=x&ticker=y       → remove alert
// GET  /api/alerts?action=check&email=x     → check alerts vs latest scores, return triggered
//
// Requires env vars: KV_REST_API_URL, KV_REST_API_TOKEN
// Alerts stored in KV under key: ti:alerts:{email}
// Each alert: { ticker, threshold, type, createdAt, lastTriggeredAt }

const MAX_ALERTS_PER_USER = 20;

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

function alertsKey(email) {
  return `ti:alerts:${email.toLowerCase().trim()}`;
}

function normaliseEmail(raw) {
  return (raw || '').toLowerCase().trim().replace(/[^a-z0-9@._+-]/g, '');
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { KV_REST_API_URL: kvUrl, KV_REST_API_TOKEN: kvToken } = process.env;
  if (!kvUrl || !kvToken) {
    return res.status(500).json({ ok: false, error: 'KV not configured' });
  }

  // ── GET: list alerts OR check triggered ────────────────────────────────────
  if (req.method === 'GET') {
    const email = normaliseEmail(req.query?.email || '');
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });

    const alerts = (await kvGet(kvUrl, kvToken, alertsKey(email))) || {};

    // ?action=check — compare against latest scores, return triggered alerts
    if (req.query?.action === 'check') {
      const latest = await kvGet(kvUrl, kvToken, 'ti:scores:latest');
      const scores = latest?.scores || {};
      const triggered = [];

      for (const [ticker, alert] of Object.entries(alerts)) {
        const score = scores[ticker];
        if (score == null) continue;

        const { threshold = 75, type = 'above' } = alert;
        const fired = type === 'above' ? score >= threshold : score <= threshold;
        if (!fired) continue;

        // Don't re-trigger same alert within 24h
        const lastTrig = alert.lastTriggeredAt || 0;
        if (Date.now() - lastTrig < 24 * 60 * 60 * 1000) continue;

        triggered.push({ ticker, score, threshold, type });

        // Update lastTriggeredAt
        alerts[ticker] = { ...alert, lastTriggeredAt: Date.now() };
      }

      if (triggered.length) {
        await kvSet(kvUrl, kvToken, alertsKey(email), alerts);
      }

      return res.status(200).json({ ok: true, triggered, total: Object.keys(alerts).length });
    }

    return res.status(200).json({ ok: true, alerts, count: Object.keys(alerts).length });
  }

  // ── POST: create/update alert ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body = {};
    try {
      const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => data += c);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      body = JSON.parse(raw || '{}');
    } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON body' }); }

    const email = normaliseEmail(body.email || '');
    const ticker = (body.ticker || '').toUpperCase().trim();
    const threshold = Number(body.threshold) || 75;
    const type = body.type === 'below' ? 'below' : 'above';

    if (!email) return res.status(400).json({ ok: false, error: 'email required' });
    if (!ticker) return res.status(400).json({ ok: false, error: 'ticker required' });

    const alerts = (await kvGet(kvUrl, kvToken, alertsKey(email))) || {};

    if (!alerts[ticker] && Object.keys(alerts).length >= MAX_ALERTS_PER_USER) {
      return res.status(400).json({ ok: false, error: `Max ${MAX_ALERTS_PER_USER} alerts per account` });
    }

    alerts[ticker] = { threshold, type, createdAt: alerts[ticker]?.createdAt || Date.now(), updatedAt: Date.now() };
    await kvSet(kvUrl, kvToken, alertsKey(email), alerts);

    return res.status(200).json({ ok: true, ticker, threshold, type, count: Object.keys(alerts).length });
  }

  // ── DELETE: remove alert ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const email = normaliseEmail(req.query?.email || '');
    const ticker = (req.query?.ticker || '').toUpperCase().trim();

    if (!email) return res.status(400).json({ ok: false, error: 'email required' });
    if (!ticker) return res.status(400).json({ ok: false, error: 'ticker required' });

    const alerts = (await kvGet(kvUrl, kvToken, alertsKey(email))) || {};
    const existed = !!alerts[ticker];
    delete alerts[ticker];
    await kvSet(kvUrl, kvToken, alertsKey(email), alerts);

    return res.status(200).json({ ok: true, removed: existed, remaining: Object.keys(alerts).length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
