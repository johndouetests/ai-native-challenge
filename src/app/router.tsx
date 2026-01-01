import { createBrowserRouter, Navigate, useLocation } from 'react-router'
import { TicketPlaceholder } from '@/features/thread/TicketPlaceholder'
import { TicketView } from '@/features/thread/TicketView'
import { AppShell } from './AppShell'
import { InboxLayout } from './InboxLayout'

function RedirectToTickets() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/tickets', search }} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <RedirectToTickets /> },
      {
        path: 'tickets',
        element: <InboxLayout />,
        children: [
          { index: true, element: <TicketPlaceholder /> },
          { path: ':id', element: <TicketView /> },
        ],
      },
      { path: '*', element: <Navigate to="/tickets" replace /> },
    ],
  },
])
