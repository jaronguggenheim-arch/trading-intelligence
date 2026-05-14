// lib/redis.ts — Upstash Redis client for KV cache + real-time data
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// ── Key schema ────────────────────────────────────────────────────────────────
export const KEYS = {
  // Scores — computed nightly, cached 24h
  scores:       () => 'ti:v2:scores',
  scoreDeltas:  () => 'ti:v2:score_deltas',
  serverSignals:(ticker: string) => `ti:v2:signals:${ticker}`,

  // Chain signals — computed nightly
  chainWindows: () => 'ti:v2:chain_windows',
  chainEvents:  () => 'ti:v2:chain_events',

  // Morning Brief — computed nightly by cron
  morningBrief: (date: string) => `ti:v2:brief:${date}`,

  // User data — persisted
  proStatus:    (email: string) => `ti:pro:${email.toLowerCase().trim()}`,
  pushSubs:     (email: string) => `ti:push:${email.toLowerCase().trim()}`,

  // Live price cache — 5min TTL
  livePrice:    (ticker: string) => `ti:v2:price:${ticker}`,

  // Analyst signals cache — 6h TTL
  analystSigs:  () => 'ti:v2:analyst_signals',
} as const

// ── TTLs (seconds) ────────────────────────────────────────────────────────────
export const TTL = {
  SCORE:        24 * 60 * 60,      // 24h
  MORNING_BRIEF: 18 * 60 * 60,    // 18h
  LIVE_PRICE:   5 * 60,            // 5min
  ANALYST:      6 * 60 * 60,       // 6h
  PRO_STATUS:   400 * 24 * 60 * 60 // ~13 months
} as const

// ── Typed getters ─────────────────────────────────────────────────────────────
export async function getCachedScores(): Promise<Record<string, number> | null> {
  return redis.get<Record<string, number>>(KEYS.scores())
}

export async function getCachedScoreDeltas(): Promise<Record<string, number> | null> {
  return redis.get<Record<string, number>>(KEYS.scoreDeltas())
}

export async function getCachedChainWindows() {
  return redis.get<any[]>(KEYS.chainWindows())
}

export async function getMorningBrief(date: string) {
  return redis.get<any>(KEYS.morningBrief(date))
}

export async function getProStatus(email: string): Promise<{ active: boolean } | null> {
  return redis.get<{ active: boolean }>(KEYS.proStatus(email))
}
