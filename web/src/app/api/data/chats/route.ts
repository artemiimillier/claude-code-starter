import { NextResponse } from 'next/server';
import pool, { migrate } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await migrate();

  const [rows] = await pool.execute(
    `SELECT chat_id, chat_name, chat_type, COUNT(*) AS count
     FROM messages
     WHERE user_id = ?
     GROUP BY chat_id, chat_name, chat_type
     ORDER BY count DESC`,
    [userId]
  ) as any;

  return NextResponse.json({ chats: rows });
}
