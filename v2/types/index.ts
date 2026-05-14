// Core types for Trading Intelligence v2
// These mirror the Prisma schema but are usable client-side without importing Prisma

export interface TickerMeta {
  id: string
  name: string
  sector: string
  description?: string
}

export interface ScoreData {
  tickerId: string
  date: string
  score: number
  l1Score?: number
  l2Score?: number
  l3Score?: number
  l4Score?: number
  l5Score?: number
  delta7d?: number
  delta30d?: number
  computedAt: string
}

export interface SignalCard {
  id: string
  tickerId: string
  type: SignalType
  layer: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  direction?: 'bull' | 'bear' | 'neutral'
  strength?: number
  source?: string
  createdAt: string
}

export type SignalType =
  | 'CHAIN_WINDOW'
  | 'INSIDER_CLUSTER'
  | 'ANALYST_UPGRADE'
  | 'ANALYST_CASCADE'
  | 'SCORE_SPIKE'
  | 'SUPPLY_DISRUPTION'
  | 'EARNINGS_CATALYST'
  | 'MACRO_SHIFT'
  | 'OPTIONS_FLOW'
  | 'CONGRESS_TRADE'

export interface ChainRelationship {
  id: string
  upstreamId: string
  downstreamId: string
  metric: string
  lagWeeks: number
  lagMin?: number
  lagMax?: number
  description: string
  direction: 'bull' | 'bear'
  strength: number
  backtestN?: number
  backtestWinRate?: number
}

export interface ChainEvent {
  id: string
  relationshipId: string
  triggeredAt: string
  anchorValue?: number
  anchorDelta?: number
  windowOpenAt: string
  windowCloseAt: string
  status: ChainEventStatus
  resolvedReturn?: number
  // joined:
  upstream?: TickerMeta
  downstream?: TickerMeta
  relationship?: ChainRelationship
}

export type ChainEventStatus = 'ACTIVE' | 'WIN' | 'LOSS' | 'NEUTRAL' | 'EXPIRED'

export interface InsiderEvent {
  id: string
  tickerId: string
  insiderName: string
  insiderTitle?: string
  transactionType: 'BUY' | 'SELL'
  shares: number
  pricePerShare?: number
  totalValue?: number
  transactionDate: string
}

export interface AnalystEvent {
  id: string
  tickerId: string
  firm: string
  analyst?: string
  action: 'UPGRADE' | 'DOWNGRADE' | 'INITIATE' | 'REITERATE'
  fromRating?: string
  toRating?: string
  priceTarget?: number
  headline: string
  publishedAt: string
}

export interface SagePick {
  id: string
  tickerId: string
  score: number
  entryPrice?: number
  pickDate: string
  reasons: string[]
  status: 'OPEN' | 'WIN' | 'LOSS' | 'NEUTRAL'
  resolvedAt?: string
  resolvedPrice?: number
  returnPct?: number
  // joined:
  ticker?: TickerMeta
}

export interface MorningBriefData {
  date: string
  sagePick: SagePick & { ticker: TickerMeta; score: ScoreData }
  topSignals: SignalCard[]
  activeChainWindows: (ChainEvent & { upstream: TickerMeta; downstream: TickerMeta })[]
  scoreLeaders: (ScoreData & { ticker: TickerMeta })[]
  marketContext: string
  generatedAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  picture?: string
  isPro: boolean
}

export interface Alert {
  id: string
  tickerId: string
  type: AlertType
  threshold?: number
  message?: string
  isActive: boolean
}

export type AlertType =
  | 'SCORE_ABOVE'
  | 'SCORE_BELOW'
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'CHAIN_WINDOW_OPEN'
  | 'INSIDER_CLUSTER'

// ── API response wrappers ─────────────────────────────────────────────────────
export interface ApiOk<T> {
  ok: true
  data: T
}
export interface ApiError {
  ok: false
  error: string
}
export type ApiResponse<T> = ApiOk<T> | ApiError

// ── Score velocity helpers ────────────────────────────────────────────────────
export function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#94a3b8'
  return '#ef4444'
}

export function velocityArrow(delta?: number): '▲' | '▼' | '→' | '' {
  if (delta === undefined || delta === null) return ''
  if (delta >= 5) return '▲'
  if (delta <= -5) return '▼'
  return '→'
}

export function formatValue(v: number): string {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K'
  return '$' + Math.round(v)
}
