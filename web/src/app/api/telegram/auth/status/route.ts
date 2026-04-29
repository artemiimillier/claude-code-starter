import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAuthStatus, disconnectUser } from '@/lib/telegram-auth'

export async function GET() {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getAuthStatus(userId)
  return NextResponse.json(status)
}

export async function DELETE() {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await disconnectUser(userId)
  return NextResponse.json({ ok: true })
}
