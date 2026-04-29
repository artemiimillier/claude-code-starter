'use client'

import { motion } from 'framer-motion'

interface BurgerProps {
  isOpen: boolean
  onClick: () => void
}

export function Burger({ isOpen, onClick }: BurgerProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-9 h-9 gap-[5px] rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
      aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
    >
      {[
        isOpen ? { rotate: 45,  y: 7 }  : { rotate: 0, y: 0 },
        isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 },
        isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 },
      ].map((anim, i) => (
        <motion.span
          key={i}
          animate={anim}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="block rounded-full"
          style={{ width: 20, height: 2, background: 'var(--text-muted)', transformOrigin: 'center' }}
        />
      ))}
    </button>
  )
}
