// components/ui/ChainWindowCard.tsx
import Link from 'next/link'

interface ChainRelationship {
  upstream:   { id: string; name: string }
  downstream: { id: string; name: string }
}
interface ChainEvent {
  id:           string
  triggeredAt:  string
  lagWeeksMin:  number
  lagWeeksMax:  number
  description:  string
  relationship: ChainRelationship
}

interface Props {
  event: ChainEvent
}

function weeksRemaining(triggeredAt: string, lagMax: number) {
  const triggered = new Date(triggeredAt).getTime()
  const windowClose = triggered + lagMax * 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const daysLeft = Math.max(0, Math.round((windowClose - now) / (24 * 60 * 60 * 1000)))
  return daysLeft
}

export function ChainWindowCard({ event }: Props) {
  const { upstream, downstream } = event.relationship
  const daysLeft = weeksRemaining(event.triggeredAt, event.lagWeeksMax)
  const urgency = daysLeft < 14 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-green-400'

  return (
    <div className="ti-card">
      {/* Chain path */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/stock/${upstream.id}`} className="text-xs font-bold mono text-accent hover:underline">
          {upstream.id}
        </Link>
        <span className="text-muted-foreground text-xs">→</span>
        <Link href={`/stock/${downstream.id}`} className="text-xs font-bold mono text-accent hover:underline">
          {downstream.id}
        </Link>
        <span className="ml-auto text-[11px] font-semibold mono bg-white/5 px-2 py-0.5 rounded-full">
          {event.lagWeeksMin}–{event.lagWeeksMax}w lag
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{event.description}</p>

      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-muted-foreground">
          Triggered {new Date(event.triggeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className={`font-semibold ${urgency}`}>
          {daysLeft > 0 ? `${daysLeft}d remaining` : 'Window closing'}
        </span>
      </div>
    </div>
  )
}
