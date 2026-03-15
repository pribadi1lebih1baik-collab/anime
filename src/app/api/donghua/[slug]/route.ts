import { NextRequest, NextResponse } from 'next/server'
import { donghuaAPI, normalizeDonghua } from '@/lib/api/donghua'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const [detailRaw, episodesRaw] = await Promise.allSettled([
      donghuaAPI.getDetail(params.slug),
      donghuaAPI.getEpisodes(params.slug),
    ])

    if (detailRaw.status === 'rejected') {
      return NextResponse.json({ error: String(detailRaw.reason) }, { status: 500 })
    }

    const d        = (detailRaw.value.data as Record<string, unknown>) || {}
    const animeObj = (d.anime as Record<string, unknown>) || {}
    const info     = (animeObj.info as Record<string, unknown>) || {}
    const moreInfo = (animeObj.moreInfo as Record<string, unknown>) || {}
    const stats    = (info.stats as Record<string, unknown>) || {}

    const donghua = normalizeDonghua({
      id:          params.slug,
      name:        info.name || '',
      poster:      info.poster || '',
      description: info.description || '',
      status:      moreInfo.status || 'Ongoing',
      type:        stats.type || 'Donghua',
      genres:      moreInfo.genres || [],
      episodes:    stats.episodes || {},
    })

    let episodes: Record<string, unknown>[] = []
    if (episodesRaw.status === 'fulfilled') {
      const epData = (episodesRaw.value.data as Record<string, unknown>) || {}
      episodes = (epData.episodes as Record<string, unknown>[]) || []
    }

    return NextResponse.json({
      detail: donghua,
      episodes: episodes.map(ep => ({
        id:             String(ep.episodeId || ep.id || ''),
        episode_id:     String(ep.episodeId || ep.id || ''),
        slug:           String(ep.episodeId || ep.id || ''),
        title:          String(ep.title || `Episode ${ep.number}`),
        episode_number: Number(ep.number || 0),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
