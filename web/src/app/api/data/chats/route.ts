import { NextResponse } from 'next/server';
import pool, { migrate } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { listBlocks } from '@/lib/chat-blocks';

interface ChatRow {
  chat_id:   number
  chat_name: string
  chat_type: 'private' | 'group' | 'channel'
  count:     number
  blocked:   boolean
}

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

  const blocks  = await listBlocks(userId);
  const blocked = new Map(blocks.map(b => [String(b.chat_id), b]));

  const seen = new Set<string>();
  const list: ChatRow[] = (rows as any[]).map(r => {
    const id = String(r.chat_id);
    seen.add(id);
    return {
      chat_id:   Number(r.chat_id),
      chat_name: r.chat_name,
      chat_type: r.chat_type,
      count:     Number(r.count),
      blocked:   blocked.has(id),
    };
  });

  // Orphan blocks — chats with no messages but still blocked
  for (const b of blocks) {
    const id = String(b.chat_id);
    if (seen.has(id)) continue;
    list.push({
      chat_id:   Number(b.chat_id),
      chat_name: b.chat_name ?? '',
      chat_type: b.chat_type,
      count:     0,
      blocked:   true,
    });
  }

  return NextResponse.json({ chats: list });
}
