'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, Users, Download, Plug,
  Calendar, ArrowRight, Hash, Clock,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ActivityChart } from '@/components/charts/ActivityChart'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'

interface Stats {
  totalMessages: number
  totalChats: number
  lastImport: string | null
  activeConnections: number
}

interface ActivityPoint { day: string; count: number }

interface RecentMessage {
  id: number
  sender_name: string
  chat_name: string
  chat_type: string
  text: string
  original_date: string | null
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

function chatTypeLabel(type: string) {
  if (type === 'channel') return 'канал'
  if (type === 'group') return 'группа'
  return 'личка'
}

function relativeTime(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} дн. назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityPoint[] | null>(null)
  const [recent, setRecent] = useState<RecentMessage[] | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/activity').then(r => r.json()),
      fetch('/api/data?page=1').then(r => r.json()),
    ]).then(([s, a, d]) => {
      setStats(s)
      setActivity(a.days ?? null)
      setRecent((d.messages ?? []).slice(0, 6))
      setStatsLoading(false)
    }).catch(() => setStatsLoading(false))
  }, [])

  const sparkline = activity
    ? activity.slice(-14).map((p: ActivityPoint) => p.count)
    : []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Обзор
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Статистика и активность вашей базы знаний
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <motion.div variants={fadeUp}>
          <StatCard
            label="Всего сообщений"
            value={stats?.totalMessages ?? 0}
            icon={MessageSquare}
            color="var(--accent-soft)"
            trend={12}
            sparkline={sparkline}
            loading={statsLoading}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Чатов"
            value={stats?.totalChats ?? 0}
            icon={Users}
            color="#a78bfa"
            loading={statsLoading}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Активных подключений"
            value={stats?.activeConnections ?? 0}
            icon={Plug}
            color="var(--signal)"
            loading={statsLoading}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Последний импорт"
            value={0}
            icon={Download}
            color="#fb923c"
            loading={statsLoading}
            formatter={() => stats?.lastImport
              ? relativeTime(stats.lastImport)
              : 'Нет данных'
            }
          />
        </motion.div>
      </motion.div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Activity chart */}
        <motion.div
          className="card"
          style={{ padding: '20px 24px' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активность</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Сообщений за 30 дней</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <Calendar size={14} strokeWidth={1.75} />
              последние 30 дней
            </div>
          </div>
          <ActivityChart data={activity} loading={statsLoading} height={180} />
        </motion.div>

        {/* Recent messages */}
        <motion.div
          className="card"
          style={{ padding: '20px 24px' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Последние сообщения</div>
            <a
              href="/dashboard/data"
              style={{ fontSize: 12, color: 'var(--accent-soft)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Все <ArrowRight size={12} strokeWidth={2} />
            </a>
          </div>

          {statsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonText lines={1} />
                  <SkeletonText lines={1} />
                </div>
              ))}
            </div>
          ) : !recent || recent.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              {recent.map((msg) => (
                <motion.div key={msg.id} variants={fadeUp}>
                  <RecentItem msg={msg} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function RecentItem({ msg }: { msg: RecentMessage }) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Hash size={12} strokeWidth={2} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 12, fontWeight: 500, color: 'var(--accent-soft)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {msg.chat_name}
          </span>
          <Badge variant="neutral">{chatTypeLabel(msg.chat_type)}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          <Clock size={10} strokeWidth={2} />
          {relativeTime(msg.original_date)}
        </div>
      </div>
      <p style={{
        fontSize: 12, color: 'var(--text-muted)', lineHeight: '1.4',
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{msg.sender_name}: </span>
        {msg.text}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <img
        src="/illustrations/empty.svg"
        alt=""
        style={{ width: 100, height: 100, margin: '0 auto 12px', opacity: 0.6 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Сообщений пока нет</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>
        Подключите источник данных в разделе Подключения
      </p>
    </div>
  )
}
