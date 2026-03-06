'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { apiPost } from '@/lib/api-client'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    try {
      await apiPost('/api/v1/auth/login', data)
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string }
      if (e?.statusCode === 401) {
        setServerError('Email ou mot de passe incorrect')
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.')
      }
    }
  }

  return (
    <Card className="w-full max-w-sm" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardHeader>
        <CardTitle style={{ color: '#F2F2F2' }}>Connexion</CardTitle>
        <CardDescription style={{ color: '#8B8B8B' }}>
          Accédez à vos transcriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" style={{ color: '#F2F2F2' }}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              {...register('email')}
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)', color: '#F2F2F2' }}
            />
            {errors.email && (
              <p className="text-sm" style={{ color: '#EF4444' }}>{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" style={{ color: '#F2F2F2' }}>Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              {...register('password')}
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)', color: '#F2F2F2' }}
            />
            {errors.password && (
              <p className="text-sm" style={{ color: '#EF4444' }}>{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm" style={{ color: '#EF4444' }}>{serverError}</p>
          )}

          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full"
            style={{ background: '#5E6AD2', color: '#fff' }}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </Button>

          <p className="text-sm text-center" style={{ color: '#8B8B8B' }}>
            Pas encore de compte ?{' '}
            <Link href="/register" style={{ color: '#5E6AD2' }}>
              S&apos;inscrire
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
