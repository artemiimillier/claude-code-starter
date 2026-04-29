import Anthropic from '@anthropic-ai/sdk'
import pool from './db'
import { writeContactProfile, updateContactsIndex, profileExists, safeFilename } from './vault'

// Lazy: avoid crashing at module-eval time during `next build` page-data collection
let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBContact {
  id:           number
  tg_id:        bigint
  name:         string
  username:     string | null
  contact_type: string
  first_seen:   Date | null
  last_seen:    Date | null
  msg_count:    number
}

interface DBMessage {
  sender_name:   string
  text:          string
  original_date: string | null
}

// ─── Analysis job registry ─────────────────────────────────────────────────

export interface AnalyzeJob {
  id:          string
  userId:      number
  status:      'running' | 'done' | 'error'
  progress:    number
  total:       number
  currentName: string
  error?:      string
}

const analyzeJobs = new Map<string, AnalyzeJob>()

export function getAnalyzeJob(jobId: string): AnalyzeJob | undefined {
  return analyzeJobs.get(jobId)
}

// ─── Start job ────────────────────────────────────────────────────────────────

export async function startAnalysis(jobId: string, userId: number): Promise<void> {
  const job: AnalyzeJob = {
    id: jobId, userId, status: 'running',
    progress: 0, total: 0, currentName: 'Загрузка контактов...',
  }
  analyzeJobs.set(jobId, job)

  // Fire and forget
  runAnalysis(job).catch(err => {
    job.status = 'error'
    job.error  = String(err)
  })
}

// ─── Run analysis ─────────────────────────────────────────────────────────────

async function runAnalysis(job: AnalyzeJob): Promise<void> {
  const [rows] = await pool.execute(
    `SELECT id, tg_id, name, username, contact_type, first_seen, last_seen, msg_count
     FROM contacts WHERE user_id = ? AND contact_type = 'user'
     ORDER BY last_seen DESC`,
    [job.userId],
  ) as any[]

  const contacts = rows as DBContact[]
  job.total = contacts.length

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i]
    job.progress    = i
    job.currentName = c.name ?? String(c.tg_id)

    const [msgRows] = await pool.execute(
      `SELECT sender_name, text, original_date
       FROM messages
       WHERE user_id = ? AND chat_id = ? AND chat_type = 'private' AND text != ''
       ORDER BY original_date DESC
       LIMIT 150`,
      [job.userId, c.tg_id],
    ) as any[]

    const messages = msgRows as DBMessage[]

    // Only analyze contacts with actual messages
    if (messages.length === 0) continue

    const profile = await buildContactProfile(c, messages)
    await writeContactProfile(c.name ?? String(c.tg_id), c.tg_id, profile)
  }

  // Rebuild contacts index
  const indexContacts = await Promise.all(
    contacts.map(async c => ({
      name:       c.name ?? String(c.tg_id),
      tgId:       c.tg_id,
      username:   c.username,
      lastSeen:   c.last_seen,
      msgCount:   c.msg_count,
      hasProfile: await profileExists(c.name ?? String(c.tg_id), c.tg_id),
    }))
  )
  await updateContactsIndex(indexContacts)

  job.status   = 'done'
  job.progress = contacts.length
  job.currentName = ''
}

// ─── Build profile with Claude ─────────────────────────────────────────────

async function buildContactProfile(contact: DBContact, messages: DBMessage[]): Promise<string> {
  // Sample: chronological order, newest messages get priority
  const sample = [...messages].reverse().slice(-120)

  const msgText = sample.map(m => {
    const date = m.original_date
      ? new Date(m.original_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : ''
    return `[${date}] ${m.sender_name || '?'}: ${m.text.slice(0, 300)}`
  }).join('\n')

  const systemPrompt = `Ты — AI-аналитик личных коммуникаций. Анализируешь переписку и создаёшь структурированные профили контактов.
Формат ответа — строго Obsidian Markdown с wikilinks [[...]] для связей.
Пиши конкретно, на основе реального контекста переписки. Не выдумывай — только то, что видишь.`

  const userPrompt = `Создай профиль контакта по переписке в Telegram.

ДАННЫЕ:
- Имя: ${contact.name}
- Username: ${contact.username ? '@' + contact.username : 'нет'}
- Всего сообщений в базе: ${contact.msg_count}
- Первое общение: ${contact.first_seen ? new Date(contact.first_seen).toLocaleDateString('ru-RU') : '—'}
- Последнее общение: ${contact.last_seen ? new Date(contact.last_seen).toLocaleDateString('ru-RU') : '—'}

ПЕРЕПИСКА (${sample.length} сообщений, хронологически):
${msgText}

Напиши профиль строго в этом формате:

# ${contact.name}

**TG:** ${contact.username ? '@' + contact.username : '—'} | **ID:** ${contact.tg_id}
**Статус:** #[один тег: потенциальный-клиент / коллега / друг / партнёр / подрядчик / знакомый]

## Кто это
[2-4 предложения: кто, чем занимается, как познакомились]

## Темы общения
- [конкретная тема 1]
- [конкретная тема 2]

## Обязательства
- [ ] Я: [конкретное обязательство с датой, если видно из переписки]
- [ ] Он/Она: [конкретное обязательство, если есть]

## Возможности
[Конкретные возможности: проекты, коллаборации, рекомендации — что реально можно сделать]

## Следующий шаг
[1 конкретное действие]

## Связи
[Упомяни людей/компании из переписки: [[contacts/Имя_Фамилия_ID|Имя]]]

---
→ [[chats/private_${safeFilename(contact.name ?? '', contact.tg_id).replace('.md', '')}|История переписки]] (${contact.msg_count} сообщений)

*Профиль создан: ${new Date().toLocaleDateString('ru-RU')}*`

  const response = await client().messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  return (response.content.find(b => b.type === 'text') as any)?.text ?? ''
}
