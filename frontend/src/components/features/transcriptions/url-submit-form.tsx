'use client'

import { useState, useCallback } from 'react'
import { Zap, Youtube, Instagram, Music, AlertCircle } from 'lucide-react'
import { apiPost } from '@/lib/api-client'

type Platform = 'tiktok' | 'instagram' | 'youtube' | null

const PATTERNS: Record<Exclude<Platform, null>, RegExp> = {
  tiktok: /tiktok\.com\/@[\w.]+\/video\/\d+/,
  instagram: /instagram\.com\/reel\/[\w-]+/,
  youtube: /youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+/,
}

const PLATFORM_ICONS: Record<Exclude<Platform, null>, React.ComponentType<{ size?: number; color?: string }>> = {
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
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 6 }}>
        Transcrire une vidéo
      </h1>
      <p style={{ color: '#8B8B8B', fontSize: 14, marginBottom: 28 }}>
        Collez une URL TikTok, Instagram Reels ou YouTube Shorts.
      </p>

      {credits === 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} color="#EF4444" />
            <span style={{ color: '#EF4444', fontSize: 14 }}>Vous n&apos;avez plus de crédits.</span>
          </div>
          <a
            href="/credits"
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              background: '#5E6AD2',
              color: '#fff',
              fontSize: 13,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Acheter des crédits
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div 
          className="mobile-stack"
          style={{ position: 'relative', display: 'flex', gap: 10 }}
        >
          {/* Platform icon indicator */}
          {platform && SelectedIcon && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <SelectedIcon size={14} color="#5E6AD2" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5E6AD2',
                  letterSpacing: '0.04em',
                }}
              >
                {PLATFORM_LABELS[platform]}
              </span>
            </div>
          )}
          <input
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="https://www.tiktok.com/@user/video/..."
            style={{
              flex: 1,
              padding: platform ? '10px 14px 10px 100px' : '10px 14px',
              borderRadius: 8,
              background: '#111111',
              border: `1px solid ${urlError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: '#F2F2F2',
              fontSize: 14,
              outline: 'none',
              transition: 'all 0.15s',
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: canSubmit ? '#5E6AD2' : 'rgba(94,106,210,0.3)',
              color: canSubmit ? '#fff' : '#8B8B8B',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isSubmitting ? 'Envoi...' : (
              <>
                <Zap size={16} fill={canSubmit ? "currentColor" : "none"} />
                {credits === 0 ? 'Crédits insuffisants' : 'Transcrire'}
              </>
            )}
          </button>
        </div>

        {urlError && (
          <p style={{ marginTop: 6, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} />
            {urlError}
          </p>
        )}
        {serverError && (
          <p style={{ marginTop: 6, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} />
            {serverError}
          </p>
        )}
      </form>
    </div>
  )
}
