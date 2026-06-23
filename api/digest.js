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

// ── Supply chain event windows ────────────────────────────────────────────────
// Upstream events with dated triggers and lag windows (weeks).
// Used to compute whether a downstream stock's lag window is currently active.
const SIGNAL_EVENTS = {
  ASML: [
    { upstream:'TSM',   date:'2026-01-15', desc:'TSMC raised FY2026 capex to $38–42B — 15% above prior year', lagMin:6, lagMax:9 },
    { upstream:'TSM',   date:'2025-07-18', desc:'TSMC Q2 2025 capex beat — $10.4B single quarter record',     lagMin:6, lagMax:9 },
  ],
  NVDA: [
    { upstream:'MSFT',  date:'2026-01-23', desc:'MSFT guided $80B AI capex FY2026',                           lagMin:0, lagMax:8 },
    { upstream:'META',  date:'2026-01-22', desc:'META raised FY2026 capex to $64–72B',                        lagMin:0, lagMax:8 },
    { upstream:'GOOGL', date:'2026-01-29', desc:'GOOGL guided $75B capex FY2026',                             lagMin:2, lagMax:10 },
    { upstream:'MSFT',  date:'2026-04-30', desc:'MSFT Q3 2026 Azure +33% YoY',                                lagMin:0, lagMax:8 },
  ],
  TSM: [
    { upstream:'NVDA',  date:'2026-02-26', desc:'NVDA Q4 FY2025: Data Center $30.8B (+93% YoY)',              lagMin:0, lagMax:6 },
  ],
  SMCI: [
    { upstream:'NVDA',  date:'2026-02-26', desc:'NVDA data center beat — Blackwell rack integration expanding', lagMin:0, lagMax:6 },
    { upstream:'NVDA',  date:'2026-04-15', desc:'NVDA Blackwell GB200 NVL72 shipments accelerating',          lagMin:0, lagMax:6 },
  ],
  AMD: [
    { upstream:'MSFT',  date:'2026-01-23', desc:'MSFT MI300X Azure AI deployment confirmed',                  lagMin:4, lagMax:16 },
    { upstream:'GOOGL', date:'2026-01-29', desc:'GOOGL expanded MI300X usage for Cloud AI',                   lagMin:4, lagMax:16 },
  ],
  MU: [
    { upstream:'NVDA',  date:'2026-02-26', desc:'NVDA Q4 FY2026: data center beat — HBM demand letter sent',  lagMin:4, lagMax:8 },
    { upstream:'NVDA',  date:'2026-04-15', desc:'NVDA Blackwell ramp accelerating — HBM allocation secured',  lagMin:2, lagMax:6 },
  ],
  AMAT: [
    { upstream:'TSM',   date:'2026-01-16', desc:'TSMC capex raised to $38–42B FY2026 · N2 node yield improving', lagMin:8, lagMax:12 },
  ],
  LRCX: [
    { upstream:'TSM',   date:'2026-01-16', desc:'TSMC capex raise · CoWoS advanced packaging requires Lam etch', lagMin:6, lagMax:10 },
    { upstream:'MU',    date:'2026-03-20', desc:'Micron HBM3E revenue tripled · Lam etch tool orders expanding', lagMin:4, lagMax:8 },
  ],
  VST: [
    { upstream:'MSFT',  date:'2026-01-23', desc:'MSFT $80B capex — Texas data center power demand surge',     lagMin:5, lagMax:16 },
    { upstream:'META',  date:'2026-01-22', desc:'META $65B capex — AI data center corridor power demand',     lagMin:5, lagMax:16 },
  ],
  CEG: [
    { upstream:'MSFT',  date:'2026-01-13', desc:'Three Mile Island PPA signed — 835MW · 20yr',                lagMin:0, lagMax:104 },
  ],
  LMT: [
    { upstream:'DOD',   date:'2026-03-14', desc:'US DoD FY2027 budget: F-35 procurement rate increase',       lagMin:0, lagMax:12 },
    { upstream:'NATO',  date:'2026-04-25', desc:'NATO 32-member 2% GDP commit — allied F-35 orders accelerating', lagMin:0, lagMax:24 },
  ],
  CCJ: [
    { upstream:'CEG',   date:'2026-03-15', desc:'CEG signed 3 new nuclear PPAs with hyperscalers',            lagMin:26, lagMax:78 },
    { upstream:'VST',   date:'2026-02-20', desc:'VST Comanche Peak life-extension approved through 2045',     lagMin:13, lagMax:39 },
  ],
  PLTR: [
    { upstream:'DOD',   date:'2026-03-15', desc:'TITAN contract $619M — DoD AI budget +40% YoY',             lagMin:0, lagMax:12 },
  ],
  RKLB: [
    { upstream:'SDA',   date:'2026-03-20', desc:'SDA Tranche 2 — 18 satellites · $515M contract',            lagMin:0, lagMax:16 },
  ],
};

// Compute active lag windows for a ticker (windows where today falls between event+lagMin and event+lagMax)
function computeActiveWindows(ticker) {
  const events = SIGNAL_EVENTS[ticker] || [];
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const active = [];
  const forming = [];
  events.forEach(ev => {
    const evDate = new Date(ev.date).getTime();
    const windowStart = evDate + ev.lagMin * week;
    const windowEnd   = evDate + ev.lagMax * week;
    if (now >= windowStart && now <= windowEnd) {
      const weeksIn  = Math.round((now - windowStart) / week);
      const weeksLeft= Math.round((windowEnd - now) / week);
      active.push({ ...ev, weeksIn, weeksLeft });
    } else if (now < windowStart && (windowStart - now) <= 2 * week) {
      const weeksUntil = Math.round((windowStart - now) / week);
      forming.push({ ...ev, weeksUntil });
    }
  });
  return { active, forming };
}

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

// ── Chain related stocks for a given ticker ───────────────────────────────────
// Returns { upstream: [{ticker,lag,desc}], downstream: [{ticker,lag,desc}] }
function getChainRelated(ticker) {
  const upstream = CHAIN_LINKS
    .filter(([src, tgt]) => tgt === ticker)
    .map(([src, , lag, desc]) => ({ ticker: src, lag, desc }));
  const downstream = CHAIN_LINKS
    .filter(([src, tgt]) => src === ticker)
    .map(([, tgt, lag, desc]) => ({ ticker: tgt, lag, desc }));
  return { upstream, downstream };
}

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

async function kvGet(url, token, key) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', key])
    });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch (e) { return null; }
}

async function kvSet(url, token, key, value) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', key, JSON.stringify(value)])
    });
  } catch (e) {}
}

// ── Per-subscriber alert checker ─────────────────────────────────────────────
// Loads ti:alerts:{email} from KV, checks which thresholds are crossed by
// latestScores, respects 24h cooldown, updates lastTriggeredAt on fired alerts.
// Returns array: [{ticker, score, threshold, type, name}]
async function checkTriggeredAlerts(email, latestScores, kvUrl, kvToken) {
  const key = `ti:alerts:${email.toLowerCase().trim()}`;
  const alerts = await kvGet(kvUrl, kvToken, key);
  if (!alerts || typeof alerts !== 'object') return [];

  const triggered = [];
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  for (const [ticker, alert] of Object.entries(alerts)) {
    const score = latestScores[ticker];
    if (score == null) continue;
    const { threshold = 75, type = 'above' } = alert;
    const fired = type === 'above' ? score >= threshold : score <= threshold;
    if (!fired) continue;
    const lastTrig = alert.lastTriggeredAt || 0;
    if (now - lastTrig < cooldown) continue;
    triggered.push({ ticker, score, threshold, type, name: NAMES[ticker] || ticker });
    alerts[ticker] = { ...alert, lastTriggeredAt: now };
  }

  if (triggered.length) {
    await kvSet(kvUrl, kvToken, key, alerts);
  }
  return triggered;
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
async function buildMoverReason(moverTicker, sageTicker, dp, fhKey, chainRole) {
  // 1. Rich chain context with active window status (instant — no fetch)
  if (chainRole === 'upstream') {
    const link = CHAIN_LINKS.find(([src, tgt]) => src === moverTicker && tgt === sageTicker);
    if (link) {
      const windows = computeActiveWindows(sageTicker);
      const activeFromThis = windows.active.filter(w => w.upstream === moverTicker);
      if (activeFromThis.length) {
        const w = activeFromThis[0];
        return `Lag window ACTIVE — ${w.weeksLeft}w remaining. ${link[3]}.`;
      }
      const forming = windows.forming.filter(w => w.upstream === moverTicker);
      if (forming.length) {
        return `Lag window opens in ~${forming[0].weeksUntil}w. ${link[3]}.`;
      }
      return `Upstream trigger for ${sageTicker} — ${link[2]} lead time. ${link[3]}.`;
    }
  }
  if (chainRole === 'downstream') {
    const link = CHAIN_LINKS.find(([src, tgt]) => src === sageTicker && tgt === moverTicker);
    if (link) {
      const windows = computeActiveWindows(moverTicker);
      const activeFromSage = windows.active.filter(w => w.upstream === sageTicker);
      if (activeFromSage.length) {
        const w = activeFromSage[0];
        return `Downstream beneficiary — lag window active, ${w.weeksLeft}w remaining. ${link[3]}.`;
      }
      return `Downstream of ${sageTicker} — ${link[2]} lag. ${link[3]}.`;
    }
  }

  // 2. Generic chain relationship (instant — no fetch)
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

// ── Today's tape: market headlines + earnings reporting today ────────────────
const APP_BASE = 'https://www.everythingisjustoneclickaway.com';
function tapeLink(ticker) {
  const utm = 'utm_source=email&utm_medium=digest&utm_campaign=morningbrief';
  return ticker ? `${APP_BASE}/?t=${encodeURIComponent(ticker)}&${utm}` : `${APP_BASE}/?${utm}`;
}

async function fetchMarketHeadlines(fhKey, limit) {
  limit = limit || 5;
  const news = await fhFetch('news', { category: 'general' }, fhKey);
  if (!Array.isArray(news)) return [];
  const seen = new Set();
  const out = [];
  for (const n of news) {
    const hl = (n.headline || '').trim();
    if (!hl || seen.has(hl)) continue;
    seen.add(hl);
    out.push({
      headline: hl,
      source: n.source || '',
      related: (n.related || '').split(',')[0].trim() || ''
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchEarningsToday(fhKey) {
  const today = _dateStr(0);
  const data = await fhFetch('calendar/earnings', { from: today, to: today }, fhKey);
  const arr = (data && data.earningsCalendar) || [];
  const seen = new Set();
  const out = [];
  for (const e of arr) {
    if (!NAMES[e.symbol] || seen.has(e.symbol)) continue;
    seen.add(e.symbol);
    out.push({ symbol: e.symbol, hour: e.hour });
  }
  return out;
}

function buildTapeHtml(headlines, earningsToday) {
  if ((!headlines || !headlines.length) && (!earningsToday || !earningsToday.length)) return '';
  let inner = '';

  if (earningsToday && earningsToday.length) {
    const chips = earningsToday.slice(0, 10).map(e => {
      const when = e.hour === 'bmo' ? ' ☀' : e.hour === 'amc' ? ' 🌙' : '';
      return `<a href="${tapeLink(e.symbol)}" style="display:inline-block;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#18181b;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;padding:3px 9px;margin:0 5px 6px 0;">${e.symbol}${when}</a>`;
    }).join('');
    inner += `<div style="margin-bottom:16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:8px;">📅 Reporting today</div>${chips}<div style="font-size:10px;color:#c4c4cc;margin-top:2px;">☀ before open · 🌙 after close</div></div>`;
  }

  if (headlines && headlines.length) {
    const rows = headlines.map(n => `<tr><td style="padding:9px 0;border-bottom:1px solid #f4f4f5;"><a href="${tapeLink(n.related)}" style="text-decoration:none;color:#18181b;font-size:13px;font-weight:600;line-height:1.5;">${n.headline}</a><div style="font-size:11px;color:#a1a1aa;margin-top:3px;">${n.source}${n.related ? ' · ' + n.related : ''}</div></td></tr>`).join('');
    inner += `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:8px;">📰 Today's tape · markets &amp; business</div><table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></div>`;
  }

  return `<div style="background:#fff;border-radius:14px;padding:20px 24px;margin-bottom:12px;border:1px solid #e4e4e7;">${inner}<div style="margin-top:14px;"><a href="${tapeLink(null)}" style="display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:9px 18px;border-radius:8px;border:1px solid #e4e4e7;">Open the app →</a></div></div>`;
}

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml({ ticker, name, score, price, change, changeColor, signals, movers, date, triggeredAlerts, chainWindows, tapeHtml }) {
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

  const moverRows = movers.length > 0 ? movers.map(m => {
    const roleBadge = m.chainRole === 'upstream'
      ? `<span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:4px;padding:1px 6px;margin-left:6px;">↑ UPSTREAM</span>`
      : m.chainRole === 'downstream'
      ? `<span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:4px;padding:1px 6px;margin-left:6px;">↓ DOWNSTREAM</span>`
      : '';
    return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:13px;font-family:'Courier New',monospace;font-weight:700;color:#18181b;white-space:nowrap;vertical-align:middle;">${m.ticker}${roleBadge}</td>
            <td style="padding:0 8px;font-size:12px;color:#71717a;vertical-align:middle;">${m.name}</td>
            <td style="font-size:12px;font-weight:700;color:${scoreColor(m.score)};font-family:'Courier New',monospace;text-align:right;white-space:nowrap;vertical-align:middle;">${m.score}/100</td>
            <td style="padding-left:8px;font-size:12px;color:${m.chgColor};text-align:right;white-space:nowrap;vertical-align:middle;">${m.chg}</td>
          </tr>
          <tr>
            <td colspan="4" style="font-size:12px;color:#6b7280;padding-top:4px;line-height:1.55;">${m.reason}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('') : '';

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

${tapeHtml || ''}

  ${movers.length > 0 ? `
  <!-- Also watching -->
  <div style="background:#fff;border-radius:14px;padding:20px 24px;margin-bottom:12px;border:1px solid #e4e4e7;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:4px;">Supply chain · also watching</div>
    <div style="font-size:11px;color:#71717a;margin-bottom:14px;">Stocks upstream or downstream of today's Sage pick</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${moverRows}
    </table>
    <div style="margin-top:14px;">
      <a href="${appUrl}" style="display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:9px 18px;border-radius:8px;border:1px solid #e4e4e7;">See all signals →</a>
    </div>
  </div>` : ''}

  ${triggeredAlerts && triggeredAlerts.length > 0 ? `
  <!-- Triggered alerts -->
  <div style="background:#fff;border-radius:14px;padding:20px 24px;margin-bottom:12px;border:2px solid #f59e0b;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#d97706;margin-bottom:14px;">⚡ Your alerts fired today</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${triggeredAlerts.map(a => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #fef3c7;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-size:14px;font-family:'Courier New',monospace;font-weight:700;color:#18181b;">${a.ticker}</td>
              <td style="font-size:12px;color:#71717a;padding:0 8px;">${a.name}</td>
              <td style="font-size:13px;font-weight:700;color:${scoreColor(a.score)};font-family:'Courier New',monospace;text-align:right;">${a.score}/100</td>
            </tr>
            <tr>
              <td colspan="3" style="font-size:12px;color:#92400e;padding-top:3px;">
                Score ${a.type === 'above' ? 'crossed above' : 'dropped below'} your ${a.threshold} threshold
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:12px;">
      <a href="https://www.everythingisjustoneclickaway.com" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:9px 18px;border-radius:8px;">Review alerts →</a>
    </div>
  </div>` : ''}

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

    ${chainWindows && (chainWindows.active.length > 0 || chainWindows.forming.length > 0) ? `
    <div style="height:1px;background:#f4f4f5;margin:16px 0;"></div>
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f59e0b;margin-bottom:10px;">⚡ Active chain windows</div>
      ${chainWindows.active.map(w => `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;padding:0;overflow:hidden;">
        <tr>
          <td style="padding:10px 14px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <div>
                <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:3px;">
                  <span style="font-family:'Courier New',monospace;">${w.upstream}</span>
                  <span style="color:#d97706;margin:0 5px;">→</span>
                  <span style="font-family:'Courier New',monospace;">${ticker}</span>
                  <span style="font-size:11px;color:#92400e;font-weight:400;margin-left:6px;">· ${w.lagMin}–${w.lagMax} week lag</span>
                </div>
                <div style="font-size:12px;color:#78350f;line-height:1.55;">${w.desc}</div>
                <div style="font-size:11px;color:#92400e;margin-top:4px;">
                  Window in for <strong>${w.weeksIn}w</strong>${w.weeksLeft > 0 ? ` · <strong>${w.weeksLeft}w remaining</strong>` : ' · closing soon'}
                </div>
              </div>
            </div>
          </td>
        </tr>
      </table>`).join('')}
      ${chainWindows.forming.map(w => `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;padding:0;overflow:hidden;">
        <tr>
          <td style="padding:10px 14px;">
            <div style="font-size:12px;font-weight:700;color:#9a3412;margin-bottom:3px;">
              <span style="font-family:'Courier New',monospace;">${w.upstream}</span>
              <span style="color:#ea580c;margin:0 5px;">→</span>
              <span style="font-family:'Courier New',monospace;">${ticker}</span>
              <span style="font-size:11px;color:#c2410c;font-weight:400;margin-left:6px;">opens in ~${w.weeksUntil}w</span>
            </div>
            <div style="font-size:12px;color:#7c2d12;line-height:1.55;">${w.desc}</div>
          </td>
        </tr>
      </table>`).join('')}
    </div>` : ''}

    <div style="margin-top:18px;">
      <a href="${appUrl}/?t=${ticker}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:8px;margin-right:8px;">Open signal →</a>
      <a href="${appUrl}" style="display:inline-block;background:#f4f4f5;color:#374151;text-decoration:none;font-size:13px;font-weight:500;padding:11px 22px;border-radius:8px;border:1px solid #e4e4e7;">Full Morning Brief</a>
    </div>
  </div>

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

  // ── Step 0: Load live scores from KV (nightly cron output) ───────────────
  // Falls back to hardcoded BASE_SCORES if KV unavailable or cron hasn't run yet
  let liveScores = null;
  if (KV_REST_API_URL && KV_REST_API_TOKEN) {
    try {
      const snap = await kvGet(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:scores:latest');
      if (snap && snap.scores && Object.keys(snap.scores).length > 100) {
        liveScores = snap.scores;
      }
    } catch (e) {}
  }
  const effectiveScores = liveScores || BASE_SCORES;
  const scoreSource = liveScores ? 'live' : 'base';

  // ── Step 1: Fetch live quotes for top 20 candidates ──────────────────────
  // Candidates ranked by effective (live) scores, filtered to tickers we have names for
  const candidates = Object.entries(effectiveScores)
    .filter(([t]) => NAMES[t])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([t]) => t);

  const quoteResults = await Promise.allSettled(
    candidates.map(t => fhFetch('quote', { symbol: t }, FH_KEY))
  );

  // ── Step 2: Score each candidate with live momentum boost ─────────────────
  const scoredCandidates = candidates.map((t, i) => {
    const base = effectiveScores[t] || 50;
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

  // Compute active chain windows for the Sage pick
  const chainWindows = computeActiveWindows(best.ticker);

  // ── Step 4: Build "also watching" — chain-aware mover selection ─────────
  // Find upstream and downstream stocks for the Sage pick
  const chainRelated = getChainRelated(best.ticker);
  const upstreamSet = new Set(chainRelated.upstream.map(r => r.ticker));
  const downstreamSet = new Set(chainRelated.downstream.map(r => r.ticker));

  // Tag each candidate with their chain role
  const taggedCandidates = actionable.slice(1).map(s => ({
    ...s,
    chainRole: upstreamSet.has(s.ticker) ? 'upstream'
              : downstreamSet.has(s.ticker) ? 'downstream'
              : null
  }));

  // Sort: upstream first, then downstream, then top scorers (score already sorted)
  taggedCandidates.sort((a, b) => {
    const rankA = a.chainRole === 'upstream' ? 0 : a.chainRole === 'downstream' ? 1 : 2;
    const rankB = b.chainRole === 'upstream' ? 0 : b.chainRole === 'downstream' ? 1 : 2;
    if (rankA !== rankB) return rankA - rankB;
    return b.score - a.score;
  });

  const moverCandidates = taggedCandidates.slice(0, 3);

  // Fetch reasons in parallel (chain lookup is instant; news fetch only fires as fallback)
  const moverReasons = await Promise.all(
    moverCandidates.map(s => buildMoverReason(s.ticker, best.ticker, s.dp, FH_KEY, s.chainRole))
  );

  const movers = moverCandidates.map((s, i) => ({
    ticker: s.ticker,
    name: NAMES[s.ticker] || s.ticker,
    score: s.score,
    chg: s.changeStr,
    chgColor: s.changeColor,
    reason: moverReasons[i],
    chainRole: s.chainRole
  }));

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Today's tape — fetched once, shared across all subscribers
  let _headlines = [], _earningsToday = [];
  try { _headlines = await fetchMarketHeadlines(FH_KEY, 8); } catch (e) {}
  try { _earningsToday = await fetchEarningsToday(FH_KEY); } catch (e) {}
  const tapeHtml = buildTapeHtml(_headlines, _earningsToday);

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
      scoreSource,
      signals,
      chainWindows,
      movers: movers.map(m => ({ ticker: m.ticker, reason: m.reason })),
      subscribers: 0,
      message: 'No subscribers yet — digest ready when they sign up'
    });
  }

  // ── Step 6: Send emails ────────────────────────────────────────────────────
  let sent = 0, failed = 0, alertsFired = 0;

  for (const email of subscribers) {
    const unsubToken = makeUnsubToken(email);

    // Check per-subscriber alerts (uses the same live scores already computed)
    let triggeredAlerts = [];
    if (KV_REST_API_URL && KV_REST_API_TOKEN) {
      try {
        triggeredAlerts = await checkTriggeredAlerts(email, effectiveScores, KV_REST_API_URL, KV_REST_API_TOKEN);
        alertsFired += triggeredAlerts.length;
      } catch (e) { /* non-fatal — continue without alerts */ }
    }

    const htmlBody = buildEmailHtml({
      ticker: best.ticker,
      name: NAMES[best.ticker] || best.ticker,
      score: best.score,
      price: best.price,
      change: best.changeStr,
      changeColor: best.changeColor,
      signals,
      movers,
      date: dateStr,
      triggeredAlerts,
      chainWindows,
      tapeHtml
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
    scoreSource,
    signals,
    chainWindows: { active: chainWindows.active.length, forming: chainWindows.forming.length },
    movers: movers.map(m => ({ ticker: m.ticker, reason: m.reason })),
    subscribers: subscribers.length,
    sent,
    failed,
    alertsFired,
    date: dateStr
  });
}
