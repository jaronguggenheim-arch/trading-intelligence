// app/markets/page.tsx — Market overview (stub)
export const revalidate = 300

export default function MarketsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Markets</p>
      <h1 className="text-2xl font-bold mb-6">Market Overview</h1>
      <div className="ti-card text-center py-12">
        <p className="text-sm text-muted-foreground">Market overview coming soon.</p>
        <p className="text-xs text-muted-foreground mt-2">Index prices, sector performance, macro signals.</p>
      </div>
    </main>
  )
}
