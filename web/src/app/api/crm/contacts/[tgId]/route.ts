import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { readContactProfile } from '@/lib/vault'
import { startAnalysis } from '@/lib/analyze'
import { randomUUID } from 'crypto'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tgId: string }> },
) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tgId } = await params

  const [rows] = await pool.execute(
    `SELECT tg_id, name, username, contact_type, first_seen, last_seen, msg_count
     FROM contacts WHERE user_id = ? AND tg_id = ?`,
    [userId, BigInt(tgId)],
  ) as any[]

  const contact = (rows as any[])[0]
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const profile = await readContactProfile(contact.name ?? tgId, contact.tg_id)

  return NextResponse.json({
    contact: {
      ...contact,
      tg_id: String(contact.tg_id),
    },
    profile,
  })
}

// Re-analyze single contact
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tgId: string }> },
) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tgId } = await params

  const jobId = randomUUID()
  // For single contact re-analysis we reuse the full job but it will filter in analyze.ts
  // Simpler: just start full analysis (contacts are processed quickly)
  startAnalysis(jobId, userId)

  return NextResponse.json({ jobId })
}
