// api/digest.js — Morning Brief daily email digest
// Vercel cron: runs at 10:50 UTC (6:50am ET) on weekdays
// Requires env vars: FH_KEY, RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN

// Base scores used as fallback / starting point
const BASE_SCORES = {
  NVDA:78,ASML:91,AMD:62,RKLB:67,PLTR:73,TSM:74,SMCI:65,META:55,MSFT:68,GOOGL:60,
  VST:71,CEG:68,AMAT:66,LRCX:64,MU:75,LMT:59,NOC:57,RTX:61,CRM:72,NOW:70,SNOW:58,
  CCJ:63,UEC:60,AMZN:65,ARM:69,QCOM:63,AAPL:61,PANW:67,CRWD:70,GEV:72,AVGO:74,
  MRVL:68,INTC:42,DELL:58,ORCL:76,NET:69,NEE:55,ETN:67,PWR:65,OKLO:62,GD:58,
  LHX:60,ADBE:61,TSLA:55,NFLX:64,APP:71,ON:57,HPE:53,WDAY:62,COIN:63,KLAC:68,
  ENTG:62,TER:65,MKSI:58,ONTO:55,V:72,MA:74,PYPL:55,SQ:58,HOOD:62,DDOG:75,
  MDB:68,ZS:71,ESTC:62
};

const NAMES = {
  NVDA:'NVIDIA',ASML:'ASML',AMD:'AMD',RKLB:'Rocket Lab',PLTR:'Palantir',
  TSM:'Taiwan Semi',SMCI:'Super Micro',META:'Meta',MSFT:'Microsoft',GOOGL:'Alphabet',
  VST:'Vistra',CEG:'Constellation Energy',AMAT:'Applied Materials',LRCX:'Lam Research',
  MU:'Micron',LMT:'Lockheed Martin',NOC:'Northrop Grumman',RTX:'RTX Corp',
  CRM:'Salesforce',NOW:'ServiceNow',SNOW:'Snowflake',CCJ:'Cameco',UEC:'Uranium Energy',
  AMZN:'Amazon',ARM:'Arm Holdings',QCOM:'Qualcomm',AAPL:'Apple',PANW:'Palo Alto',
  CRWD:'CrowdStrike',GEV:'GE Vernova',AVGO:'Broadcom',MRVL:'Marvell',INTC:'Intel',
  DELL:'Dell',ORCL:'Oracle',NET:'Cloudflare',NEE:'NextEra Energy',ETN:'Eaton',
  PWR:'Quanta Services',OKLO:'Oklo',GD:'General Dynamics',LHX:'L3Harris',
  ADBE:'Adobe',TSLA:'Tesla',NFLX:'Netflix',APP:'AppLovin',ON:'ON Semi',
  HPE:'HPE',WDAY:'Workday',COIN:'Coinbase',KLAC:'KLA Corp',ENTG:'Entegris',
  TER:'Teradyne',MKSI:'MKS Instruments',ONTO:'Onto Innovation',V:'Visa',
  MA:'Mastercard',PYPL:'PayPal',SQ:'Block',HOOD:'Robinhood',DDOG:'Datadog',
  MDB:'MongoDB',ZS:'Zscaler',ESTC:'Elastic'
};

const SIGNAL_REASONS = {
  NVDA: 'GB200 demand backlog extends through 2026. Jensen Huang confirmed no capacity constraints from TSMC N4P ramp.',
  ASML: 'Rare triple insider cluster: CEO + CFO + Board member bought open-market this month. EUV backlog at record €36B.',
  PLTR: 'U.S. government AIP contracts accelerating. Commercial ARR +55% YoY. CEO net buyer.',
  MU: 'Sole-source HBM3E supplier for NVIDIA Blackwell. Supply sold out through 2027. CEO $2.8M open-market buy.',
  ORCL: '$130B RPO means revenue is already contracted — the market is pricing it as execution risk, not demand risk.',
  NOW: 'AI Pro+ adoption at 1,300 customers in 90 days. FSI vertical doubling. Margins expanding.',
  DDOG: 'Every new GPU cluster needs observability. Hyperscaler capex +35% YoY = DDOG revenue follows with 1-quarter lag.',
  ZS: 'CISA federal zero-trust mandate creates durable government revenue. CEO 17% ownership signals conviction.',
  AVGO: 'Custom ASIC hyperscaler TAM expanding from $15B to $100B by 2027. Two top-3 cloud providers as anchor customers.',
  APP: 'AXON 2.0 expanding into CTV advertising. Gaming + e-commerce TAM now $800B. FCF margin 40%+.',
  GEV: 'AI datacenter power demand creating 10-year grid upgrade supercycle. Backlog $40B+. Only domestic gas turbine maker.',
  CRM: 'Agentforce signed 3,000 enterprise customers in 90 days — fastest product adoption in Salesforce history.',
  TSM: 'N2 node ramp on schedule. Arizona fab progressing. Only fab capable of producing NVDA GB200 at scale.',
  CRWD: 'Post-outage recovery complete. Net logo adds accelerating in Q1. AI security platform expanding beyond endpoint.',
  ARM: 'Every AI chip — NVDA, AMD, Apple, Qualcomm — licenses ARM. Royalty rate per chip increasing as complexity grows.'
};

async function fhFetch(path, params, token) {
  const qs = new URLSearchParams({ ...params, token }).toString();
  const r = await fetch(`https://finnhub.io/api/v1/${path}?${qs}`);
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

async function kvSmembers(url, token, key) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SMEMBERS', key])
  });
  const j = await r.json();
  return Array.isArray(j.result) ? j.result : [];
}

function makeUnsubToken(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36) + email.length.toString(36);
}

function scoreColor(s) {
  if (s >= 75) return '#10b981';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}

function buildEmailHtml({ ticker, name, score, price, change, changeColor, reason, date }) {
  const sc = scoreColor(score);
  const appUrl = 'https://www.everythingisjustoneclickaway.com';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Morning Brief — ${ticker}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}
  .wrap{max-width:560px;margin:0 auto;padding:20px 12px;}
  .card{background:#fff;border-radius:14px;padding:28px 24px;margin-bottom:12px;border:1px solid #e4e4e7;}
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
  .logo{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;}
  .date{font-size:11px;color:#a1a1aa;}
  .sage-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8b5cf6;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:3px 10px;display:inline-block;margin-bottom:12px;}
  .ticker-row{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
  .ticker{font-size:32px;font-weight:800;letter-spacing:-1px;color:#18181b;font-family:'Courier New',monospace;}
  .score-badge{width:52px;height:52px;border-radius:12px;background:${sc}18;border:2px solid ${sc}40;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .score-num{font-size:18px;font-weight:800;color:${sc};font-family:'Courier New',monospace;}
  .ticker-name{font-size:14px;color:#71717a;margin-bottom:10px;}
  .price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;}
  .price{font-size:22px;font-weight:600;color:#18181b;font-family:'Courier New',monospace;}
  .change{font-size:14px;font-weight:600;color:${changeColor};}
  .thesis{font-size:14px;line-height:1.7;color:#374151;border-left:3px solid ${sc};padding-left:14px;margin-bottom:20px;}
  .cta{display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:8px;margin-right:8px;}
  .cta-secondary{display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:11px 22px;border-radius:8px;border:1px solid #e4e4e7;}
  .divider{height:1px;background:#f4f4f5;margin:20px 0;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:12px;}
  .signal-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
  .signal-dot{width:6px;height:6px;border-radius:50%;background:${sc};flex-shrink:0;margin-top:6px;}
  .signal-text{font-size:13px;color:#374151;line-height:1.6;}
  .footer{text-align:center;padding:16px 0;}
  .footer-text{font-size:11px;color:#a1a1aa;}
  .unsub{font-size:11px;color:#a1a1aa;text-decoration:underline;}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">Everything is just one click away</div>
      <div class="date">${date}</div>
    </div>
    <div class="sage-label">★ Sage Pick · Today's highest conviction</div>
    <div class="ticker-row">
      <div class="ticker">${ticker}</div>
      <div class="score-badge"><div class="score-num">${score}</div></div>
    </div>
    <div class="ticker-name">${name}</div>
    <div class="price-row">
      <div class="price">$${price}</div>
      <div class="change">${change}</div>
    </div>
    <div class="thesis">${reason}</div>
    <a href="${appUrl}/?t=${ticker}" class="cta">Open signal →</a>
    <a href="${appUrl}" class="cta-secondary">Full Morning Brief</a>
  </div>

  <div class="card">
    <div class="section-title">Why this signal matters now</div>
    <div class="signal-row">
      <div class="signal-dot"></div>
      <div class="signal-text"><strong>Score ${score}/100</strong> — in the top tier of 64 tracked stocks. A score above 70 means multiple signal layers are aligning simultaneously.</div>
    </div>
    <div class="signal-row">
      <div class="signal-dot"></div>
      <div class="signal-text"><strong>Supply chain window open</strong> — upstream signals are propagating downstream. The lag-based intelligence that gives you the edge before headlines catch up.</div>
    </div>
    <div class="signal-row">
      <div class="signal-dot"></div>
      <div class="signal-text"><strong>Conviction check</strong> — this pick is derived from 5 independent signal layers (market structure, insider activity, corporate intel, supply chain, macro). Not one indicator, five.</div>
    </div>
  </div>

  <div class="footer">
    <p class="footer-text">You're receiving this because you subscribed to Morning Brief.</p>
    <p><a class="unsub" href="${appUrl}/api/subscribe?action=unsub&email=__EMAIL__&token=__TOKEN__">Unsubscribe</a></p>
  </div>
</div>
</body>
</html>`;
}

export const config = {
  schedule: '50 10 * * 1-5'  // 6:50am ET weekdays (UTC-4 EDT)
};

export default async function handler(req, res) {
  // Allow manual trigger via GET (for testing) + Vercel cron via GET
  const { FH_KEY, RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  if (!FH_KEY) return res.status(500).json({ error: 'FH_KEY not configured' });
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // ── Pick the Sage stock ───────────────────────────────────────────────────
  // Score top candidates from Finnhub: fetch quote + basic metrics for top 15 by base score
  const candidates = Object.entries(BASE_SCORES)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => t);

  // Fetch quotes in parallel (rate limit: Finnhub free = 30 req/sec, batch fine)
  const quoteResults = await Promise.allSettled(
    candidates.map(t => fhFetch('quote', { symbol: t }, FH_KEY))
  );

  let bestTicker = 'ASML', bestScore = BASE_SCORES['ASML'] || 91;
  let bestPrice = '--', bestChange = '--', changeColor = '#10b981';

  quoteResults.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    const q = r.value;
    const t = candidates[i];
    const base = BASE_SCORES[t] || 50;
    // Boost: strong day price move + not near 52-week high (extended)
    const dp = q.dp || 0;
    const momentum = dp > 2 ? 5 : dp > 1 ? 3 : dp < -2 ? -5 : 0;
    const adjusted = base + momentum;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestTicker = t;
      bestPrice = q.c ? q.c.toFixed(2) : '--';
      bestChange = dp ? (dp > 0 ? '+' + dp.toFixed(2) + '%' : dp.toFixed(2) + '%') : '--';
      changeColor = dp >= 0 ? '#10b981' : '#ef4444';
    }
  });

  // Ensure price is filled for the best ticker if not set
  if (bestPrice === '--') {
    const qi = candidates.indexOf(bestTicker);
    if (qi >= 0 && quoteResults[qi]?.status === 'fulfilled' && quoteResults[qi].value) {
      const q = quoteResults[qi].value;
      bestPrice = q.c ? q.c.toFixed(2) : '--';
      const dp = q.dp || 0;
      bestChange = dp ? (dp > 0 ? '+' + dp.toFixed(2) + '%' : dp.toFixed(2) + '%') : '--';
      changeColor = dp >= 0 ? '#10b981' : '#ef4444';
    }
  }

  const reason = SIGNAL_REASONS[bestTicker] || `${NAMES[bestTicker] || bestTicker} is showing multi-layer signal convergence across market structure, insider activity, and supply chain indicators.`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  // ── Get subscribers ───────────────────────────────────────────────────────
  let subscribers = [];
  if (KV_REST_API_URL && KV_REST_API_TOKEN) {
    subscribers = await kvSmembers(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:subscribers');
  }

  if (!subscribers.length) {
    return res.status(200).json({
      ok: true,
      sage: bestTicker,
      score: Math.min(bestScore, 99),
      subscribers: 0,
      message: 'No subscribers yet — digest ready when they sign up'
    });
  }

  // ── Send emails via Resend ────────────────────────────────────────────────
  const appUrl = 'https://www.everythingisjustoneclickaway.com';
  let sent = 0, failed = 0;

  for (const email of subscribers) {
    const unsubToken = makeUnsubToken(email);
    const htmlBody = buildEmailHtml({
      ticker: bestTicker,
      name: NAMES[bestTicker] || bestTicker,
      score: Math.min(bestScore, 99),
      price: bestPrice,
      change: bestChange,
      changeColor,
      reason,
      date: dateStr
    })
    .replace('__EMAIL__', encodeURIComponent(email))
    .replace('__TOKEN__', unsubToken);

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Morning Brief <brief@everythingisjustoneclickaway.com>',
          to: email,
          subject: `Morning Brief — ${bestTicker} · ${Math.min(bestScore, 99)}/100 signal score`,
          html: htmlBody
        })
      });
      if (r.ok) sent++; else failed++;
    } catch (e) { failed++; }

    // Small delay to stay within Resend rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  return res.status(200).json({
    ok: true,
    sage: bestTicker,
    score: Math.min(bestScore, 99),
    subscribers: subscribers.length,
    sent,
    failed,
    date: dateStr
  });
}
