'use client'

import { useState } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// ─── Shared primitives ──────────────────────────────────────────────────────────

function StatusBanner({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  const isSuccess = type === 'success'
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
      isSuccess
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : 'bg-destructive/10 border border-destructive/20 text-destructive'
    }`}>
      {isSuccess ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  )
}

// ─── Profile form ───────────────────────────────────────────────────────────────

export function ProfileInfoForm({ initial }: { initial: { firstName: string | null; lastName: string | null } }) {
  const [firstName, setFirstName] = useState(initial.firstName ?? '')
  const [lastName, setLastName] = useState(initial.lastName ?? '')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setStatus({ type: 'success', msg: 'Profil mis à jour.' })
    } catch {
      setStatus({ type: 'error', msg: 'Une erreur est survenue.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Prénom"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Nom"
          />
        </div>
      </div>
      {status && <StatusBanner {...status} />}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 size={14} className="mr-2 animate-spin" />}
        Enregistrer
      </Button>
    </form>
  )
}

// ─── Email form ─────────────────────────────────────────────────────────────────

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, currentPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setStatus({ type: 'success', msg: 'Email mis à jour.' })
      setPassword('')
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur serveur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Nouvel email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Mot de passe actuel (confirmation)</Label>
        <Input
          id="confirm-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      {status && <StatusBanner {...status} />}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 size={14} className="mr-2 animate-spin" />}
        Changer l&apos;email
      </Button>
    </form>
  )
}

// ─── Password form ──────────────────────────────────────────────────────────────

export function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setStatus({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setStatus({ type: 'success', msg: 'Mot de passe mis à jour.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur serveur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Mot de passe actuel</Label>
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={e => setNext(e.target.value)}
          placeholder="8 caractères minimum"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-new-password">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirm-new-password"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      {status && <StatusBanner {...status} />}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 size={14} className="mr-2 animate-spin" />}
        Changer le mot de passe
      </Button>
    </form>
  )
}
