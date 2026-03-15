export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SubtitleRemoverClient } from '@/components/features/subtitle-remover/subtitle-remover-client'

async function fetchData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }

  const [userRes, historyRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/subtitle-remover`, { headers, cache: 'no-store' }),
  ])
  if (!userRes.ok) return null

  const [userData, historyData] = await Promise.all([
    userRes.json() as Promise<{ credits: { balance: number } }>,
    historyRes.ok ? historyRes.json() as Promise<{ items: unknown[] }> : Promise.resolve({ items: [] }),
  ])

  return {
    credits: userData.credits.balance,
    history: historyData.items ?? [],
  }
}

export default async function SubtitleRemoverPage() {
  const data = await fetchData()
  if (!data) redirect('/login')

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <SubtitleRemoverClient credits={data.credits} history={data.history as any} />
  )
}
