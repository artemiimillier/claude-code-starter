import pool from './db'

export type ChatType = 'private' | 'group' | 'channel'

export interface ChatBlock {
  chat_id:    number
  chat_name:  string
  chat_type:  ChatType
  blocked_at: string
}

export async function isBlocked(userId: number, chatId: number | bigint): Promise<boolean> {
  const [rows] = await pool.execute(
    'SELECT 1 FROM chat_blocks WHERE user_id = ? AND chat_id = ? LIMIT 1',
    [userId, String(chatId)],
  ) as any[]
  return (rows as any[]).length > 0
}

export async function listBlockedIds(userId: number): Promise<Set<string>> {
  const [rows] = await pool.execute(
    'SELECT chat_id FROM chat_blocks WHERE user_id = ?',
    [userId],
  ) as any[]
  return new Set((rows as any[]).map(r => String(r.chat_id)))
}

export async function listBlocks(userId: number): Promise<ChatBlock[]> {
  const [rows] = await pool.execute(
    `SELECT chat_id, chat_name, chat_type, blocked_at
     FROM chat_blocks
     WHERE user_id = ?
     ORDER BY blocked_at DESC`,
    [userId],
  ) as any[]
  return rows as ChatBlock[]
}

export async function setBlocked(
  userId:   number,
  chatId:   number | bigint,
  chatName: string | null,
  chatType: ChatType | null,
): Promise<void> {
  await pool.execute(
    `INSERT INTO chat_blocks (user_id, chat_id, chat_name, chat_type)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       chat_name = COALESCE(VALUES(chat_name), chat_name),
       chat_type = COALESCE(VALUES(chat_type), chat_type)`,
    [userId, String(chatId), chatName, chatType ?? 'private'],
  )
}

export async function unblock(userId: number, chatId: number | bigint): Promise<void> {
  await pool.execute(
    'DELETE FROM chat_blocks WHERE user_id = ? AND chat_id = ?',
    [userId, String(chatId)],
  )
}
