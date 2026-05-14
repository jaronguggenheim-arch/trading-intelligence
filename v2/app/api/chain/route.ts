// app/api/chain/route.ts — Supply chain data + active propagation windows
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { redis, KEYS } from '@/lib/redis'

export const runtime = 'nodejs'

// GET /api/chain                      → all active chain windows
// GET /api/chain?downstream=NVDA      → windows where NVDA is downstream
// GET /api/chain?upstream=TSM         → windows where TSM is upstream
// GET /api/chain?relationship=id      → events for a specific relationship
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const downstream     = searchParams.get('downstream')
  const upstream       = searchParams.get('upstream')
  const relationshipId = searchParams.get('relationship')

  try {
    if (relationshipId) {
      const events = await db.chainEvent.findMany({
        where: { relationshipId },
        orderBy: { triggeredAt: 'desc' },
        take: 20,
        include: { relationship: { include: { upstream: true, downstream: true } } }
      })
      return NextResponse.json({ ok: true, data: events })
    }

    // Active windows — cached in Redis
    const cached = await redis.get<any[]>(KEYS.chainWindows())
    if (cached && !downstream && !upstream) {
      return NextResponse.json({ ok: true, data: cached, cached: true })
    }

    const where: any = { status: 'ACTIVE' }
    if (downstream) where.relationship = { downstreamId: downstream }
    if (upstream)   where.relationship = { upstreamId:   upstream }

    const windows = await db.chainEvent.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      include: {
        relationship: {
          include: {
            upstream:   { select: { id: true, name: true, sector: true } },
            downstream: { select: { id: true, name: true, sector: true } }
          }
        }
      }
    })

    return NextResponse.json({ ok: true, data: windows })
  } catch (err) {
    console.error('/api/chain error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
