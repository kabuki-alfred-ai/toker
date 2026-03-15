export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Download, ArrowLeft, Clock, FileVideo, FileAudio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface DownloadDetail {
  id: string
  status: string
  videoUrl: string
  title: string | null
  thumbnail: string | null
  format: string
  quality: string
  fileUrl: string | null
  fileSize: string | null
  duration: string | null
  errorMsg: string | null
  createdAt: string
}

async function fetchDownload(id: string): Promise<DownloadDetail | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const res = await fetch(`${backendUrl}/api/v1/downloads/${id}`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

function isAudio(fmt: string) {
  return fmt === 'mp3' || fmt === 'm4a'
}

export default async function DownloadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const download = await fetchDownload(id)

  if (!download) redirect('/login')
  if (download.status === 'FAILED') notFound()

  const audio = isAudio(download.format)
  const label = download.title ?? download.videoUrl
  const qualityLabel = !audio ? download.quality.replace('q', '') : null

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/download"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
      >
        <ArrowLeft size={14} /> Retour
      </Link>

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-snug line-clamp-2">{label}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-muted">
            {audio ? <FileAudio size={10} /> : <FileVideo size={10} />}
            {download.format.toUpperCase()}{qualityLabel ? ` · ${qualityLabel}` : ''}
          </span>
          {download.fileSize && (
            <span className="text-xs text-muted-foreground">{download.fileSize}</span>
          )}
          {download.duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={10} /> {download.duration}
            </span>
          )}
        </div>
      </div>

      {/* Player / processing state */}
      {download.status === 'COMPLETED' && download.fileUrl ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {audio ? (
              <div className="p-6 flex flex-col items-center gap-4">
                {download.thumbnail && (
                  <img
                    src={download.thumbnail}
                    alt={download.title ?? ''}
                    className="w-48 h-48 rounded-xl object-cover shadow"
                  />
                )}
                <audio src={download.fileUrl} controls className="w-full" />
              </div>
            ) : (
              <video
                src={download.fileUrl}
                controls
                poster={download.thumbnail ?? undefined}
                className="w-full aspect-video bg-black"
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Traitement en cours…</p>
          </CardContent>
        </Card>
      )}

      {/* Download button */}
      {download.fileUrl && (
        <div className="flex justify-end">
          <Button asChild size="lg">
            <a href={download.fileUrl} download>
              <Download size={16} className="mr-2" />
              Télécharger
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
