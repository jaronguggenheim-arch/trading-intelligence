// components/ui/ScoreLeaderboard.tsx
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'

interface Props {
  scores?: Record<string, number>
  deltas?: Record<string, number>
}

export function ScoreLeaderboard({ scores, deltas }: Props) {
  if (!scores) return null

  const sorted = Object.entries(scores)
    .map(([ticker, score]) => ({ ticker, score, delta: deltas?.[ticker] ?? 0 }))
    .sort((a, b) => b.score - a.score || b.delta - a.delta)
    .slice(0, 10)

  return (
    <div className="ti-card">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Signal Score Leaderboard
      </h2>
      <div className="space-y-2">
        {sorted.map(({ ticker, score, delta }, i) => (
          <Link
            key={ticker}
            href={`/stock/${ticker}`}
            className="flex items-center gap-3 hover:bg-white/5 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-xs text-muted-foreground w-4 text-right mono">{i + 1}</span>
            <span className="text-sm font-bold mono flex-1">{ticker}</span>
            <ScoreBadge score={score} delta={delta} size="sm" />
          </Link>
        ))}
      </div>
    </div>
  )
}
