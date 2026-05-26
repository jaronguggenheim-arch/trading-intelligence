// components/ui/SignalsTab.tsx
import { SignalCard } from './SignalCard'
import type { SignalCard as SignalCardData } from '@/types'

interface Props {
  signals: SignalCardData[]
}

export function SignalsTab({ signals }: Props) {
  if (!signals || signals.length === 0) {
    return (
      <div className="ti-card text-center py-8">
        <p className="text-sm text-muted-foreground">No active signals right now.</p>
      </div>
    )
  }

  // Group by layer
  const byLayer: Record<number, SignalCardData[]> = {}
  for (const s of signals) {
    if (!byLayer[s.layer]) byLayer[s.layer] = []
    byLayer[s.layer].push(s)
  }

  const LAYER_NAMES: Record<number, string> = {
    1: 'L1 · Market Structure',
    2: 'L2 · Insider / Regulatory',
    3: 'L3 · Corporate Intel',
    4: 'L4 · Supply Chain',
    5: 'L5 · Macro / Structural',
  }

  return (
    <div className="space-y-5">
      {[1, 2, 3, 4, 5].map(layer => {
        const layerSignals = byLayer[layer]
        if (!layerSignals?.length) return null
        return (
          <section key={layer}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {LAYER_NAMES[layer]}
            </h2>
            <div className="space-y-2">
              {layerSignals.map(s => <SignalCard key={s.id} signal={s} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
