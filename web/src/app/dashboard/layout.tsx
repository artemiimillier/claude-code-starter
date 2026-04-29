import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSession()
  if (!userId) redirect('/auth')

  const [rows] = await pool.execute(
    'SELECT email FROM users WHERE id = ?', [userId]
  ) as any[]
  const email: string = (rows as any[])[0]?.email ?? ''

  return <DashboardShell userEmail={email}>{children}</DashboardShell>
}
