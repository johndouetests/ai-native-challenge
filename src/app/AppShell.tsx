import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { realtime } from '@/features/realtime/realtimeClient'
import { AppHeader } from './AppHeader'

export function AppShell() {
  useEffect(() => {
    realtime.start()
    return () => realtime.stop()
  }, [])

  return (
    <TooltipProvider delayDuration={300} disableHoverableContent>
      <div className="flex h-dvh flex-col overflow-hidden">
        <AppHeader />
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
