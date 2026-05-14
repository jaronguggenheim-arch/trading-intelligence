// app/api/signals/route.ts — Signal cards API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/signals              → latest signals across all tickers
// GET /api/signals?ticker=NVDA  → signals for one ticker
// GET /api/signals?layer=4      → L4 supply chain signals only
// GET /api/signals?type=INSIDER_CLUSTER
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const ticker = searchParams.get('ticker')
  const layer  = searchParams.get('layer') ? parseInt(searchParams.get('layer')!) : null
  const type   = searchParams.get('type')
  const limit  = parseInt(searchParams.get('limit') || '20')

  try {
    const where: any = {}
    if (ticker) where.tickerId = ticker
    if (layer)  where.layer   = layer
    if (type)   where.type    = type

    // Exclude expired signals
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } }
    ]

    const signals = await db.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        ticker: { select: { id: true, name: true, sector: true } }
      }
    })

    return NextResponse.json({ ok: true, data: signals })
  } catch (err) {
    console.error('/api/signals error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
