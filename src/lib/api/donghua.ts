// ============================================================
// DONGHUA API - Menggunakan AniWatch (sama dengan anime)
// HiAnime/AniWatch juga punya konten donghua/anime China
// Tidak butuh npm package tambahan
// ============================================================

const ANIWATCH_BASE = (
  process.env.ANIWATCH_API_BASE ||
  process.env.NEXT_PUBLIC_ANIWATCH_API_BASE ||
  ''
).replace(/\/$/, '')

async function fetchAW(endpoint: string, revalidate = 300) {
  if (!ANIWATCH_BASE) throw new Error('ANIWATCH_API_BASE_NOT_SET')
  const res = await fetch(`${ANIWATCH_BASE}${endpoint}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`AniWatch ${res.status}: ${endpoint}`)
  return res.json()
}

// Donghua = anime China, cari dengan keyword "chinese animation" atau "donghua"
export const donghuaAPI = {
  getOngoing: (page = 1) =>
    fetchAW(`/api/v2/hianime/search?q=chinese+animation&page=${page}`),

  getCompleted: (page = 1) =>
    fetchAW(`/api/v2/hianime/search?q=donghua&page=${page}`),

  search: (q: string) =>
    fetchAW(`/api/v2/hianime/search?q=${encodeURIComponent(q)}`),

  getDetail: (id: string) =>
    fetchAW(`/api/v2/hianime/anime/${id}`),

  getEpisodes: (id: string) =>
    fetchAW(`/api/v2/hianime/anime/${id}/episodes`),

  getEpisodeSources: (episodeId: string, server = 'hd-1', category = 'sub') =>
    fetchAW(`/api/v2/hianime/episode/sources?animeEpisodeId=${encodeURIComponent(episodeId)}&server=${server}&category=${category}`, 60),
}

export function normalizeDonghua(item: Record<string, unknown>) {
  return {
    id:             String(item.id || ''),
    slug:           String(item.id || ''),
    title:          String(item.name || item.title || ''),
    poster:         String(item.poster || item.image || ''),
    synopsis:       String(item.description || item.synopsis || ''),
    status:         'ongoing',
    type:           String(item.type || 'Donghua'),
    genres:         (item.genres as string[]) || [],
    rating:         parseFloat(String(item.rating || '0').replace('/10', '')) || 0,
    episodes_count: Number(
      (item.episodes as Record<string, unknown>)?.sub ||
      item.totalEpisodes || 0
    ),
  }
}
