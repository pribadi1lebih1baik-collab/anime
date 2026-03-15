import { NextRequest, NextResponse } from 'next/server'
import { donghuaAPI } from '@/lib/api/donghua'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const server   = searchParams.get('server')   || 'hd-1'
  const category = searchParams.get('category') || 'sub'
  const episodeId = decodeURIComponent(params.slug)

  try {
    const sourcesRaw = await donghuaAPI.getEpisodeSources(episodeId, server, category)
    const sd = (sourcesRaw.data as Record<string, unknown>) || {}

    const streams = ((sd.sources as Record<string, unknown>[]) || [])
      .map(s => ({
        quality: String(s.quality || 'AUTO'),
        url:     String(s.url || ''),
        isM3U8:  Boolean(s.isM3U8 || String(s.url || '').includes('.m3u8')),
      }))
      .filter(s => s.url)

    const subtitles = ((sd.tracks as Record<string, unknown>[]) || [])
      .filter(t => t.kind === 'captions')
      .map(t => ({
        label:   String(t.label || ''),
        url:     String(t.file  || ''),
        default: Boolean(t.default) || String(t.label || '').toLowerCase().includes('indo'),
      }))

    return NextResponse.json({ streams, subtitles })
  } catch (e) {
    return NextResponse.json({ error: String(e), streams: [] }, { status: 500 })
  }
}
