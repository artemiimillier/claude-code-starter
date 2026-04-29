'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const AreaChart           = dynamic(() => import('recharts').then(m => m.AreaChart),           { ssr: false })
const Area                = dynamic(() => import('recharts').then(m => m.Area),                { ssr: false })
const XAxis               = dynamic(() => import('recharts').then(m => m.XAxis),               { ssr: false })
const YAxis               = dynamic(() => import('recharts').then(m => m.YAxis),               { ssr: false })
const CartesianGrid       = dynamic(() => import('recharts').then(m => m.CartesianGrid),       { ssr: false })
const Tooltip             = dynamic(() => import('recharts').then(m => m.Tooltip),             { ssr: false })

interface ActivityPoint { day: string; count: number }

interface ActivityChartProps {
  data: ActivityPoint[] | null
  loading?: boolean
  height?: number
}

function makePlaceholder(n = 30): ActivityPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    day: String(i),
    count: Math.round(40 + 30 * Math.sin(i * 0.4 + 1) + Math.random() * 12),
  }))
}

export function ActivityChart({ data, loading = false, height = 200 }: ActivityChartProps) {
  const isPlaceholder = loading || !data
  const [placeholder, setPlaceholder] = useState(makePlaceholder)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Animate placeholder data
  useEffect(() => {
    if (!isPlaceholder) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setPlaceholder(prev => [
        ...prev.slice(1),
        {
          day:   String(Date.now()),
          count: Math.round(40 + 30 * Math.sin(Date.now() / 900) + Math.random() * 12),
        },
      ])
    }, 220)
    return () => clearInterval(timerRef.current)
  }, [isPlaceholder])

  const points = isPlaceholder ? placeholder : data!
  const shortDay = (s: string) => {
    if (isPlaceholder) return ''
    try { return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }
    catch { return s }
  }

  return (
    <div style={{ width: '100%', height, opacity: isPlaceholder ? 0.45 : 1, transition: 'opacity 0.5s ease' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8ae3ee" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8ae3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={{ fontSize: 11, fill: 'rgba(240,240,242,0.4)' }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(points.length / 5)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(240,240,242,0.4)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--text)',
            }}
            itemStyle={{ color: 'var(--accent-soft)' }}
            labelStyle={{ color: 'var(--text-muted)', marginBottom: 2 }}
            cursor={{ stroke: 'rgba(138,227,238,0.2)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8ae3ee"
            strokeWidth={isPlaceholder ? 1.5 : 2}
            strokeDasharray={isPlaceholder ? '4 3' : undefined}
            fill="url(#actGrad)"
            isAnimationActive={!isPlaceholder}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
