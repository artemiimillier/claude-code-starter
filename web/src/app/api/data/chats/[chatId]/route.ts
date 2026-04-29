import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { setBlocked, type ChatType } from '@/lib/chat-blocks'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatId: chatIdStr } = await params
  const chatId = BigInt(chatIdStr)

  let body: { block?: boolean }
  try { body = await req.json() } catch { body = {} }

  // Snapshot meta before delete (for chat_blocks)
  const [metaRows] = await pool.execute(
    'SELECT chat_name, chat_type FROM messages WHERE user_id = ? AND chat_id = ? LIMIT 1',
    [userId, String(chatId)],
  ) as any[]
  const meta = (metaRows as any[])[0]

  const [result] = await pool.execute(
    'DELETE FROM messages WHERE user_id = ? AND chat_id = ?',
    [userId, String(chatId)],
  ) as any

  const deleted: number = result?.affectedRows ?? 0

  if (body.block) {
    await setBlocked(
      userId,
      chatId,
      meta?.chat_name ?? null,
      (meta?.chat_type ?? 'private') as ChatType,
    )
  }

  return NextResponse.json({ ok: true, deleted, blocked: Boolean(body.block) })
}
