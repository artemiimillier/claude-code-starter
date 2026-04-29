'use client'

import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line      = dynamic(() => import('recharts').then(m => m.Line),      { ssr: false })

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
}

export function SparklineChart({ data, color = 'var(--accent-soft)', height = 48 }: SparklineChartProps) {
  const points = data.map((value, i) => ({ i, value }))

  return (
    <div style={{ width: '100%', height }}>
      <LineChart width={160} height={height} data={points}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      </LineChart>
    </div>
  )
}
