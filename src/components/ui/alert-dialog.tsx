import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description

/**
 * AlertDialog ignores outside clicks by design; `onOverlayClick` lets the caller treat a click on
 * the overlay as Cancel.
 */
export function AlertDialogContent({
  className,
  onOverlayClick,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> & { onOverlayClick?: () => void }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="absolute inset-0 z-[var(--z-dialog)] bg-overlay" onClick={onOverlayClick} />
      <AlertDialogPrimitive.Content
        className={cn(
          'absolute left-1/2 top-1/2 z-[var(--z-dialog)] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 text-foreground shadow-xl',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}
