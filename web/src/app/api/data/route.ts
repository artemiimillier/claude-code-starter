import { NextRequest, NextResponse } from 'next/server';
import pool, { migrate } from '@/lib/db';
import { getSession } from '@/lib/auth';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await migrate();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const chatId = searchParams.get('chat') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: string[] = ['user_id = ?'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [userId];

  if (chatId) {
    conditions.push('chat_id = ?');
    params.push(chatId);
  }

  let orderBy = 'ORDER BY original_date DESC';

  if (q) {
    if (q.length >= 3) {
      conditions.push('MATCH(text, sender_name, chat_name) AGAINST(? IN BOOLEAN MODE)');
      params.push(q + '*');
      orderBy = '';
    } else {
      conditions.push('text LIKE ?');
      params.push(`%${q}%`);
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM messages ${where}`,
    params
  ) as any;
  const total = countRows[0].total as number;

  const [rows] = await pool.execute(
    `SELECT id, chat_id, chat_name, chat_type, message_id, sender_name, text, source, original_date, edited_at
     FROM messages ${where} ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params
  ) as any;

  return NextResponse.json({ messages: rows, total, page, pages: Math.ceil(total / PAGE_SIZE) });
}
