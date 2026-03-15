'use client'
import { useState, useRef, useEffect } from 'react'
import { SkipForward, SkipBack, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamSource {
  quality?: string
  url: string
  type?: string
  isM3U8?: boolean
}

interface Subtitle {
  label: string
  url: string
  default?: boolean
}

interface VideoPlayerProps {
  sources: StreamSource[]
  subtitles?: Subtitle[]
  title?: string
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
  intro?: { start: number; end: number } | null
  outro?: { start: number; end: number } | null
  onTimeUpdate?: (time: number) => void
}

export default function VideoPlayer({
  sources, subtitles = [], title,
  onNext, onPrev, hasNext, hasPrev,
  intro, outro, onTimeUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<unknown>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showSkipIntro, setShowSkipIntro] = useState(false)
  const [showSkipOutro, setShowSkipOutro] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const selected = sources[selectedIdx]
  const isHLS = Boolean(selected?.isM3U8 || selected?.url?.includes('.m3u8'))

  // Load HLS.js dynamically
  useEffect(() => {
    if (!selected?.url) return

    // Destroy previous HLS instance
    if (hlsRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (hlsRef.current as any).destroy?.()
      hlsRef.current = null
    }

    setIsLoading(true)

    if (!isHLS) {
      // Direct MP4 — just set src
      if (videoRef.current) {
        videoRef.current.src = selected.url
        videoRef.current.load()
      }
      return
    }

    // HLS stream
    const loadHLS = async () => {
      try {
        const Hls = (await import('hls.js')).default

        if (!Hls.isSupported()) {
          // Safari supports HLS natively
          if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = selected.url
          }
          return
        }

        const hls = new Hls({ enableWorker: false })
        hlsRef.current = hls
        hls.loadSource(selected.url)
        hls.attachMedia(videoRef.current!)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false)
          videoRef.current?.play().catch(() => {})
        })
        hls.on(Hls.Events.ERROR, (_: unknown, data: Record<string, unknown>) => {
          if (data.fatal) setIsLoading(false)
        })
      } catch {
        setIsLoading(false)
      }
    }

    loadHLS()

    return () => {
      if (hlsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (hlsRef.current as any).destroy?.()
        hlsRef.current = null
      }
    }
  }, [selected?.url, isHLS])

  // Skip intro/outro
  useEffect(() => {
    if (intro) setShowSkipIntro(currentTime >= intro.start && currentTime <= intro.end)
    if (outro) setShowSkipOutro(currentTime >= outro.start && currentTime <= outro.end)
  }, [currentTime, intro, outro])

  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime || 0
    setCurrentTime(t)
    onTimeUpdate?.(t)
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="w-full aspect-video bg-black rounded-xl flex flex-col items-center justify-center gap-3">
        <p className="text-white/60">Video tidak tersedia</p>
        <p className="text-white/40 text-sm">Coba refresh halaman</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl overflow-hidden bg-black">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-10 h-10 text-accent-primary animate-spin" />
              <p className="text-white/60 text-sm">Memuat video...</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          controls
          autoPlay
          crossOrigin="anonymous"
          onLoadedData={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setIsLoading(false)}
        >
          {subtitles.map((sub, i) => (
            <track
              key={i}
              kind="subtitles"
              label={sub.label}
              src={sub.url}
              default={sub.default || sub.label.toLowerCase().includes('indo')}
            />
          ))}
        </video>

        {showSkipIntro && (
          <button
            onClick={() => { if (videoRef.current && intro) videoRef.current.currentTime = intro.end }}
            className="absolute bottom-16 right-4 z-30 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-sm font-medium rounded-lg transition-all"
          >
            ⏭ Skip Intro
          </button>
        )}

        {showSkipOutro && (
          <button
            onClick={() => { if (videoRef.current && outro) videoRef.current.currentTime = outro.end }}
            className="absolute bottom-16 right-4 z-30 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white text-sm font-medium rounded-lg transition-all"
          >
            ⏭ Skip Outro
          </button>
        )}
      </div>

      {/* Server & navigation bar */}
      <div className="bg-bg-secondary px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-muted text-xs font-medium uppercase tracking-wide">Kualitas:</span>
          {sources.map((src, i) => (
            <button
              key={i}
              onClick={() => { setSelectedIdx(i); setIsLoading(true) }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                selectedIdx === i
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border'
              )}
            >
              {src.quality || `Stream ${i + 1}`}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {hasPrev && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors border border-border"
              >
                <SkipBack size={13} /> Episode Sebelumnya
              </button>
            )}
          </div>
          <div>
            {hasNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary hover:bg-accent-secondary rounded-lg text-xs text-white transition-colors"
              >
                Episode Berikutnya <SkipForward size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
