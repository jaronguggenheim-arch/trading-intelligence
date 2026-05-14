// lib/scores.ts — Score computation and retrieval
import { db } from './db'
import { redis, KEYS, TTL } from './redis'

export interface ScoreBundle {
  scores: Record<string, number>
  deltas: Record<string, number>
  computedAt: string
}

// Get today's scores — KV cache first, then DB
export async function getScores(): Promise<ScoreBundle> {
  const cached = await redis.get<ScoreBundle>(KEYS.scores())
  if (cached) return cached

  const today = new Date().toISOString().slice(0, 10)
  const rows = await db.score.findMany({
    where: { date: new Date(today) },
    select: { tickerId: true, score: true, delta7d: true, computedAt: true }
  })

  const scores: Record<string, number> = {}
  const deltas: Record<string, number> = {}
  let computedAt = new Date().toISOString()

  for (const row of rows) {
    scores[row.tickerId] = row.score
    if (row.delta7d !== null) deltas[row.tickerId] = row.delta7d
    computedAt = row.computedAt.toISOString()
  }

  const bundle: ScoreBundle = { scores, deltas, computedAt }
  await redis.set(KEYS.scores(), bundle, { ex: TTL.SCORE })
  return bundle
}

// Score history for a single ticker (last N days)
export async function getScoreHistory(tickerId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return db.score.findMany({
    where: { tickerId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, score: true, delta7d: true, l1Score: true, l2Score: true, l3Score: true, l4Score: true, l5Score: true }
  })
}

// Top movers by score delta
export async function getTopMovers(limit = 10, direction: 'up' | 'down' = 'up') {
  const today = new Date().toISOString().slice(0, 10)
  return db.score.findMany({
    where: { date: new Date(today), delta7d: direction === 'up' ? { gt: 0 } : { lt: 0 } },
    orderBy: { delta7d: direction === 'up' ? 'desc' : 'asc' },
    take: limit,
    include: { ticker: { select: { id: true, name: true, sector: true } } }
  })
}
