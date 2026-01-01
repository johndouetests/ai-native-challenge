import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { filtersToSearch, parseFilters, type TicketFilters } from './filters'

/**
 * Filters live in the URL (FR-L-03). The returned object keeps its identity while the URL means
 * the same filters, so effects keyed on it only run on real changes.
 */
export function useFilters(): [TicketFilters, (next: TicketFilters) => void] {
  const location = useLocation()
  const navigate = useNavigate()
  const search = filtersToSearch(parseFilters(new URLSearchParams(location.search)))
  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search])
  const pathname = location.pathname
  const setFilters = useCallback(
    (next: TicketFilters) => {
      // Synchronous so the new list request goes out within the same input event.
      void navigate({ pathname, search: filtersToSearch(next) }, { flushSync: true })
    },
    [navigate, pathname],
  )
  return [filters, setFilters]
}
