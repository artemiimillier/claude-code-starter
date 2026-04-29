import { TelegramClient } from 'telegram'
import { Api } from 'telegram/tl'
import pool from './db'

export interface ImportJob {
  id:          string
  userId:      number
  status:      'pending' | 'running' | 'done' | 'error'
  progress:    number
  total:       number
  currentChat: string
  error?:      string
}

// In-memory job registry — single server, no Redis needed for v1
const jobs = new Map<string, ImportJob>()

export function getJob(jobId: string): ImportJob | undefined {
  return jobs.get(jobId)
}

export async function startImport(
  jobId:  string,
  userId: number,
  client: TelegramClient,
  hours:  number,
): Promise<void> {
  const job: ImportJob = {
    id: jobId, userId, status: 'running',
    progress: 0, total: 0, currentChat: 'Получение списка чатов...',
  }
  jobs.set(jobId, job)

  // Persist job to DB so it survives a page reload
  await pool.execute(
    'INSERT INTO import_jobs (id, user_id, status) VALUES (?, ?, ?)',
    [jobId, userId, 'running'],
  )

  // Run in background — do NOT await this in the API route
  runImport(job, client, hours).catch(async (err) => {
    job.status = 'error'
    job.error  = String(err)
    await pool.execute(
      'UPDATE import_jobs SET status=?, error=?, completed_at=NOW() WHERE id=?',
      ['error', job.error, jobId],
    )
  })
}

async function runImport(job: ImportJob, client: TelegramClient, hours: number) {
  const cutoff = hours > 0
    ? Math.floor((Date.now() - hours * 3600 * 1000) / 1000)
    : 0

  const dialogs = await client.getDialogs({ limit: 500 })
  job.total = dialogs.length

  for (let di = 0; di < dialogs.length; di++) {
    const dialog = dialogs[di]
    job.currentChat = dialog.name ?? String(di)
    job.progress    = di

    await pool.execute(
      'UPDATE import_jobs SET progress=?, total=?, current_chat=? WHERE id=?',
      [job.progress, job.total, job.currentChat, job.id],
    )

    const entity = dialog.entity
    if (!entity) continue

    // Determine chat meta
    const chatId   = getChatId(entity)
    const chatName = dialog.name ?? ''
    const chatType = getChatType(entity)

    // Upsert contact/chat
    await upsertContact(job.userId, entity, chatName, chatType)

    // Fetch messages in batches
    let offsetId    = 0
    let keepFetching = true

    while (keepFetching) {
      const msgs = await client.getMessages(entity, {
        limit:    200,
        offsetId: offsetId > 0 ? offsetId : undefined,
      })

      if (!msgs || msgs.length === 0) break

      const rows: any[][] = []

      for (const msg of msgs) {
        if (!(msg instanceof Api.Message)) continue
        if (!msg.message?.trim()) continue

        // Stop if we've gone past the cutoff date
        if (cutoff > 0 && msg.date < cutoff) {
          keepFetching = false
          break
        }

        const senderName = await resolveSenderName(client, msg)
        rows.push([
          job.userId,
          chatId,
          chatName,
          chatType,
          msg.id,
          senderName,
          msg.message,
          'import',
          new Date(msg.date * 1000),
          msg.editDate ? new Date(msg.editDate * 1000) : null,
        ])

        offsetId = msg.id
      }

      if (rows.length > 0) {
        await batchInsertMessages(rows)
      }

      if (msgs.length < 200) break
    }
  }

  // Final update
  job.status   = 'done'
  job.progress = job.total
  job.currentChat = ''

  await pool.execute(
    'UPDATE import_jobs SET status=?, progress=?, completed_at=NOW() WHERE id=?',
    ['done', job.total, job.id],
  )

  await client.disconnect()
}

async function batchInsertMessages(rows: any[][]) {
  const placeholders = rows.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')
  const flat = rows.flat()
  await pool.execute(`
    INSERT IGNORE INTO messages
      (user_id, chat_id, chat_name, chat_type, message_id,
       sender_name, text, source, original_date, edited_at)
    VALUES ${placeholders}
  `, flat)
}

async function upsertContact(
  userId:   number,
  entity:   any,
  name:     string,
  type:     string,
) {
  const tgId = getChatId(entity)
  const username = entity.username ?? null
  await pool.execute(`
    INSERT INTO contacts (user_id, tg_id, name, username, contact_type, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      username = COALESCE(VALUES(username), username),
      last_seen = NOW(),
      msg_count = msg_count + 1
  `, [userId, tgId, name, username, type])
}

async function resolveSenderName(client: TelegramClient, msg: Api.Message): Promise<string> {
  try {
    if (!msg.fromId) return ''
    if (msg.fromId instanceof Api.PeerUser) {
      const user = await client.getEntity(msg.fromId.userId)
      if ('firstName' in user) {
        return [user.firstName, (user as any).lastName].filter(Boolean).join(' ')
      }
    }
    if (msg.fromId instanceof Api.PeerChannel || msg.fromId instanceof Api.PeerChat) {
      const ch = await client.getEntity(msg.fromId)
      return ('title' in ch ? ch.title : '') as string
    }
  } catch {}
  return ''
}

function getChatId(entity: any): bigint {
  return BigInt(entity.id ?? 0)
}

function getChatType(entity: any): 'private' | 'group' | 'channel' {
  const type = entity.className ?? ''
  if (type === 'Channel' && entity.broadcast) return 'channel'
  if (type === 'Channel' || type === 'Chat' || type === 'ChatForbidden') return 'group'
  return 'private'
}
