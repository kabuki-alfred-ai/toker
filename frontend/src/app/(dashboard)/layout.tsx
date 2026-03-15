import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { MobileHeader } from '@/components/layout/mobile-header'

async function fetchMe() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const res = await fetch(`${backendUrl}/api/v1/users/me`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<{ id: string; email: string; firstName: string | null; lastName: string | null; role: string; credits: { balance: number } }>
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchMe()
  if (!user) redirect('/api/clear-session')

  return (
    <div className="flex min-h-screen bg-background flex-row">
      <div className="hidden md:block">
        <Sidebar balance={user.credits.balance} email={user.email} firstName={user.firstName} lastName={user.lastName} isAdmin={user.role === 'ADMIN'} />
      </div>
      
      <main className="flex-1 p-4 md:p-6 pb-[calc(80px+env(safe-area-inset-bottom))] text-foreground overflow-x-hidden">
        {/* Mobile Header */}
        <div className="mb-5 md:hidden">
          <MobileHeader balance={user.credits.balance} email={user.email} firstName={user.firstName} lastName={user.lastName} isAdmin={user.role === 'ADMIN'} />
        </div>
        
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
