// app/api/scores/route.ts — Score data API
import { NextRequest, NextResponse } from 'next/server'
import { getScores, getScoreHistory, getTopMovers } from '@/lib/scores'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const revalidate = 300 // 5-min ISR for this route

// GET /api/scores                → all current scores + deltas
// GET /api/scores?ticker=NVDA    → single ticker score + history
// GET /api/scores?movers=up|down → top score movers
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const ticker = searchParams.get('ticker')
  const movers = searchParams.get('movers') as 'up' | 'down' | null
  const days   = parseInt(searchParams.get('days') || '30')

  try {
    if (movers) {
      const data = await getTopMovers(10, movers)
      return NextResponse.json({ ok: true, data })
    }

    if (ticker) {
      const [score, history] = await Promise.all([
        db.score.findFirst({
          where: { tickerId: ticker },
          orderBy: { date: 'desc' }
        }),
        getScoreHistory(ticker, days)
      ])
      return NextResponse.json({ ok: true, data: { score, history } })
    }

    const bundle = await getScores()
    return NextResponse.json({ ok: true, data: bundle })
  } catch (err) {
    console.error('/api/scores error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
