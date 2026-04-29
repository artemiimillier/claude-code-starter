'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  size?: keyof typeof sizeClass
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, size = 'md', title, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={cn(
              'relative w-full z-10 card rounded-t-2xl sm:rounded-2xl overflow-hidden',
              sizeClass[size],
              className
            )}
            style={{ background: 'var(--surface)' }}
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{ scale: 0.96,    opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-hover)' }} />
            </div>

            {/* Header */}
            {title !== undefined && (
              <div className="flex items-center justify-between px-6 pt-5 pb-4"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-semibold text-base">{title}</h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className={cn('p-6', title === undefined && 'pt-6')}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
