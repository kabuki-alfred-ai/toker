export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { SubtitleGeneratorClient } from '@/components/features/subtitle-generator/subtitle-generator-client'

async function fetchData(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }

  const [userRes, jobRes, historyRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/subtitle-generator/${id}`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/subtitle-generator`, { headers, cache: 'no-store' }),
  ])

  if (!userRes.ok) return null
  if (jobRes.status === 403 || jobRes.status === 404) return { notFound: true as const }

  const [userData, jobData, historyData] = await Promise.all([
    userRes.json() as Promise<{ credits: { balance: number } }>,
    jobRes.json(),
    historyRes.ok ? (historyRes.json() as Promise<{ items: unknown[] }>) : Promise.resolve({ items: [] }),
  ])

  return {
    credits: userData.credits.balance,
    initialJob: jobData,
    history: historyData.items ?? [],
  }
}

export default async function SubtitleGeneratorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchData(id)
  if (!data) redirect('/login')
  if ('notFound' in data) notFound()

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <SubtitleGeneratorClient credits={data.credits} history={data.history as any} initialJob={data.initialJob} />
  )
}
