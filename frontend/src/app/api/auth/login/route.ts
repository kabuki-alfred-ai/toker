import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'

  const backendRes = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  const res = NextResponse.json(data, { status: 200 })

  // Forward the Set-Cookie from backend to the browser
  const setCookie = backendRes.headers.get('set-cookie')
  if (setCookie) {
    res.headers.set('set-cookie', setCookie)
  }

  return res
}
