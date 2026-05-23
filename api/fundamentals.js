// api/fundamentals.js — EDGAR XBRL quarterly fundamentals (revenue + capex)
// Free, no API key. US GAAP companies only (10-Q filers).
// GET /api/fundamentals?ticker=META&cik=0001326801
// Returns last 8 quarters of revenue + capex with QoQ/YoY deltas.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { ticker, cik } = req.query;
  if (!ticker || !cik) return res.status(400).json({ error: 'ticker and cik required' });

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200'); // 6hr cache

  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'trading-intelligence contact@example.com' },
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw new Error(`SEC XBRL HTTP ${r.status}`);
    const data = await r.json();

    const gaap = data?.facts?.['us-gaap'] || {};
    const ifrs = data?.facts?.['ifrs-full'] || {};
    const taxonomy = Object.keys(gaap).length > Object.keys(ifrs).length ? gaap : ifrs;
    const isIfrs  = taxonomy === ifrs;

    const revenue = extractQuarterly(gaap, [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
    ]) || (isIfrs ? extractQuarterly(ifrs, ['Revenue', 'RevenueFromContractsWithCustomers']) : null);

    const capex = extractQuarterly(gaap, [
      'PaymentsToAcquirePropertyPlantAndEquipment',
      'PaymentsForCapitalImprovements',
      'CapitalExpendituresIncurringObligation',
    ]) || (isIfrs ? extractQuarterly(ifrs, [
      'PaymentsForPurchaseOfPropertyPlantAndEquipment',
      'PurchaseOfPropertyPlantAndEquipment',
      'AcquisitionsOfPropertyPlantAndEquipment',
    ]) : null);

    const opIncome = extractQuarterly(gaap, [
      'OperatingIncomeLoss',
      'IncomeLossFromContinuingOperationsBeforeIncomeTaxes',
    ]);

    const result = {
      ok: true,
      ticker: ticker.toUpperCase(),
      cik: paddedCik,
      revenue:      addDeltas(trimRecent(revenue,   8)),
      capex:        addDeltas(trimRecent(capex,      8)),
      operatingIncome: addDeltas(trimRecent(opIncome, 8)),
      ts: Date.now()
    };

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, ticker, error: e.message });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysDiff(startStr, endStr) {
  try {
    return (new Date(endStr + 'T12:00:00Z') - new Date(startStr + 'T12:00:00Z')) / 864e5;
  } catch { return 0; }
}

// Extract quarterly (60–120 day) data points for a list of concept names.
// Deduplicates by period end date, keeping the most recently filed entry.
function extractQuarterly(taxonomy, conceptNames) {
  for (const name of conceptNames) {
    const concept = taxonomy[name];
    if (!concept?.units) continue;

    // Prefer USD; fall back to first available unit
    const currency = concept.units['USD'] ? 'USD'
      : concept.units['TWD']  ? 'TWD'
      : Object.keys(concept.units)[0];
    const units = concept.units[currency] || [];

    const byEnd = {};
    for (const u of units) {
      if (!['10-Q', '10-K', '20-F'].includes(u.form)) continue;
      if (!u.start) continue;
      const days = daysDiff(u.start, u.end);
      if (days < 60 || days > 125) continue; // quarterly window only

      const end = u.end;
      if (!byEnd[end] || (u.filed || '') > (byEnd[end].filed || '')) {
        byEnd[end] = { ...u, currency };
      }
    }

    const quarterly = Object.values(byEnd)
      .sort((a, b) => b.end.localeCompare(a.end));

    if (quarterly.length >= 2) return quarterly;
  }
  return null;
}

function trimRecent(items, n) {
  if (!items) return null;
  return items.slice(0, n).map(u => ({
    period:   u.end,
    start:    u.start,
    value:    u.val,
    currency: u.currency || 'USD',
    form:     u.form,
    filed:    u.filed,
  }));
}

// Annotate each data point with QoQ and YoY percentage change.
function addDeltas(items) {
  if (!items) return null;
  return items.map((item, i) => {
    const prev  = items[i + 1]; // one quarter earlier (array is newest-first)
    const yoy   = items[i + 4]; // same quarter last year
    return {
      ...item,
      qoq: prev ? pct(item.value, prev.value) : null,
      yoy: yoy  ? pct(item.value, yoy.value)  : null,
    };
  });
}

function pct(current, prior) {
  if (!prior || prior === 0) return null;
  return Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10; // 1 dp
}
