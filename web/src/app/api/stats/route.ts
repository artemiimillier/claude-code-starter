import { NextResponse } from 'next/server'
import pool, { migrate } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await migrate()

  const [[msgRow], [chatRow], [dateRow], [connRow]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM messages WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(DISTINCT chat_id) AS total FROM messages WHERE user_id = ?', [userId]),
    pool.execute('SELECT MAX(original_date) AS last FROM messages WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS total FROM connections WHERE user_id = ?', [userId]),
  ]) as any[]

  return NextResponse.json({
    totalMessages:     Number((msgRow  as any[])[0].total),
    totalChats:        Number((chatRow as any[])[0].total),
    lastImport:        (dateRow as any[])[0].last ?? null,
    activeConnections: Number((connRow as any[])[0].total),
  })
}
