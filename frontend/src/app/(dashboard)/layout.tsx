import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A', flexDirection: 'row' }}>
      <div className="hide-on-mobile">
        <Sidebar balance={user.credits.balance} email={user.email} firstName={user.firstName} lastName={user.lastName} />
      </div>
      
      <main style={{ 
        flex: 1, 
        padding: '24px 16px', // Smaller padding for mobile
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', // Space for bottom nav
        color: '#F2F2F2',
        overflowX: 'hidden'
      }}>
        {/* Desktop Sidebar is hidden on mobile, but maybe we need a mobile top bar for Logo/Credits */}
        <div className="show-on-mobile" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#5E6AD2' }}>ViralScript</span>
          <div style={{ background: 'rgba(94,106,210,0.1)', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#5E6AD2', fontWeight: 600 }}>
            {user.credits.balance} crédits
          </div>
        </div>
        
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
