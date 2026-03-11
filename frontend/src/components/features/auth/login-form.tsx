'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { apiPost } from '@/lib/api-client'
import { Logo } from '@/components/ui/logo'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

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
    <div className="flex flex-col items-center gap-6 w-full px-4 max-w-lg mx-auto">
      <Logo variant="full" className="scale-110" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Accédez à vos transcriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            {resetSuccess && !serverError && (
              <p className="text-sm text-green-600">Mot de passe réinitialisé avec succès. Connectez-vous.</p>
            )}

            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
