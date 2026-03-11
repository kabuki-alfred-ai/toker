export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SourceFinderClient } from '@/components/features/source-finder/source-finder-client'

interface HistoryItem {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sourcesCount: number
  createdAt: string
}

async function fetchData(): Promise<{ credits: number; history: HistoryItem[] } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }

  const [userRes, historyRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/source-finder`, { headers, cache: 'no-store' }),
  ])
  if (!userRes.ok) return null

  const [userData, historyData] = await Promise.all([
    userRes.json() as Promise<{ credits: { balance: number } }>,
    historyRes.ok
      ? historyRes.json() as Promise<{ items: HistoryItem[] }>
      : Promise.resolve({ items: [] }),
  ])

  return {
    credits: userData.credits.balance,
    history: historyData.items ?? [],
  }
}

export default async function SourceFinderPage() {
  const data = await fetchData()
  if (!data) redirect('/login')

  return (
    <SourceFinderClient credits={data.credits} history={data.history} />
  )
}
