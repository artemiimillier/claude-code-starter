import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { profileExists } from '@/lib/vault'

export async function GET(req: Request) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  let query = `
    SELECT tg_id, name, username, contact_type, first_seen, last_seen, msg_count
    FROM contacts
    WHERE user_id = ? AND contact_type = 'user'
  `
  const params: any[] = [userId]

  if (q) {
    query += ' AND (name LIKE ? OR username LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }

  query += ' ORDER BY last_seen DESC LIMIT 200'

  const [rows] = await pool.execute(query, params) as any[]
  const contacts = rows as any[]

  // Check vault profiles in parallel
  const withProfiles = await Promise.all(
    contacts.map(async (c: any) => ({
      tg_id:        String(c.tg_id),
      name:         c.name,
      username:     c.username,
      contact_type: c.contact_type,
      first_seen:   c.first_seen,
      last_seen:    c.last_seen,
      msg_count:    c.msg_count,
      has_profile:  await profileExists(c.name ?? String(c.tg_id), c.tg_id),
    }))
  )

  return NextResponse.json({ contacts: withProfiles })
}
