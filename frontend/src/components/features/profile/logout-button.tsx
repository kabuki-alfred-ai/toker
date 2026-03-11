'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
    >
      <LogOut size={16} className="mr-2" />
      Se déconnecter
    </Button>
  )
}
