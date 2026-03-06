'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { apiPost } from '@/lib/api-client'

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    try {
      await apiPost('/api/v1/auth/register', data)
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string }
      if (e?.statusCode === 409) {
        setServerError('Cet email est déjà utilisé')
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.')
      }
    }
  }

  return (
    <Card className="w-full max-w-sm" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardHeader>
        <CardTitle style={{ color: '#F2F2F2' }}>Créer un compte</CardTitle>
        <CardDescription style={{ color: '#8B8B8B' }}>
          5 crédits gratuits à l&apos;inscription
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
              placeholder="Minimum 8 caractères"
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
            {isSubmitting ? 'Création...' : "S'inscrire"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
