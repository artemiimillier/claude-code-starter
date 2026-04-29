import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendCode } from '@/lib/telegram-auth'

export async function POST(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  try {
    const phoneCodeHash = await sendCode(userId, phone)
    return NextResponse.json({ phoneCodeHash })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to send code' }, { status: 500 })
  }
}
