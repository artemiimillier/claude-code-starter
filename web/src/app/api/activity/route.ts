import { NextResponse } from 'next/server'
import pool, { migrate } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await migrate()

  const [rows] = await pool.execute(
    `SELECT DATE(original_date) AS day, COUNT(*) AS count
     FROM messages
     WHERE user_id = ? AND original_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY day
     ORDER BY day ASC`,
    [userId]
  ) as any

  // Fill in missing days with 0
  const map = new Map<string, number>()
  for (const row of rows) map.set(row.day.toISOString().slice(0, 10), Number(row.count))

  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ day: key, count: map.get(key) ?? 0 })
  }

  return NextResponse.json({ activity: result })
}
