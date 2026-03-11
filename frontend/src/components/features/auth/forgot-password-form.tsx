'use client'

import { useState } from 'react'
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
  email: z.string().email('Email invalide'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false)
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
    setServerError(null)
    try {
      await apiPost('/api/v1/auth/forgot-password', data)
      setSuccess(true)
    } catch {
      setServerError('Une erreur est survenue. Veuillez réessayer.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4 max-w-lg mx-auto">
      <Logo variant="full" className="scale-110" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
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

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}

              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
