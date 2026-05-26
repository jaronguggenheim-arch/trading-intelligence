// components/ui/SignalCard.tsx
import Link from 'next/link'
import type { SignalCard as SignalCardData } from '@/types'

const LAYER_LABELS: Record<number, string> = {
  1: 'L1 Market',
  2: 'L2 Insider',
  3: 'L3 Corporate',
  4: 'L4 Chain',
  5: 'L5 Macro',
}

const LAYER_COLORS: Record<number, string> = {
  1: 'text-blue-400   bg-blue-400/10',
  2: 'text-purple-400 bg-purple-400/10',
  3: 'text-amber-400  bg-amber-400/10',
  4: 'text-green-400  bg-green-400/10',
  5: 'text-slate-400  bg-slate-400/10',
}

interface Props {
  signal: SignalCardData
}

export function SignalCard({ signal }: Props) {
  const layerColor = LAYER_COLORS[signal.layer] ?? LAYER_COLORS[1]
  const layerLabel = LAYER_LABELS[signal.layer] ?? `L${signal.layer}`

  return (
    <div className="ti-card flex gap-3">
      {/* Layer pill */}
      <div className="shrink-0 pt-0.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${layerColor}`}>
          {layerLabel}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium leading-snug">{signal.title}</p>
          {signal.tickerId && (
            <Link
              href={`/stock/${signal.tickerId}`}
              className="shrink-0 text-xs mono font-bold text-accent hover:underline"
            >
              {signal.tickerId}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {signal.source && <span>{signal.source}</span>}
          {signal.source && <span>·</span>}
          <span>{new Date(signal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}
