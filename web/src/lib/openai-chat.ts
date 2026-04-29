import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'
import pool from './db'
import { getVaultPath } from './vault'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Context retrieval ────────────────────────────────────────────────────────

async function searchMessages(userId: number, query: string, limit = 20): Promise<string> {
  const [rows] = await pool.execute(
    `SELECT sender_name, chat_name, text, original_date
     FROM messages
     WHERE user_id = ? AND MATCH(text, sender_name, chat_name) AGAINST (? IN BOOLEAN MODE)
     ORDER BY original_date DESC
     LIMIT ?`,
    [userId, `${query}*`, limit],
  ) as any[]

  if (!(rows as any[]).length) return ''

  return (rows as any[]).map((m: any) => {
    const date = m.original_date ? new Date(m.original_date).toLocaleDateString('ru-RU') : ''
    return `[${date}] ${m.chat_name} / ${m.sender_name}: ${m.text}`
  }).join('\n')
}

async function searchVault(query: string, limit = 5): Promise<string> {
  const vaultPath = getVaultPath()
  const contactsDir = path.join(vaultPath, 'contacts')

  let files: string[]
  try {
    files = await fs.readdir(contactsDir)
  } catch {
    return ''
  }

  const q = query.toLowerCase()
  const results: string[] = []

  for (const file of files.filter(f => f.endsWith('.md') && !f.startsWith('_'))) {
    const content = await fs.readFile(path.join(contactsDir, file), 'utf-8').catch(() => '')
    if (content.toLowerCase().includes(q)) {
      // Return first 500 chars of matching file
      results.push(`### ${file.replace('.md', '').replace(/_/g, ' ')}\n${content.slice(0, 500)}`)
    }
    if (results.length >= limit) break
  }

  return results.join('\n\n---\n\n')
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chat(
  userId: number,
  messages: ChatMessage[],
  userQuery: string,
): Promise<string> {
  // Build context from vault + messages
  const [msgContext, vaultContext] = await Promise.all([
    searchMessages(userId, userQuery),
    searchVault(userQuery),
  ])

  const systemPrompt = `Ты — AI-ассистент системы «Второй мозг».
Отвечаешь на вопросы на основе переписок и данных о контактах пользователя.
Будь конкретным и полезным. Ссылайся на реальные данные из контекста.
Пиши на русском языке.

${msgContext ? `РЕЛЕВАНТНЫЕ СООБЩЕНИЯ:\n${msgContext}\n` : ''}
${vaultContext ? `ПРОФИЛИ КОНТАКТОВ:\n${vaultContext}\n` : ''}
${!msgContext && !vaultContext ? 'Данных по этому запросу в базе не найдено. Скажи об этом пользователю.' : ''}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // last 10 messages for context
      { role: 'user', content: userQuery },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content ?? 'Не удалось получить ответ'
}

export async function streamChat(
  userId: number,
  messages: ChatMessage[],
  userQuery: string,
): Promise<ReadableStream<Uint8Array>> {
  const [msgContext, vaultContext] = await Promise.all([
    searchMessages(userId, userQuery),
    searchVault(userQuery),
  ])

  const systemPrompt = `Ты — AI-ассистент системы «Второй мозг».
Отвечаешь на вопросы на основе переписок и данных о контактах пользователя.
Будь конкретным и полезным. Ссылайся на реальные данные из контекста.
Пиши на русском языке.

${msgContext ? `РЕЛЕВАНТНЫЕ СООБЩЕНИЯ:\n${msgContext}\n` : ''}
${vaultContext ? `ПРОФИЛИ КОНТАКТОВ:\n${vaultContext}\n` : ''}
${!msgContext && !vaultContext ? 'Данных по этому запросу не найдено.' : ''}`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
      { role: 'user', content: userQuery },
    ],
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  })

  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}
