'use client'

import { useState, useCallback } from 'react'
import { Zap, Youtube, Instagram, Music, AlertCircle } from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type Platform = 'tiktok' | 'instagram' | 'youtube' | null

const PATTERNS: Record<Exclude<Platform, null>, RegExp> = {
  tiktok: /tiktok\.com\/@[\w.]+\/video\/\d+/,
  instagram: /instagram\.com\/reel\/[\w-]+/,
  youtube: /youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+/,
}

const PLATFORM_ICONS: Record<Exclude<Platform, null>, React.ComponentType<{ size?: number; className?: string }>> = {
  tiktok: Music,
  instagram: Instagram,
  youtube: Youtube,
}

const PLATFORM_LABELS: Record<Exclude<Platform, null>, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

function detectPlatform(url: string): Platform {
  for (const [platform, regex] of Object.entries(PATTERNS)) {
    if (regex.test(url)) return platform as Platform
  }
  return null
}

interface UrlSubmitFormProps {
  credits: number
  onSubmitted: (transcriptionId: string) => void
}

export function UrlSubmitForm({ credits, onSubmitted }: UrlSubmitFormProps) {
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<Platform>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUrl(value)
    setServerError(null)

    if (!value) {
      setPlatform(null)
      setUrlError(null)
      return
    }

    const detected = detectPlatform(value)
    setPlatform(detected)

    if (value.startsWith('http') && !detected) {
      setUrlError('URL non supportée — TikTok, Reels ou YouTube Shorts uniquement')
    } else {
      setUrlError(null)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!platform || credits < 1 || isSubmitting) return

    setIsSubmitting(true)
    setServerError(null)
    try {
      const res = await apiPost<{ id: string }>('/api/v1/transcriptions', { videoUrl: url })
      onSubmitted(res.id)
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string }
      if (e?.statusCode === 402) {
        setServerError('Crédits insuffisants')
      } else if (e?.statusCode === 422) {
        setUrlError('URL non supportée — TikTok, Reels ou YouTube Shorts uniquement')
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !!platform && credits >= 1 && !isSubmitting
  const SelectedIcon = platform ? PLATFORM_ICONS[platform] : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
        Transcrire une vidéo
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Collez une URL TikTok, Instagram Reels ou YouTube Shorts.
      </p>

      {credits === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/25 flex justify-between items-center group animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-destructive" />
            <span className="text-destructive font-medium text-sm">Vous n&apos;avez plus de crédits.</span>
          </div>
          <a
            href="/credits"
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold no-underline hover:bg-primary/90 transition-all shadow-sm"
          >
            Acheter des crédits
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            {/* Platform icon indicator */}
            {platform && SelectedIcon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10 animate-in fade-in slide-in-from-left-2">
                <SelectedIcon size={16} className="text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded-sm">
                  {PLATFORM_LABELS[platform]}
                </span>
              </div>
            )}
            <input
              type="url"
              value={url}
              onChange={handleChange}
              placeholder="https://www.tiktok.com/@user/video/..."
              className={cn(
                "w-full rounded-xl bg-card border text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
                platform ? "pl-32 pr-4 py-3.5" : "px-4 py-3.5",
                urlError ? "border-destructive/50 ring-destructive/10" : "border-border"
              )}
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
              canSubmit 
                ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer" 
                : "bg-muted text-muted-foreground shadow-none cursor-not-allowed grayscale"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Envoi...
              </span>
            ) : (
              <>
                <Zap size={18} className={cn(canSubmit ? "fill-current" : "fill-none")} />
                {credits === 0 ? 'Crédits insuffisants' : 'Transcrire'}
              </>
            )}
          </button>
        </div>

        {urlError && (
          <p className="mt-3 text-xs text-destructive font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} />
            {urlError}
          </p>
        )}
        {serverError && (
          <p className="mt-3 text-xs text-destructive font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} />
            {serverError}
          </p>
        )}
      </form>
    </div>
  )
}
