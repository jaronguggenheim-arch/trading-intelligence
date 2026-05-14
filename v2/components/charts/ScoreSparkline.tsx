// components/charts/ScoreSparkline.tsx
'use client'

interface DataPoint {
  date: string
  score: number
}

interface Props {
  data: DataPoint[]
  height?: number
}

export function ScoreSparkline({ data, height = 48 }: Props) {
  if (!data || data.length < 2) return null

  const width = 320
  const pad = 4

  const scores = data.map(d => d.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1

  const toX = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2)
  const toY = (v: number) => pad + ((max - v) / range) * (height - pad * 2)

  const points = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ')
  const latest = data[data.length - 1]
  const first  = data[0]
  const trend  = latest.score - first.score
  const stroke = trend >= 0 ? '#22c55e' : trend < -5 ? '#ef4444' : '#f59e0b'

  // Area fill
  const areaPoints = [
    `${toX(0)},${height}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.score)}`),
    `${toX(data.length - 1)},${height}`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-grad)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest dot */}
      <circle
        cx={toX(data.length - 1)}
        cy={toY(latest.score)}
        r="3"
        fill={stroke}
      />
    </svg>
  )
}
