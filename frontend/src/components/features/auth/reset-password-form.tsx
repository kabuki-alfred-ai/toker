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

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  async function onSubmit(data: FormData) {
    if (!token) return
    setServerError(null)
    try {
      await apiPost('/api/v1/auth/reset-password', { token, password: data.password })
      router.push('/login?reset=success')
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string }
      if (e?.statusCode === 400) {
        setServerError('Ce lien est invalide ou a expiré. Veuillez faire une nouvelle demande.')
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.')
      }
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 w-full px-4 max-w-lg mx-auto">
        <Logo variant="full" className="scale-110" />
        <Card className="w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm text-destructive">Lien de réinitialisation manquant ou invalide.</p>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Faire une nouvelle demande
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4 max-w-lg mx-auto">
      <Logo variant="full" className="scale-110" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe pour votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 caractères"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Répétez votre mot de passe"
                {...register('confirm')}
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">{errors.confirm.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
