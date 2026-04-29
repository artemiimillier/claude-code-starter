import { getSession } from '@/lib/auth'
import { streamChat } from '@/lib/openai-chat'
import type { ChatMessage } from '@/lib/openai-chat'

export async function POST(req: Request) {
  const userId = await getSession()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { messages, query }: { messages: ChatMessage[]; query: string } = await req.json()
  if (!query?.trim()) return new Response('query required', { status: 400 })

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      'data: ' + JSON.stringify({ text: 'OpenAI API key не настроен. Добавьте OPENAI_API_KEY в .env.local' }) + '\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const stream = await streamChat(userId, messages ?? [], query)
  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
