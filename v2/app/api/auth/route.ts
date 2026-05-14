// app/api/auth/route.ts — Google OAuth + session management
// Uses NextAuth under the hood; this route handles additional user sync
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProStatus } from '@/lib/redis'

// Verify a Google ID token and return/create the user
export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()
    if (!credential) return NextResponse.json({ ok: false, error: 'credential required' }, { status: 400 })

    // Verify with Google
    const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!gRes.ok) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
    const info = await gRes.json()
    if (info.error || !info.email) return NextResponse.json({ ok: false, error: 'Token verification failed' }, { status: 401 })

    const email = info.email.toLowerCase().trim()

    // Check Pro status from KV (fast path)
    const proData = await getProStatus(email)
    const isPro   = !!(proData?.active)

    // Upsert user in DB
    const user = await db.user.upsert({
      where:  { email },
      update: { name: info.name, picture: info.picture, googleId: info.sub, isPro },
      create: { email, name: info.name, picture: info.picture, googleId: info.sub, isPro }
    })

    // Return user + watchlist
    const watchlist = await db.watchlistItem.findMany({
      where: { userId: user.id },
      select: { tickerId: true, addedAt: true }
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id, email: user.email, name: user.name,
        picture: user.picture, isPro: user.isPro
      },
      watchlist: watchlist.map(w => w.tickerId)
    })
  } catch (err) {
    console.error('/api/auth error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

// GET /api/auth?email=... → quick Pro status check
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 })
  const proData = await getProStatus(email.toLowerCase().trim())
  return NextResponse.json({ ok: true, pro: !!(proData?.active) })
}
