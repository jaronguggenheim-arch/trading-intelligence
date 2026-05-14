// app/morning-brief/page.tsx — Morning Brief page (server component)
import { Suspense } from 'react'
import { getMorningBrief } from '@/lib/redis'
import { getScores } from '@/lib/scores'
import { db } from '@/lib/db'
import { SagePickCard } from '@/components/ui/SagePickCard'
import { SignalCard } from '@/components/ui/SignalCard'
import { ChainWindowCard } from '@/components/ui/ChainWindowCard'
import { ScoreLeaderboard } from '@/components/ui/ScoreLeaderboard'

export const revalidate = 1800 // revalidate every 30min

async function getMorningData() {
  const today = new Date().toISOString().slice(0, 10)

  // Try KV cache first
  const cached = await getMorningBrief(today)
  if (cached) return cached

  // Fall back to live DB query
  const [scoreBundle, topSignals, activeWindows] = await Promise.all([
    getScores(),
    db.signal.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }]
      },
      orderBy: [{ layer: 'asc' }, { createdAt: 'desc' }],
      take: 10,
      include: { ticker: { select: { id: true, name: true, sector: true } } }
    }),
    db.chainEvent.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
      include: {
        relationship: {
          include: {
            upstream:   { select: { id: true, name: true } },
            downstream: { select: { id: true, name: true } }
          }
        }
      }
    })
  ])

  return { scoreBundle, topSignals, activeWindows, generatedAt: new Date().toISOString() }
}

export default async function MorningBriefPage() {
  const data = await getMorningData()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">
          Morning Brief · {today}
        </p>
        <h1 className="text-2xl font-bold">What fired overnight.</h1>
      </div>

      {/* Sage pick */}
      <Suspense fallback={<div className="ti-card animate-pulse h-32" />}>
        <SagePickCard data={data} />
      </Suspense>

      {/* Active chain windows */}
      {data.activeWindows?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Active chain windows
          </h2>
          <div className="space-y-2">
            {data.activeWindows.map((w: any) => (
              <ChainWindowCard key={w.id} event={w} />
            ))}
          </div>
        </section>
      )}

      {/* Top signals */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Top signals today
        </h2>
        <div className="space-y-2">
          {data.topSignals?.map((s: any) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      </section>

      {/* Score leaderboard */}
      <Suspense fallback={<div className="ti-card animate-pulse h-48" />}>
        <ScoreLeaderboard scores={data.scoreBundle?.scores} deltas={data.scoreBundle?.deltas} />
      </Suspense>
    </main>
  )
}
