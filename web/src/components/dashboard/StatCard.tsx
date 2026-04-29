'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { TrendBadge } from '@/components/ui/Badge'
import { SparklineChart } from '@/components/charts/SparklineChart'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  color?: string
  trend?: number
  sparkline?: number[]
  loading?: boolean
  formatter?: (n: number) => string
}

function useCountUp(target: number, duration = 800) {
  const [current, setCurrent] = useState(0)
  const frame = useRef<number>(undefined)
  const start = useRef<number>(undefined)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    const from = 0
    const animate = (ts: number) => {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(from + (target - from) * eased))
      if (progress < 1) frame.current = requestAnimationFrame(animate)
    }
    frame.current = requestAnimationFrame(animate)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration])

  return current
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'var(--accent-soft)',
  trend,
  sparkline,
  loading = false,
  formatter = (n) => n.toLocaleString('ru-RU'),
}: StatCardProps) {
  const displayed = useCountUp(loading ? 0 : value)

  if (loading) return <SkeletonCard />

  return (
    <motion.div
      className="card"
      style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
    >
      {/* Glow dot */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 80, height: 80, borderRadius: '50%',
        background: color, opacity: 0.08, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.75} color={color} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>

      <div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          {formatter(displayed)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <SparklineChart data={sparkline} color={color} height={44} />
        </div>
      )}
    </motion.div>
  )
}
