// app/stock/[ticker]/page.tsx — Stock detail page
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getScoreHistory } from '@/lib/scores'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreSparkline } from '@/components/charts/ScoreSparkline'
import { ChainTab } from '@/components/ui/ChainTab'
import { SignalsTab } from '@/components/ui/SignalsTab'
import { InsiderTab } from '@/components/ui/InsiderTab'

interface Props {
  params: { ticker: string }
  searchParams: { tab?: string }
}

export async function generateMetadata({ params }: Props) {
  const ticker = params.ticker.toUpperCase()
  const t = await db.ticker.findUnique({ where: { id: ticker } })
  return {
    title: t ? `${ticker} — ${t.name} | Trading Intelligence` : `${ticker} | Trading Intelligence`,
    description: t?.description ?? `${ticker} signal scores and supply chain intelligence`
  }
}

async function getStockData(ticker: string) {
  const [meta, latestScore, history, signals, insiderEvents] = await Promise.all([
    db.ticker.findUnique({ where: { id: ticker } }),
    db.score.findFirst({ where: { tickerId: ticker }, orderBy: { date: 'desc' } }),
    getScoreHistory(ticker, 30),
    db.signal.findMany({
      where: { tickerId: ticker, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      orderBy: { createdAt: 'desc' }, take: 20
    }),
    db.insiderEvent.findMany({
      where: { tickerId: ticker },
      orderBy: { transactionDate: 'desc' }, take: 20
    })
  ])
  return { meta, latestScore, history, signals, insiderEvents }
}

const TABS = ['overview', 'chain', 'signals', 'insider', 'score'] as const

export default async function StockPage({ params, searchParams }: Props) {
  const ticker = params.ticker.toUpperCase()
  const activeTab = (searchParams.tab ?? 'overview') as typeof TABS[number]

  const { meta, latestScore, history, signals, insiderEvents } = await getStockData(ticker)
  if (!meta) notFound()

  const scoreHistory = history.map(h => ({
    date: h.date.toISOString().slice(0, 10),
    score: h.score
  }))

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold mono">{ticker}</h1>
            {latestScore && (
              <ScoreBadge score={latestScore.score} delta={latestScore.delta7d ?? undefined} size="lg" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{meta.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.sector}</p>
        </div>
      </div>

      {/* Score sparkline */}
      {scoreHistory.length > 0 && (
        <div className="ti-card mb-4">
          <p className="text-xs text-muted-foreground mb-2">30-day signal score</p>
          <ScoreSparkline data={scoreHistory} />
        </div>
      )}

      {/* Tab nav */}
      <nav className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <a
            key={tab}
            href={`/stock/${ticker}?tab=${tab}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-accent/20 text-accent-foreground border border-accent/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'chain' ? 'Supply Chain' : tab === 'score' ? 'Signal Score' : tab}
          </a>
        ))}
      </nav>

      {/* Tab content */}
      <Suspense fallback={<div className="ti-card animate-pulse h-48" />}>
        {activeTab === 'chain'   && <ChainTab ticker={ticker} />}
        {activeTab === 'signals' && <SignalsTab signals={signals} />}
        {activeTab === 'insider' && <InsiderTab events={insiderEvents} />}
        {activeTab === 'score'   && latestScore && (
          <div className="ti-card space-y-3">
            <h2 className="text-sm font-semibold">5-Layer Signal Score</h2>
            {[
              { label: 'L1 Market Structure', val: latestScore.l1Score },
              { label: 'L2 Insider / Regulatory', val: latestScore.l2Score },
              { label: 'L3 Corporate Intel', val: latestScore.l3Score },
              { label: 'L4 Supply Chain', val: latestScore.l4Score },
              { label: 'L5 Macro / Structural', val: latestScore.l5Score },
            ].map(({ label, val }) => val !== null && val !== undefined && (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-44 shrink-0">{label}</span>
                <div className="flex-1 bg-white/5 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(val / 20) * 100}%` }} />
                </div>
                <span className="text-xs mono font-semibold w-8 text-right">{val}/20</span>
              </div>
            ))}
          </div>
        )}
      </Suspense>
    </main>
  )
}
