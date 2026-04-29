'use client'

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

type ConfirmType = 'danger' | 'warning' | 'success'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  type?: ConfirmType
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
}

const config = {
  danger: {
    Icon:  XCircle,
    color: 'var(--danger)',
    bg:    'rgba(248,113,113,0.1)',
    confirmVariant: 'danger' as const,
  },
  warning: {
    Icon:  AlertTriangle,
    color: 'var(--warning)',
    bg:    'rgba(251,191,36,0.1)',
    confirmVariant: 'secondary' as const,
  },
  success: {
    Icon:  CheckCircle,
    color: 'var(--success)',
    bg:    'rgba(74,222,128,0.1)',
    confirmVariant: 'secondary' as const,
  },
}

export function ConfirmModal({
  open, onClose, onConfirm,
  type = 'danger',
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText  = 'Отмена',
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const { Icon, color, bg } = config[type]

  async function handleConfirm() {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: bg }}
        >
          <Icon size={28} style={{ color }} strokeWidth={1.75} />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-base">{title}</p>
          {description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full pt-1">
          <Button
            variant="ghost"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            size="md"
            className="flex-1"
            loading={loading}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
