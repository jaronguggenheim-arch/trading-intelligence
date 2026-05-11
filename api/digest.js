// api/digest.js — Morning Brief daily email digest
// Vercel cron: runs at 10:50 UTC (6:50am ET) on weekdays
// Requires env vars: FH_KEY, RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN

// ── Tracked stocks (top 40 by base score — candidates for Sage pick) ─────────
const BASE_SCORES = {
  NVDA:78,ASML:91,AMD:62,RKLB:67,PLTR:73,TSM:74,SMCI:65,AVGO:74,
  MU:75,ORCL:76,DDOG:75,ZS:71,APP:71,GEV:72,CRM:72,V:72,MA:74,
  NOW:70,CRWD:70,NET:69,ARM:69,AMAT:66,LRCX:64,ETN:67,PWR:65,
  KLAC:68,MRVL:68,MDB:68,MSFT:68,PANW:67,VST:71,
  CEG:68,LMT:59,NOC:57,RTX:61,SNOW:58,AMZN:65,GOOGL:60
};

const NAMES = {
  NVDA:'NVIDIA',ASML:'ASML Holding',AMD:'AMD',RKLB:'Rocket Lab',PLTR:'Palantir',
  TSM:'Taiwan Semi',SMCI:'Super Micro',META:'Meta',MSFT:'Microsoft',GOOGL:'Alphabet',
  VST:'Vistra',CEG:'Constellation Energy',AMAT:'Applied Materials',LRCX:'Lam Research',
  MU:'Micron',LMT:'Lockheed Martin',NOC:'Northrop Grumman',RTX:'RTX Corp',
  CRM:'Salesforce',NOW:'ServiceNow',SNOW:'Snowflake',CCJ:'Cameco',UEC:'Uranium Energy',
  AMZN:'Amazon',ARM:'Arm Holdings',QCOM:'Qualcomm',AAPL:'Apple',PANW:'Palo Alto Networks',
  CRWD:'CrowdStrike',GEV:'GE Vernova',AVGO:'Broadcom',MRVL:'Marvell',INTC:'Intel',
  DELL:'Dell',ORCL:'Oracle',NET:'Cloudflare',NEE:'NextEra Energy',ETN:'Eaton',
  PWR:'Quanta Services',OKLO:'Oklo',GD:'General Dynamics',LHX:'L3Harris',
  ADBE:'Adobe',TSLA:'Tesla',NFLX:'Netflix',APP:'AppLovin',ON:'ON Semi',
  HPE:'HPE',WDAY:'Workday',COIN:'Coinbase',KLAC:'KLA Corp',ENTG:'Entegris',
  TER:'Teradyne',MKSI:'MKS Instruments',ONTO:'Onto Innovation',V:'Visa',
  MA:'Mastercard',PYPL:'PayPal',SQ:'Block',HOOD:'Robinhood',DDOG:'Datadog',
  MDB:'MongoDB',ZS:'Zscaler',ESTC:'Elastic',AXON:'Axon Enterprise'
};

// ── Supply chain link table ───────────────────────────────────────────────────
// [source, target, lag, description]
// source move/beat → target enters the lag window
const CHAIN_LINKS = [
  ['TSM',   'ASML', '8–12w',  'TSM capex increase signals ASML order intake'],
  ['TSM',   'NVDA', '2–4w',   'TSM fab output directly enables NVDA GPU delivery'],
  ['TSM',   'AMD',  '2–4w',   'TSM fab capacity drives AMD chip availability'],
  ['TSM',   'AMAT', '2–3q',   'TSM node ramp drives Applied Materials equipment spend'],
  ['TSM',   'LRCX', '2–3q',   'TSM capacity expansion drives Lam Research etch tools'],
  ['TSM',   'KLAC', '2–3q',   'TSM process control demand drives KLA metrology'],
  ['NVDA',  'SMCI', '2–4w',   'NVDA datacenter beat → Super Micro server builds accelerate'],
  ['NVDA',  'MU',   '4–8w',   'NVDA AI demand → Micron HBM order acceleration'],
  ['NVDA',  'DDOG', '1–2q',   'AI inference workloads on NVDA chips → Datadog monitoring growth'],
  ['NVDA',  'ORCL', '1–2q',   'NVDA GPU buildout → Oracle cloud AI infrastructure'],
  ['NVDA',  'NET',  '1–2q',   'AI edge compute growth → Cloudflare traffic expansion'],
  ['NVDA',  'SNOW', '1–3q',   'AI workload growth → Snowflake query volumes'],
  ['NVDA',  'CRM',  '1–3q',   'AI spend → Salesforce Einstein AI adoption'],
  ['NVDA',  'CRWD', '1–2q',   'AI-powered endpoint expansion → CrowdStrike ARR'],
  ['NVDA',  'PANW', '1–2q',   'AI security spend → Palo Alto platform consolidation'],
  ['META',  'AVGO', '2–3q',   'META custom ASIC orders → Broadcom networking revenue'],
  ['META',  'MRVL', '2–3q',   'Hyperscaler silicon demand → Marvell design wins'],
  ['MSFT',  'GEV',  '2–4q',   'Datacenter buildout → GE Vernova turbine orders'],
  ['MSFT',  'ETN',  '2–4q',   'AI datacenter power demand → Eaton electrical equipment'],
  ['MSFT',  'PWR',  '2–4q',   'Datacenter expansion → Quanta Services grid infrastructure'],
  ['MSFT',  'VST',  '1–2q',   'AI power demand → Vistra nuclear/gas generation'],
  ['MSFT',  'CEG',  '1–2q',   'AI power demand → Constellation Energy nuclear capacity'],
  ['MSFT',  'ORCL', '1–2q',   'Azure + AI growth → Oracle cloud migration contracts'],
  ['GOOGL', 'NVDA', '1–2q',   'Alphabet TPU + GPU capex → NVDA datacenter orders'],
  ['AMZN',  'NVDA', '1–2q',   'AWS AI buildout → NVDA GPU procurement'],
  ['AMAT',  'TSM',  '1–3q',   'Applied Materials deposition tool shipments → TSM node ramp confirmation'],
  ['LRCX',  'TSM',  '1–3q',   'Lam Research etch tool orders → TSM capacity expansion signal'],
  ['MU',    'NVDA', '2–4w',   'Micron HBM availability enables NVDA H100/B200 shipments'],
  ['AVGO',  'META', '2–3q',   'Broadcom ASIC revenue → META custom silicon ramp confirmation'],
  ['ORCL',  'NVDA', '1–2q',   'Oracle GPU cluster buildout → NVDA large-order demand signal'],
  ['NOW',   'CRM',  '1–2q',   'ServiceNow AI workflow adoption mirrors Salesforce enterprise spend'],
  ['ARM',   'NVDA', '1–2q',   'ARM IP licensing in AI chips corroborates NVDA roadmap'],
  ['KLAC',  'TSM',  '1–2q',   'KLA metrology shipments confirm TSM yield improvement ramp'],
  ['ENTG',  'TSM',  '1–2q',   'Entegris materials supply confirms TSM advanced node ramp'],
];

// ── Chain context lookup ──────────────────────────────────────────────────────
// Returns a plain-English reason string, or null if no relationship found
function getChainContext(moverTicker, sageTicker) {
  // Case 1: sage is upstream of mover (sage move activates mover's lag window)
  const sageToMover = CHAIN_LINKS.find(([src, tgt]) => src === sageTicker && tgt === moverTicker);
  if (sageToMover) {
    return `${NAMES[sageTicker] || sageTicker} move activates ${sageToMover[2]} lag window — ${sageToMover[3]}.`;
  }
  // Case 2: mover is upstream of sage (mover is a leading indicator for sage)
  const moverToSage = CHAIN_LINKS.find(([src, tgt]) => src === moverTicker && tgt === sageTicker);
  if (moverToSage) {
    return `Upstream of ${NAMES[sageTicker] || sageTicker} — ${moverToSage[3]} (${moverToSage[2]} lead time).`;
  }
  // Case 3: shared upstream anchor (both downstream of same signal source)
  const sageUpstreams = CHAIN_LINKS.filter(([, tgt]) => tgt === sageTicker).map(([src]) => src);
  const moverUpstreams = CHAIN_LINKS.filter(([, tgt]) => tgt === moverTicker).map(([src]) => src);
  const shared = sageUpstreams.find(s => moverUpstreams.includes(s));
  if (shared) {
    return `Shares ${NAMES[shared] || shared} supply chain exposure with ${sageTicker} — same upstream signal.`;
  }
  return null;
}

// ── Analyst keywords for signal detection ────────────────────────────────────
const UPGRADE_KW = [
  'raises price target','raised price target','upgrades','upgrade','initiated',
  'outperform','buy rating','strong buy','overweight','price target to','pt to',
  'pt raised','raises pt','raised pt','analyst raises','target price increased'
];

// ── Finnhub API helper ────────────────────────────────────────────────────────
async function fhFetch(path, params, token) {
  const qs = new URLSearchParams({ ...params, token }).toString();
  try {
    const r = await fetch(`https://finnhub.io/api/v1/${path}?${qs}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  } catch (e) { return null; }
}

function _dateStr(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 864e5);
  return d.toISOString().slice(0, 10);
}

// ── KV helpers ───────────────────────────────────────────────────────────────
async function kvSmembers(url, token, key) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SMEMBERS', key])
    });
    const j = await r.json();
    return Array.isArray(j.result) ? j.result : [];
  } catch (e) { return []; }
}

// ── Unsubscribe token ─────────────────────────────────────────────────────────
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

// ── Signal narrative builder (Sage pick) ─────────────────────────────────────
async function buildSignalNarrative(ticker, fhKey) {
  const signals = [];

  // 1. Analyst upgrades in last 14 days
  try {
    const news = await fhFetch('company-news', {
      symbol: ticker, from: _dateStr(-14), to: _dateStr(0)
    }, fhKey);
    if (Array.isArray(news)) {
      const upgrades = news.filter(a => {
        const hl = (a.headline || '').toLowerCase();
        return UPGRADE_KW.some(k => hl.includes(k));
      });
      if (upgrades.length >= 1) {
        const topHl = upgrades[0].headline || '';
        const ptMatch = topHl.match(/\$[\d,]+/g);
        const ptStr = ptMatch ? ' (PT ' + ptMatch[ptMatch.length - 1] + ')' : '';
        const firmMatch = topHl.match(/^([A-Z][A-Za-z\s&]+?)\s+(?:raises?|upgrades?|initiates?)/i);
        const firmStr = firmMatch ? firmMatch[1].trim() : '';
        if (upgrades.length >= 3) {
          signals.push(
            upgrades.length + ' analyst upgrades in 14 days'
            + (firmStr ? ' — ' + firmStr + ' most recent' : '') + ptStr + '. Conviction building.'
          );
        } else if (upgrades.length === 2) {
          signals.push('2 analyst upgrades' + (firmStr ? ' — ' + firmStr + ' latest' : '') + ptStr + ' in the last 2 weeks.');
        } else if (firmStr || ptStr) {
          signals.push((firmStr || 'Analyst') + ' upgrade' + ptStr + ' in the last 14 days.');
        }
      }
    }
  } catch (e) {}

  // 2. Insider transactions in last 90 days
  try {
    const insider = await fhFetch('stock/insider-transactions', {
      symbol: ticker, from: _dateStr(-90), to: _dateStr(0)
    }, fhKey);
    const txns = (insider?.data || [])
      .filter(t => !t.isDerivative && t.change !== 0)
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
    const buys = txns.filter(t => t.change > 0);
    if (buys.length >= 1) {
      const uniqueNames = [...new Set(buys.map(t => t.name))].slice(0, 2);
      const totalVal = buys.reduce((s, t) => s + Math.abs(t.change * (t.transactionPrice || 0)), 0);
      const valStr = totalVal >= 1e6 ? '$' + (totalVal / 1e6).toFixed(1) + 'M'
        : totalVal >= 1e3 ? '$' + Math.round(totalVal / 1e3) + 'K' : '';
      const daysAgo = Math.round((Date.now() - new Date(buys[0].transactionDate)) / 864e5);
      const daysStr = daysAgo <= 0 ? 'today' : daysAgo === 1 ? 'yesterday' : daysAgo + ' days ago';
      const fmtName = n => (n || '').split(/\s+/).pop();
      const noSells = txns.filter(t => t.change < 0).length === 0;
      if (uniqueNames.length >= 2) {
        signals.push(
          fmtName(uniqueNames[0]) + ' & ' + fmtName(uniqueNames[1]) + ' (insiders) bought'
          + (valStr ? ' ' + valStr : '') + ' ' + daysStr + ' — cluster buy, historically bullish.'
        );
      } else if (uniqueNames.length === 1) {
        signals.push(
          uniqueNames[0] + ' bought' + (valStr ? ' ' + valStr : '') + ' ' + daysStr
          + (noSells ? ' — no insider selling in 90 days.' : '.')
        );
      }
    }
  } catch (e) {}

  // 3. Quote-based momentum context
  try {
    const quote = await fhFetch('quote', { symbol: ticker }, fhKey);
    if (quote && quote.c) {
      const dp = quote.dp || 0;
      const h52 = quote.h;
      const pct52 = h52 ? ((quote.c / h52) * 100).toFixed(0) : null;
      if (Math.abs(dp) >= 2) {
        const dir = dp > 0 ? 'up' : 'down';
        signals.push(
          ticker + ' is ' + dir + ' ' + Math.abs(dp).toFixed(1) + '% today'
          + (pct52 && dp > 0 ? ', trading at ' + pct52 + '% of 52-week high.' : '.')
        );
      }
    }
  } catch (e) {}

  return signals.slice(0, 2);
}

// ── Mover reason builder (Also watching section) ──────────────────────────────
// Tries chain context first, falls back to analyst signal, then momentum
async function buildMoverReason(moverTicker, sageTicker, dp, fhKey) {
  // 1. Chain relationship (instant — no fetch)
  const chain = getChainContext(moverTicker, sageTicker);
  if (chain) return chain;

  // 2. Analyst upgrade signal (quick news fetch)
  try {
    const news = await fhFetch('company-news', {
      symbol: moverTicker, from: _dateStr(-14), to: _dateStr(0)
    }, fhKey);
    if (Array.isArray(news)) {
      const ups = news.filter(a => UPGRADE_KW.some(k => (a.headline || '').toLowerCase().includes(k)));
      if (ups.length >= 2) {
        return ups.length + ' analyst upgrades in 14 days — conviction building.';
      } else if (ups.length === 1) {
        const ptM = (ups[0].headline || '').match(/\$[\d,]+/g);
        const ptStr = ptM ? ' (PT ' + ptM[ptM.length - 1] + ')' : '';
        const firmM = (ups[0].headline || '').match(/^([A-Z][A-Za-z\s&]+?)\s+(?:raises?|upgrades?|initiates?)/i);
        return (firmM ? firmM[1].trim() : 'Analyst') + ' upgrade' + ptStr + ' in the last 14 days.';
      }
    }
  } catch (e) {}

  // 3. Momentum fallback
  if (Math.abs(dp) >= 1.5) {
    return (dp > 0 ? 'Up ' : 'Down ') + Math.abs(dp).toFixed(1) + '% today — strong price momentum signal.';
  }

  // 4. Generic fallback
  return (NAMES[moverTicker] || moverTicker) + ' scores ' + Math.round(BASE_SCORES[moverTicker] || 65) + '/100 — multi-layer signal convergence.';
}

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml({ ticker, name, score, price, change, changeColor, signals, movers, date }) {
  const sc = scoreColor(score);
  const appUrl = 'https://www.everythingisjustoneclickaway.com';

  const signalDots = (signals.length > 0 ? signals : [
    `${name} scores ${score}/100 — multi-layer signal convergence across market structure, insider activity, and supply chain.`,
    'Score driven by 5 independent signal layers — not one indicator, five.'
  ]).map(s => `
    <tr><td style="vertical-align:top;padding-bottom:10px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:8px;padding-top:5px;vertical-align:top;">
          <div style="width:6px;height:6px;border-radius:50%;background:${sc};"></div>
        </td>
        <td style="padding-left:10px;font-size:14px;color:#374151;line-height:1.65;">${s}</td>
      </tr></table>
    </td></tr>`).join('');

  const moverRows = movers.length > 0 ? movers.map(m => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:13px;font-family:'Courier New',monospace;font-weight:700;color:#18181b;white-space:nowrap;vertical-align:middle;">${m.ticker}</td>
            <td style="padding:0 8px;font-size:12px;color:#71717a;vertical-align:middle;">${m.name}</td>
            <td style="font-size:12px;font-weight:700;color:${scoreColor(m.score)};font-family:'Courier New',monospace;text-align:right;white-space:nowrap;vertical-align:middle;">${m.score}/100</td>
            <td style="padding-left:8px;font-size:12px;color:${m.chgColor};text-align:right;white-space:nowrap;vertical-align:middle;">${m.chg}</td>
          </tr>
          <tr>
            <td colspan="4" style="font-size:12px;color:#6b7280;padding-top:4px;line-height:1.55;">${m.reason}</td>
          </tr>
        </table>
      </td>
    </tr>`).join('') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Morning Brief — ${ticker}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:20px 12px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
    <tr>
      <td style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;">Everything is just one click away</td>
      <td style="text-align:right;font-size:11px;color:#a1a1aa;">${date}</td>
    </tr>
  </table>

  <!-- Sage pick card -->
  <div style="background:#fff;border-radius:14px;padding:28px 24px;margin-bottom:12px;border:1px solid #e4e4e7;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8b5cf6;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:3px 10px;display:inline-block;margin-bottom:14px;">🌿 Sage Pick · Today's highest conviction</div>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
      <tr>
        <td style="vertical-align:middle;">
          <div style="font-size:36px;font-weight:800;letter-spacing:-1.5px;color:#18181b;font-family:'Courier New',monospace;line-height:1;">${ticker}</div>
          <div style="font-size:14px;color:#71717a;margin-top:4px;">${name}</div>
        </td>
        <td style="vertical-align:middle;text-align:right;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:14px;background:${sc}18;border:2px solid ${sc}44;text-align:center;line-height:60px;">
            <span style="font-size:20px;font-weight:800;color:${sc};font-family:'Courier New',monospace;">${score}</span>
          </div>
        </td>
      </tr>
    </table>

    <div style="font-size:22px;font-weight:600;color:#18181b;font-family:'Courier New',monospace;margin-bottom:4px;">
      $${price} <span style="font-size:14px;font-weight:600;color:${changeColor};">${change}</span>
    </div>

    <div style="height:1px;background:#f4f4f5;margin:16px 0;"></div>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalDots}
    </table>

    <div style="margin-top:18px;">
      <a href="${appUrl}/?t=${ticker}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:8px;margin-right:8px;">Open signal →</a>
      <a href="${appUrl}" style="display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:11px 22px;border-radius:8px;border:1px solid #e4e4e7;">Full Morning Brief</a>
    </div>
  </div>

  ${movers.length > 0 ? `
  <!-- Also watching -->
  <div style="background:#fff;border-radius:14px;padding:20px 24px;margin-bottom:12px;border:1px solid #e4e4e7;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:14px;">Also worth watching today</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${moverRows}
    </table>
    <div style="margin-top:14px;">
      <a href="${appUrl}" style="display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:9px 18px;border-radius:8px;border:1px solid #e4e4e7;">See all signals →</a>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0;">
    <p style="font-size:11px;color:#a1a1aa;margin:0 0 6px;">You're receiving this because you subscribed to Morning Brief.</p>
    <p style="margin:0;"><a style="font-size:11px;color:#a1a1aa;" href="${appUrl}/api/subscribe?action=unsub&email=__EMAIL__&token=__TOKEN__">Unsubscribe</a></p>
  </div>
</div>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const config = { schedule: '50 10 * * 1-5' };

export default async function handler(req, res) {
  const { FH_KEY, RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  if (!FH_KEY)          return res.status(500).json({ error: 'FH_KEY not configured' });
  if (!RESEND_API_KEY)  return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // ── Step 1: Fetch live quotes for top 20 candidates ──────────────────────
  const candidates = Object.entries(BASE_SCORES).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);

  const quoteResults = await Promise.allSettled(
    candidates.map(t => fhFetch('quote', { symbol: t }, FH_KEY))
  );

  // ── Step 2: Score each candidate with live momentum boost ─────────────────
  const scoredCandidates = candidates.map((t, i) => {
    const base = BASE_SCORES[t] || 50;
    const q = quoteResults[i]?.status === 'fulfilled' ? quoteResults[i].value : null;
    const dp = q?.dp || 0;
    const momentumBoost = dp > 3 ? 6 : dp > 1.5 ? 3 : dp < -3 ? -6 : dp < -1.5 ? -3 : 0;
    const adjusted = Math.min(99, Math.max(1, base + momentumBoost));
    return {
      ticker: t,
      score: adjusted,
      price: q?.c ? q.c.toFixed(2) : '--',
      dp: dp,
      changeStr: dp ? (dp > 0 ? '+' : '') + dp.toFixed(2) + '%' : '--',
      changeColor: dp >= 0 ? '#10b981' : '#ef4444'
    };
  }).sort((a, b) => b.score - a.score);

  // Signal-nodes (hyperscalers, used as upstream indicators — not direct picks)
  const SIGNAL_NODES = new Set(['META', 'MSFT', 'GOOGL', 'TSM', 'AMZN']);
  const actionable = scoredCandidates.filter(s => !SIGNAL_NODES.has(s.ticker));
  const best = actionable[0];

  // ── Step 3: Build live narrative for the Sage pick ────────────────────────
  const signals = await buildSignalNarrative(best.ticker, FH_KEY);

  // ── Step 4: Build "also watching" movers with chain context ──────────────
  const moverCandidates = actionable.slice(1, 4);

  // Fetch reasons in parallel (chain lookup is instant; news fetch only fires as fallback)
  const moverReasons = await Promise.all(
    moverCandidates.map(s => buildMoverReason(s.ticker, best.ticker, s.dp, FH_KEY))
  );

  const movers = moverCandidates.map((s, i) => ({
    ticker: s.ticker,
    name: NAMES[s.ticker] || s.ticker,
    score: s.score,
    chg: s.changeStr,
    chgColor: s.changeColor,
    reason: moverReasons[i]
  }));

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // ── Step 5: Get subscribers ───────────────────────────────────────────────
  let subscribers = [];
  if (KV_REST_API_URL && KV_REST_API_TOKEN) {
    subscribers = await kvSmembers(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:subscribers');
  }

  if (!subscribers.length) {
    return res.status(200).json({
      ok: true,
      sage: best.ticker,
      score: best.score,
      signals,
      movers: movers.map(m => ({ ticker: m.ticker, reason: m.reason })),
      subscribers: 0,
      message: 'No subscribers yet — digest ready when they sign up'
    });
  }

  // ── Step 6: Send emails ────────────────────────────────────────────────────
  let sent = 0, failed = 0;

  for (const email of subscribers) {
    const unsubToken = makeUnsubToken(email);
    const htmlBody = buildEmailHtml({
      ticker: best.ticker,
      name: NAMES[best.ticker] || best.ticker,
      score: best.score,
      price: best.price,
      change: best.changeStr,
      changeColor: best.changeColor,
      signals,
      movers,
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
          subject: `☀️ ${best.ticker} leads today — ${best.score}/100 · Morning Brief`,
          html: htmlBody
        })
      });
      if (r.ok) sent++; else { failed++; }
    } catch (e) { failed++; }

    // Respect Resend rate limits
    await new Promise(r => setTimeout(r, 60));
  }

  return res.status(200).json({
    ok: true,
    sage: best.ticker,
    score: best.score,
    signals,
    movers: movers.map(m => ({ ticker: m.ticker, reason: m.reason })),
    subscribers: subscribers.length,
    sent,
    failed,
    date: dateStr
  });
}
