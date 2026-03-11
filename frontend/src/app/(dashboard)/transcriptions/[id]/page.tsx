import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { FileText, Calendar, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/features/transcriptions/copy-button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <FileText size={20} />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-albert">
              {tx.title ?? 'Transcription'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar size={14} className="text-primary" />
              {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {tx.duration != null && (
              <div className="flex items-center gap-1.5 uppercase tracking-wider">
                <Clock size={14} className="text-primary" />
                {formatTime(tx.duration)}
              </div>
            )}
            <Button asChild variant="link" className="h-auto p-0 text-xs font-bold text-primary">
              <a href={tx.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 no-underline">
                <ExternalLink size={14} />
                Lien source
              </a>
            </Button>
          </div>
        </div>
      </div>

      {tx.status === 'COMPLETED' && tx.text ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            {/* Keywords */}
            {hasKeywords && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mots-clés</h3>
                <div className="flex flex-wrap gap-2">
                  {tx.keywords!.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transcription Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Texte complet</h3>
                {tx.text && <CopyButton text={tx.text} />}
              </div>
              {hasSegments ? (
                <div className="grid gap-3">
                  {tx.segments!.map((seg, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex gap-4">
                        <div className="shrink-0">
                           <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                            {formatTime(seg.start)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {seg.text}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {tx.text}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 h-fit lg:sticky lg:top-8">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Aperçu vidéo</h3>
            {embed ? (
               <VideoPlayer embed={embed} />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                   <FileText size={32} className="mx-auto text-muted-foreground/20 mb-4" />
                   <p className="text-xs text-muted-foreground">Aucun aperçu disponible.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : tx.status === 'FAILED' ? (
        <Card className="bg-destructive/5">
          <CardContent className="p-8 flex gap-4">
            <AlertCircle size={32} className="text-destructive shrink-0" />
            <div className="space-y-2">
              <CardTitle className="text-destructive font-bold font-albert">Échec de la transcription</CardTitle>
              <CardDescription>La vidéo est inaccessible. Le crédit a été remboursé.</CardDescription>
              {tx.errorMsg && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Une erreur technique s&apos;est produite. Notre équipe en est informée.
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                 <a href="/transcriptions">Réessayer</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Traitement en cours…</p>
        </div>
      )}
    </div>
  )
}

function VideoPlayer({ embed }: { embed: NonNullable<EmbedInfo> }) {
  if (embed.type === 'instagram') {
    return (
      <Card>
        <CardContent className="p-8 text-center flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">Les Reels Instagram ne supportent pas l&apos;intégration directe.</p>
          <Button asChild size="sm">
            <a href={embed.originalUrl} target="_blank" rel="noreferrer" className="no-underline">
              Ouvrir Instagram
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border bg-black aspect-[9/16]">
      <iframe
        src={embed.embedUrl}
        className="w-full h-full"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 'none' }}
      />
    </div>
  )
}
