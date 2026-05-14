// components/ui/ChainTab.tsx — supply chain relationships for a ticker
import { db } from '@/lib/db'
import Link from 'next/link'
import { ChainWindowCard } from './ChainWindowCard'

interface Props {
  ticker: string
}

export async function ChainTab({ ticker }: Props) {
  const [upstreamRels, downstreamRels, activeWindows] = await Promise.all([
    db.chainRelationship.findMany({
      where: { downstreamId: ticker },
      include: { upstream: { select: { id: true, name: true } }, downstream: { select: { id: true, name: true } } },
    }),
    db.chainRelationship.findMany({
      where: { upstreamId: ticker },
      include: { upstream: { select: { id: true, name: true } }, downstream: { select: { id: true, name: true } } },
    }),
    db.chainEvent.findMany({
      where: {
        status: 'ACTIVE',
        relationship: { OR: [{ upstreamId: ticker }, { downstreamId: ticker }] },
      },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
      include: {
        relationship: {
          include: {
            upstream:   { select: { id: true, name: true } },
            downstream: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ])

  const hasData = upstreamRels.length > 0 || downstreamRels.length > 0

  if (!hasData) {
    return (
      <div className="ti-card text-center py-8">
        <p className="text-sm text-muted-foreground">No supply chain relationships mapped for {ticker} yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active windows */}
      {activeWindows.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Active lag windows
          </h2>
          <div className="space-y-2">
            {activeWindows.map(w => (
              <ChainWindowCard key={w.id} event={w as any} />
            ))}
          </div>
        </section>
      )}

      {/* Upstream nodes */}
      {upstreamRels.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Upstream signals → {ticker}
          </h2>
          <div className="space-y-2">
            {upstreamRels.map(rel => (
              <div key={rel.id} className="ti-card flex items-start gap-3">
                <Link href={`/stock/${rel.upstream.id}`} className="text-sm font-bold mono text-accent hover:underline shrink-0">
                  {rel.upstream.id}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{rel.description}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Lag: {rel.lagWeeksMin}–{rel.lagWeeksMax} weeks
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Downstream nodes */}
      {downstreamRels.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            {ticker} signals → downstream
          </h2>
          <div className="space-y-2">
            {downstreamRels.map(rel => (
              <div key={rel.id} className="ti-card flex items-start gap-3">
                <Link href={`/stock/${rel.downstream.id}`} className="text-sm font-bold mono text-accent hover:underline shrink-0">
                  {rel.downstream.id}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{rel.description}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Lag: {rel.lagWeeksMin}–{rel.lagWeeksMax} weeks
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
