import type { CSSProperties } from 'react'
import { Toaster as Sonner } from 'sonner'

const style = {
  '--normal-bg': 'var(--card)',
  '--normal-text': 'var(--foreground)',
  '--normal-border': 'var(--border)',
  '--success-bg': 'var(--card)',
  '--success-text': 'var(--foreground)',
  '--success-border': 'var(--border)',
  '--error-bg': 'var(--card)',
  '--error-text': 'var(--foreground)',
  '--error-border': 'var(--destructive)',
  zIndex: 'var(--z-toast)',
  pointerEvents: 'auto',
} as CSSProperties

export function Toaster() {
  return <Sonner position="bottom-right" duration={4000} toastOptions={{ className: 'deskline-toast' }} style={style} />
}
