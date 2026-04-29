'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState, useRef, useEffect, cloneElement, isValidElement } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    onFocus?: (e: React.FocusEvent) => void
    onBlur?: (e: React.FocusEvent) => void
  }>
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState({ top: 0, left: 0 })
  const triggerRef            = useRef<HTMLElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function show() {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const r = triggerRef.current.getBoundingClientRect()
      const offset = 8
      const positions = {
        top:    { top: r.top  - offset, left: r.left + r.width / 2 },
        bottom: { top: r.bottom + offset, left: r.left + r.width / 2 },
        left:   { top: r.top  + r.height / 2, left: r.left - offset },
        right:  { top: r.top  + r.height / 2, left: r.right + offset },
      }
      setPos(positions[side])
      setVisible(true)
    }, delay)
  }

  function hide() {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  const transforms: Record<NonNullable<TooltipProps['side']>, string> = {
    top:    'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left:   'translate(-100%, -50%)',
    right:  'translate(0, -50%)',
  }

  if (!isValidElement(children)) return children

  const trigger = cloneElement(children, {
    ...children.props,
    // @ts-expect-error — attaching ref to unknown element type
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => { show(); children.props.onMouseEnter?.(e) },
    onMouseLeave: (e: React.MouseEvent) => { hide(); children.props.onMouseLeave?.(e) },
    onFocus:      (e: React.FocusEvent) => { show(); children.props.onFocus?.(e) },
    onBlur:       (e: React.FocusEvent) => { hide(); children.props.onBlur?.(e) },
  })

  return (
    <>
      {trigger}
      {mounted && createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              className="tooltip fixed z-[9999]"
              style={{ top: pos.top, left: pos.left, transform: transforms[side] }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.12 }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
