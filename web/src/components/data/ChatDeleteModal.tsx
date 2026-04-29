'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  open:      boolean
  chatName:  string
  count:     number
  onClose:   () => void
  onConfirm: (block: boolean) => Promise<void> | void
}

export function ChatDeleteModal({ open, chatName, count, onClose, onConfirm }: Props) {
  const [block,   setBlock]   = useState(false)
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await onConfirm(block)
    } finally {
      setLoading(false)
      setBlock(false)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: 'rgba(248,113,113,0.1)' }}
        >
          <Trash2 size={26} style={{ color: 'var(--danger)' }} strokeWidth={1.75} />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-base">Удалить данные чата?</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Будут удалены все сохранённые сообщения{chatName ? <> чата <b>{chatName}</b></> : null}
            {count > 0 && <> ({count.toLocaleString('ru-RU')})</>}.
            Действие необратимо.
          </p>
        </div>

        <label
          className="flex items-start gap-2.5 w-full text-left p-3 rounded-lg cursor-pointer"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <input
            type="checkbox"
            checked={block}
            onChange={e => setBlock(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--accent-soft)' }}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Не загружать новые сообщения</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              В будущем сообщения из этого чата будут пропускаться. Можно отменить из списка заблокированных.
            </span>
          </span>
        </label>

        <div className="flex gap-3 w-full pt-1">
          <Button variant="ghost" size="md" className="flex-1" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button variant="danger" size="md" className="flex-1" loading={loading} onClick={handle}>
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  )
}
