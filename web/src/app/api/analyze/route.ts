import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth'
import { startAnalysis, getAnalyzeJob } from '@/lib/analyze'

export async function POST() {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = randomUUID()
  startAnalysis(jobId, userId)
  return NextResponse.json({ jobId })
}

export async function GET(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const job = getAnalyzeJob(jobId)
  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    status:      job.status,
    progress:    job.progress,
    total:       job.total,
    currentName: job.currentName,
    error:       job.error,
  })
}
