import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { setBlocked, unblock, type ChatType } from '@/lib/chat-blocks'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatId: chatIdStr } = await params
  const chatId = BigInt(chatIdStr)

  let body: { blocked?: boolean; name?: string; type?: ChatType }
  try { body = await req.json() } catch { body = {} }

  if (typeof body.blocked !== 'boolean') {
    return NextResponse.json({ error: 'blocked обязателен' }, { status: 400 })
  }

  // Pull live chat meta from messages if present, fallback to provided body
  const [rows] = await pool.execute(
    'SELECT chat_name, chat_type FROM messages WHERE user_id = ? AND chat_id = ? LIMIT 1',
    [userId, String(chatId)],
  ) as any[]
  const meta = (rows as any[])[0]
  const name = meta?.chat_name ?? body.name ?? null
  const type = (meta?.chat_type ?? body.type ?? 'private') as ChatType

  if (body.blocked) {
    await setBlocked(userId, chatId, name, type)
  } else {
    await unblock(userId, chatId)
  }

  return NextResponse.json({ ok: true, blocked: body.blocked })
}
