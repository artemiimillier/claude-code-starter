import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { verifyCode, verify2FA } from '@/lib/telegram-auth'

export async function POST(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, password } = await req.json()

  try {
    if (password) {
      // 2FA step
      await verify2FA(userId, password)
      return NextResponse.json({ ok: true })
    }

    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

    const result = await verifyCode(userId, code)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Verification failed' }, { status: 500 })
  }
}
