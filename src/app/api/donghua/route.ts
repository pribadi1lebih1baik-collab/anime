import { NextRequest, NextResponse } from 'next/server'
import { donghuaAPI, normalizeDonghua } from '@/lib/api/donghua'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'ongoing'
  const page = parseInt(searchParams.get('page') || '1')

  try {
    let raw: Record<string, unknown>
    if (type === 'completed') {
      raw = await donghuaAPI.getCompleted(page)
    } else {
      raw = await donghuaAPI.getOngoing(page)
    }

    const d    = (raw.data as Record<string, unknown>) || {}
    const list = (d.animes as Record<string, unknown>[]) || []

    return NextResponse.json({
      data: list.map(normalizeDonghua),
      has_next: Boolean(d.hasNextPage),
    })
  } catch (e) {
    const msg = String(e)
    if (msg.includes('ANIWATCH_API_BASE_NOT_SET')) {
      return NextResponse.json({ error: 'ANIWATCH_API_BASE belum diset', data: [] }, { status: 503 })
    }
    return NextResponse.json({ error: msg, data: [] }, { status: 500 })
  }
}
