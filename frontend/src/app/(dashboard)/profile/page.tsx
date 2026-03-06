import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { ProfileInfoForm, EmailForm, PasswordForm } from '@/components/features/profile/profile-forms'

interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

async function fetchProfile(): Promise<UserProfile | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const res = await fetch(`${backendUrl}/api/v1/users/me`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F2', margin: '0 0 4px' }}>{title}</h2>
        {description && <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default async function ProfilePage() {
  const profile = await fetchProfile()
  if (!profile) redirect('/login')

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(94,106,210,0.15)', border: '1px solid rgba(94,106,210,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} color="#5E6AD2" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#F2F2F2', margin: 0 }}>
            {profile.firstName || profile.lastName
              ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
              : 'Mon profil'}
          </h1>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{profile.email}</p>
        </div>
      </div>

      <Section title="Informations personnelles" description="Votre prénom et nom affichés dans l'application.">
        <ProfileInfoForm initial={{ firstName: profile.firstName, lastName: profile.lastName }} />
      </Section>

      <Section title="Adresse email" description="Votre email de connexion. Une confirmation de mot de passe est requise.">
        <EmailForm currentEmail={profile.email} />
      </Section>

      <Section title="Mot de passe" description="Choisissez un mot de passe fort d'au moins 8 caractères.">
        <PasswordForm />
      </Section>
    </div>
  )
}
