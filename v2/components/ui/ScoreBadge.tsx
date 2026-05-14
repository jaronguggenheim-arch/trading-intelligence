// components/ui/ScoreBadge.tsx
import { scoreColor } from '@/types'

interface Props {
  score: number
  delta?: number
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function ScoreBadge({ score, delta, size = 'md' }: Props) {
  const color = scoreColor(score)
  const colorMap: Record<string, string> = {
    green: 'text-green-400 bg-green-400/10 border border-green-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
    red:   'text-red-400   bg-red-400/10   border border-red-400/20',
    muted: 'text-slate-400 bg-slate-400/10 border border-slate-400/20',
  }

  const velClass =
    delta === undefined ? '' :
    delta > 3  ? 'text-green-400' :
    delta < -3 ? 'text-red-400' : 'text-slate-400'

  const velArrow =
    delta === undefined ? '' :
    delta > 3  ? '↑' :
    delta < -3 ? '↓' : '→'

  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-bold mono ${sizes[size]} ${colorMap[color]}`}>
      {score}
      {delta !== undefined && (
        <span className={`text-[10px] font-semibold ${velClass}`}>
          {velArrow}{Math.abs(delta)}
        </span>
      )}
    </span>
  )
}
