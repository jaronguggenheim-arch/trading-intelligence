// components/ui/InsiderTab.tsx
interface InsiderEvent {
  id:              string
  personName:      string
  role:            string | null
  transactionType: string
  shares:          number
  pricePerShare:   number | null
  totalValue:      number | null
  transactionDate: Date | string
  formUrl:         string | null
}

interface Props {
  events: InsiderEvent[]
}

function formatDollars(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function InsiderTab({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="ti-card text-center py-8">
        <p className="text-sm text-muted-foreground">No recent insider transactions on file.</p>
      </div>
    )
  }

  const buys  = events.filter(e => e.transactionType === 'BUY')
  const sells = events.filter(e => e.transactionType === 'SELL')

  const Section = ({ title, items }: { title: string; items: InsiderEvent[] }) => (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map(e => (
          <div key={e.id} className="ti-card">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className="text-sm font-semibold">{e.personName}</span>
                {e.role && <span className="text-xs text-muted-foreground ml-1.5">{e.role}</span>}
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                e.transactionType === 'BUY'
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}>
                {e.transactionType}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{e.shares.toLocaleString()} shares</span>
              {e.pricePerShare && <span>@ ${e.pricePerShare.toFixed(2)}</span>}
              <span className="font-semibold text-foreground">{formatDollars(e.totalValue)}</span>
              <span className="ml-auto">
                {new Date(e.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {e.formUrl && (
              <a
                href={e.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-accent hover:underline mt-1 inline-block"
              >
                Form 4 →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className="space-y-5">
      {buys.length > 0  && <Section title="Insider Buys"  items={buys}  />}
      {sells.length > 0 && <Section title="Insider Sells" items={sells} />}
    </div>
  )
}
