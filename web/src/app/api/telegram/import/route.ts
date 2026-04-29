import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth'
import { getConnectedClient } from '@/lib/telegram-auth'
import { startImport, getJob } from '@/lib/telegram-import'

export async function POST(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { hours = 0 } = await req.json().catch(() => ({}))

  const client = await getConnectedClient(userId)
  if (!client) return NextResponse.json({ error: 'Telegram not connected' }, { status: 400 })

  const jobId = randomUUID()

  // Fire and forget — intentionally not awaited
  startImport(jobId, userId, client, Number(hours))

  return NextResponse.json({ jobId })
}

export async function GET(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const job = getJob(jobId)
  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    status:      job.status,
    progress:    job.progress,
    total:       job.total,
    currentChat: job.currentChat,
    error:       job.error,
  })
}
