import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { FileText, Calendar, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/features/transcriptions/copy-button'

interface Segment { start: number; end: number; text: string }

interface TranscriptionDetail {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  text: string | null
  segments: Segment[] | null
  keywords: string[] | null
  errorMsg: string | null
  videoUrl: string
  title: string | null
  duration: number | null
  createdAt: string
}

async function fetchTranscription(id: string): Promise<TranscriptionDetail | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const res = await fetch(`${backendUrl}/api/v1/transcriptions/${id}`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) redirect('/login')
  const body = await res.json()
  return body.data ?? body
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Video embed helper ────────────────────────────────────────────────────────

type EmbedInfo =
  | { type: 'youtube'; embedUrl: string }
  | { type: 'tiktok'; embedUrl: string }
  | { type: 'instagram'; originalUrl: string }
  | null

function getEmbedInfo(videoUrl: string): EmbedInfo {
  const yt = videoUrl.match(/youtube\.com\/shorts\/([\w-]+)/)
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` }

  const tt = videoUrl.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)
  if (tt) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}` }

  const ig = videoUrl.match(/instagram\.com\/reel\/([\w-]+)/)
  if (ig) return { type: 'instagram', originalUrl: videoUrl }

  return null
}

export default async function TranscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await fetchTranscription(id)
  if (!tx) notFound()

  const hasSegments = (tx.segments?.length ?? 0) > 0
  const hasKeywords = (tx.keywords?.length ?? 0) > 0
  const embed = getEmbedInfo(tx.videoUrl)

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div 
        className="mobile-stack"
        style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#F2F2F2', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} color="#5E6AD2" />
            {tx.title ?? 'Transcription'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8B8B8B' }}>
              <Calendar size={12} />
              {new Date(tx.createdAt).toLocaleString('fr-FR')}
            </div>
            {tx.duration != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8B8B8B' }}>
                <Clock size={12} />
                {formatTime(tx.duration)}
              </div>
            )}
            <a href={tx.videoUrl} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5E6AD2', textDecoration: 'none', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <ExternalLink size={11} />
              {tx.videoUrl}
            </a>
          </div>
        </div>
        {tx.status === 'COMPLETED' && tx.text && <CopyButton text={tx.text} />}
      </div>

      {tx.status === 'COMPLETED' && tx.text ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Video player */}
          {embed && <VideoPlayer embed={embed} />}

          {/* Keywords */}
          {hasKeywords && (
            <div>
              <p style={{ fontSize: 12, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Mots-clés</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tx.keywords!.map((kw, i) => (
                  <span key={i} style={{ fontSize: 12, color: '#A5B4FC', background: 'rgba(94,106,210,0.12)', border: '1px solid rgba(94,106,210,0.25)', padding: '3px 10px', borderRadius: 20 }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcription */}
          <div>
            <p style={{ fontSize: 12, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Transcription</p>
            {hasSegments ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tx.segments!.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '8px 14px', borderRadius: 6, background: '#111111', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 11, color: '#5E6AD2', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2, minWidth: 42, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />{formatTime(seg.start)}
                    </span>
                    <span style={{ fontSize: 14, color: '#E5E5E5', lineHeight: 1.6 }}>{seg.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 24px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap', color: '#E5E5E5', fontSize: 14, lineHeight: 1.75 }}>
                {tx.text}
              </div>
            )}
          </div>
        </div>
      ) : tx.status === 'FAILED' ? (
        <div style={{ padding: '16px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ color: '#EF4444', fontSize: 14, margin: 0, fontWeight: 500 }}>La transcription a échoué.</p>
            <p style={{ color: '#8B8B8B', fontSize: 13, margin: '6px 0 0' }}>Vidéo privée ou inaccessible. 1 crédit a été remboursé automatiquement.</p>
            {tx.errorMsg && <p style={{ color: '#555', fontSize: 12, margin: '8px 0 0', fontFamily: 'monospace' }}>{tx.errorMsg}</p>}
          </div>
        </div>
      ) : (
        <div style={{ color: '#8B8B8B', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={18} className="animate-spin" />
          Traitement en cours… Actualisez la page dans quelques instants.
        </div>
      )}
    </div>
  )
}

// ─── VideoPlayer ───────────────────────────────────────────────────────────────

function VideoPlayer({ embed }: { embed: NonNullable<EmbedInfo> }) {
  if (embed.type === 'instagram') {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, background: '#111', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#8B8B8B' }}>Instagram Reels ne supporte pas l'intégration directe.</span>
        <a href={embed.originalUrl} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, background: 'rgba(94,106,210,0.15)', color: '#5E6AD2', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          <ExternalLink size={13} /> Ouvrir Instagram
        </a>
      </div>
    )
  }

  const aspectRatio = embed.type === 'tiktok' ? '9/16' : '9/16'
  const maxHeight = embed.type === 'tiktok' ? 640 : 560
  const maxWidth = embed.type === 'tiktok' ? 320 : 315

  return (
    <div>
      <p style={{ fontSize: 12, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Vidéo</p>
      <div style={{ maxWidth, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#000' }}>
        <iframe
          src={embed.embedUrl}
          style={{ display: 'block', width: '100%', aspectRatio, maxHeight, border: 'none' }}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
