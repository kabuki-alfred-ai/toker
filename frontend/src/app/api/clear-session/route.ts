import { NextRequest, NextResponse } from 'next/server'

export function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  const res = NextResponse.redirect(loginUrl)
  res.cookies.set('access_token', '', { maxAge: 0, path: '/' })
  return res
}
