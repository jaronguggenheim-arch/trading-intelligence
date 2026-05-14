// app/sectors/page.tsx — Sector heatmap (stub)
export const revalidate = 1800

export default function SectorsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Sectors</p>
      <h1 className="text-2xl font-bold mb-6">Sector Intelligence</h1>
      <div className="ti-card text-center py-12">
        <p className="text-sm text-muted-foreground">Sector heatmap coming soon.</p>
        <p className="text-xs text-muted-foreground mt-2">Which sectors have the most chain signals converging right now.</p>
      </div>
    </main>
  )
}
