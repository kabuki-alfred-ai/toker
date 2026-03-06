'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ExternalLink, Loader2, AlertCircle, Zap, Film } from 'lucide-react'
import { detectPlatform, PlatformIcon } from '@/components/ui/platform-icon'

interface SourceResult {
  url: string
  title: string
  thumbnailUrl: string | null
  platform: string
  score: number
}

interface SceneResult {
  index: number
  frameUrl: string | null
  sources: SourceResult[]
}

interface SearchResult {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sources: SceneResult[] | null
  errorMsg: string | null
  createdAt: string
}

interface HistoryItem {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sourcesCount: number
  createdAt: string
}

const STATUS_STEPS: Record<string, string> = {
  PENDING: 'En attente…',
  PROCESSING: 'Analyse des scènes en cours…',
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '')
  } catch { return url.slice(0, 42) }
}

// ─── Source row ──────────────────────────────────────────────────────────────

function SourceRow({ source }: { source: SourceResult }) {
  const platform = detectPlatform(source.url)
  const pct = source.score

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 7,
        background: '#0D0D0D',
        border: '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(94,106,210,0.35)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      {/* Thumbnail */}
      <div style={{ width: 56, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {source.thumbnailUrl
          ? <img src={source.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <PlatformIcon platform={platform} size={18} />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <PlatformIcon platform={platform} size={12} />
          <span style={{ fontSize: 12, color: '#E5E5E5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
            {source.title || shortUrl(source.url)}
          </span>
        </div>
        {/* Confidence bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct > 60 ? '#22C55E' : pct > 30 ? '#F59E0B' : '#EF4444', borderRadius: 1 }} />
          </div>
          <span style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
      </div>

      <ExternalLink size={11} color="#5E6AD2" style={{ flexShrink: 0 }} />
    </a>
  )
}

// ─── Scene card ──────────────────────────────────────────────────────────────

function SceneCard({ scene }: { scene: SceneResult }) {
  const hasSources = scene.sources.length > 0

  return (
    <div style={{
      borderRadius: 10,
      background: '#111111',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      {/* Scene header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Frame thumbnail */}
        <div style={{ width: 80, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {scene.frameUrl
            ? <img src={scene.frameUrl} alt={`Scène ${scene.index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Film size={20} color="#555" />
          }
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 2px' }}>
            Scène {scene.index}
          </p>
          <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
            {hasSources
              ? `${scene.sources.length} source${scene.sources.length > 1 ? 's' : ''} identifiée${scene.sources.length > 1 ? 's' : ''}`
              : 'Aucune source trouvée pour cette scène'}
          </p>
        </div>
      </div>

      {/* Sources list */}
      {hasSources && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scene.sources.map((s, i) => <SourceRow key={i} source={s} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SourceFinderClient({ credits, history: initialHistory }: { credits: number; history: HistoryItem[] }) {
  const [tab, setTab] = useState<'form' | 'history'>('form')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const platform = detectPlatform(url)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/source-finder/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: SearchResult = await res.json()
      setActiveSearch(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        stopPolling()
        const totalSources = data.sources?.reduce((acc, s) => acc + s.sources.length, 0) ?? 0
        setHistory((prev) => [{
          id: data.id,
          status: data.status,
          videoUrl: data.videoUrl,
          sourcesCount: totalSources,
          createdAt: data.createdAt,
        }, ...prev])
      }
    }, 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setLoading(true)
    setActiveSearch(null)

    try {
      const res = await fetch('/api/v1/source-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setActiveSearch({ id: data.id, status: 'PENDING', videoUrl: url, sources: null, errorMsg: null, createdAt: new Date().toISOString() })
      startPolling(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_COLORS = { PENDING: '#8B8B8B', PROCESSING: '#5E6AD2', COMPLETED: '#22C55E', FAILED: '#EF4444' }
  const STATUS_LABELS = { PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Terminé', FAILED: 'Échoué' }

  const totalSources = activeSearch?.sources?.reduce((acc, s) => acc + s.sources.length, 0) ?? 0
  const scenesWithSources = activeSearch?.sources?.filter(s => s.sources.length > 0).length ?? 0

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['form', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', fontSize: 14, background: 'transparent', border: 'none',
              cursor: 'pointer', fontWeight: tab === t ? 500 : 400,
              color: tab === t ? '#F2F2F2' : '#8B8B8B',
              borderBottom: tab === t ? '2px solid #5E6AD2' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t === 'form' ? 'Nouvelle recherche' : `Historique${history.length > 0 ? ` (${history.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'form' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {platform !== 'unknown'
                  ? <PlatformIcon platform={platform} size={16} />
                  : <Search size={15} color="#555" />
                }
              </div>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Colle l'URL de la vidéo (TikTok, Reel, Short)…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 12px 11px 36px',
                  background: '#111111', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: '#F2F2F2', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} color="#555" /> 1 crédit — solde : {credits}
              </span>
              <button
                type="submit"
                disabled={loading || !url.trim() || credits < 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 7, background: '#5E6AD2',
                  color: '#fff', fontSize: 14, fontWeight: 500, border: 'none',
                  cursor: loading || !url.trim() || credits < 1 ? 'not-allowed' : 'pointer',
                  opacity: loading || !url.trim() || credits < 1 ? 0.5 : 1,
                }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <Search size={14} />
                Trouver les sources
              </button>
            </div>

            {credits < 1 && (
              <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>
                Crédits insuffisants. <a href="/credits" style={{ color: '#5E6AD2' }}>Recharger →</a>
              </p>
            )}
          </form>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 13 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Active search */}
          {activeSearch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Processing */}
              {(activeSearch.status === 'PENDING' || activeSearch.status === 'PROCESSING') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8B8B8B', fontSize: 14 }}>
                  <Loader2 size={16} className="animate-spin" color="#5E6AD2" />
                  {STATUS_STEPS[activeSearch.status]}
                </div>
              )}

              {/* Results */}
              {activeSearch.status === 'COMPLETED' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                      {totalSources > 0
                        ? `${scenesWithSources} scène${scenesWithSources > 1 ? 's' : ''} • ${totalSources} source${totalSources > 1 ? 's' : ''}`
                        : 'Aucune source identifiée'}
                    </p>
                  </div>
                  {totalSources > 0
                    ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {activeSearch.sources!.map((scene) => <SceneCard key={scene.index} scene={scene} />)}
                      </div>
                    : <p style={{ color: '#666', fontSize: 14 }}>Aucune vidéo source n&apos;a pu être identifiée. Essaie avec un autre extrait.</p>
                  }
                </>
              )}

              {/* Failed */}
              {activeSearch.status === 'FAILED' && (
                <div style={{ padding: '14px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 10 }}>
                  <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ color: '#EF4444', fontSize: 14, margin: '0 0 4px', fontWeight: 500 }}>La recherche a échoué.</p>
                    <p style={{ color: '#8B8B8B', fontSize: 13, margin: 0 }}>1 crédit a été remboursé automatiquement.</p>
                    {activeSearch.errorMsg && <p style={{ color: '#555', fontSize: 12, margin: '6px 0 0', fontFamily: 'monospace' }}>{activeSearch.errorMsg}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* History tab */
        history.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: '#8B8B8B', fontSize: 14, margin: 0 }}>Aucune recherche pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[item.status], background: `${STATUS_COLORS[item.status]}15`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {STATUS_LABELS[item.status]}
                </span>
                <PlatformIcon platform={detectPlatform(item.videoUrl)} size={14} />
                <span style={{ flex: 1, fontSize: 13, color: '#C4C4C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortUrl(item.videoUrl)}
                </span>
                {item.status === 'COMPLETED' && (
                  <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.sourcesCount} source{item.sourcesCount !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
