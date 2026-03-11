export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { ProfileInfoForm, EmailForm, PasswordForm } from '@/components/features/profile/profile-forms'
import { LogoutButton } from '@/components/features/profile/logout-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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

export default async function ProfilePage() {
  const profile = await fetchProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <User size={20} className="text-primary" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground font-albert">
            {profile.firstName || profile.lastName
              ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
              : 'Mon profil'}
          </h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-albert">Informations personnelles</CardTitle>
            <CardDescription>Votre prénom et nom affichés dans l'application.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileInfoForm initial={{ firstName: profile.firstName, lastName: profile.lastName }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-albert">Adresse email</CardTitle>
            <CardDescription>Votre email de connexion. Une confirmation de mot de passe est requise.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailForm currentEmail={profile.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-albert">Mot de passe</CardTitle>
            <CardDescription>Choisissez un mot de passe fort d'au moins 8 caractères.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>

      {/* Logout button — mobile only */}
      <div className="sm:hidden pt-2">
        <LogoutButton />
      </div>
    </div>
  )
}
