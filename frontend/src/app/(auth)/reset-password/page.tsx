import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/features/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
