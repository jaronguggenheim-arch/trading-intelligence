// components/ui/SagePickCard.tsx
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'

interface SagePickData {
  scoreBundle?: {
    scores?: Record<string, number>
    deltas?: Record<string, number>
  }
  topSignals?: Array<{ tickerId?: string }>
  generatedAt?: string
}

interface Props {
  data: SagePickData
}

function pickTopTicker(data: SagePickData): { ticker: string; score: number; delta: number } | null {
  const scores = data.scoreBundle?.scores
  const deltas = data.scoreBundle?.deltas
  if (!scores) return null

  // Pick highest score with positive delta
  let best: { ticker: string; score: number; delta: number } | null = null
  for (const [ticker, score] of Object.entries(scores)) {
    const delta = deltas?.[ticker] ?? 0
    if (!best || score > best.score || (score === best.score && delta > best.delta)) {
      best = { ticker, score, delta }
    }
  }
  return best
}

export function SagePickCard({ data }: Props) {
  const pick = pickTopTicker(data)
  if (!pick) return null

  const { ticker, score, delta } = pick

  return (
    <div className="ti-card border border-accent/20 bg-accent/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">✦ Sage Pick</span>
        {data.generatedAt && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {new Date(data.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Link href={`/stock/${ticker}`} className="text-2xl font-bold mono hover:text-accent transition-colors">
          {ticker}
        </Link>
        <ScoreBadge score={score} delta={delta} size="lg" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Highest convergence score today with{' '}
        {delta > 0 ? (
          <span className="text-green-400 font-semibold">+{delta} point momentum</span>
        ) : delta < 0 ? (
          <span className="text-red-400 font-semibold">{delta} point pullback</span>
        ) : (
          <span>flat momentum</span>
        )}{' '}
        over 7 days. All 5 signal layers checked.
      </p>

      <Link
        href={`/stock/${ticker}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
      >
        Full analysis →
      </Link>
    </div>
  )
}
