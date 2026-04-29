import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSession()
  if (!userId) redirect('/auth')

  let email = ''
  try {
    const [rows] = await pool.execute(
      'SELECT email FROM users WHERE id = ?', [userId]
    ) as any[]
    email = (rows as any[])[0]?.email ?? ''
  } catch (err) {
    console.error('DB error in DashboardLayout:', err)
    redirect('/auth')
  }

  return <DashboardShell userEmail={email}>{children}</DashboardShell>
}
