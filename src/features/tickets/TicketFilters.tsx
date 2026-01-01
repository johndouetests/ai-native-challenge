import { ArrowUpDown, ChevronDown, Search, UserRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRIORITIES, PRIORITY_LABEL, SORTS, SORT_LABEL, STATUSES, STATUS_LABEL, type SortKey } from '@/lib/types'
import { useDirectory } from './directory'
import { SEARCH_DEBOUNCE_MS, type TicketFilters as Filters } from './filters'

interface TicketFiltersProps {
  filters: Filters
  search: string
  onSearchChange: (value: string) => void
  onChange: (next: Filters) => void
}

function toggle<T extends string>(list: T[], value: T, on: boolean): T[] {
  return on ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value)
}

function MultiSelectTrigger({ label, count, testId }: { label: string; count: number; testId: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        data-testid={testId}
        aria-label={`${label} filter${count ? `, ${count} selected` : ''}`}
        className="min-w-0 justify-between px-3 font-normal"
      >
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1">
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs font-medium leading-5 text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDown className="text-muted-foreground" aria-hidden="true" />
        </span>
      </Button>
    </DropdownMenuTrigger>
  )
}

export function TicketFilters({ filters, search, onSearchChange, onChange }: TicketFiltersProps) {
  const { agents } = useDirectory()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // A pending debounce never outlives a URL change or the component.
  useEffect(() => () => clearTimeout(timer.current), [filters.q])

  function onSearchInput(value: string) {
    onSearchChange(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (value !== filters.q) onChange({ ...filters, q: value })
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="@container flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          type="search"
          data-testid="search-input"
          aria-label="Search tickets"
          placeholder="Search tickets"
          className="pl-9"
          onChange={(e) => onSearchInput(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        <DropdownMenu>
          <MultiSelectTrigger label="Status" count={filters.status.length} testId="filter-status" />
          <DropdownMenuContent align="start">
            {STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                data-testid={`filter-status-option-${status}`}
                checked={filters.status.includes(status)}
                onCheckedChange={(on) => onChange({ ...filters, status: toggle(filters.status, status, on) })}
              >
                {STATUS_LABEL[status]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <MultiSelectTrigger label="Priority" count={filters.priority.length} testId="filter-priority" />
          <DropdownMenuContent align="start">
            {PRIORITIES.map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority}
                data-testid={`filter-priority-option-${priority}`}
                checked={filters.priority.includes(priority)}
                onCheckedChange={(on) => onChange({ ...filters, priority: toggle(filters.priority, priority, on) })}
              >
                {PRIORITY_LABEL[priority]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={filters.assignee ?? 'all'}
          onValueChange={(value) => onChange({ ...filters, assignee: value === 'all' ? null : value })}
        >
          <SelectTrigger data-testid="filter-assignee" aria-label="Assignee filter" className="w-full">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <SelectValue className="truncate" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="filter-assignee-option-all">
              Anyone
            </SelectItem>
            <SelectItem value="me" data-testid="filter-assignee-option-me">
              Me
            </SelectItem>
            <SelectItem value="unassigned" data-testid="filter-assignee-option-unassigned">
              Unassigned
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id} data-testid={`filter-assignee-option-${agent.id}`}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(value) => onChange({ ...filters, sort: value as SortKey })}>
          <SelectTrigger data-testid="sort-select" aria-label="Sort by" className="w-full">
            <span className="flex min-w-0 items-center gap-2">
              <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <SelectValue className="truncate" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((sort) => (
              <SelectItem key={sort} value={sort} data-testid={`sort-option-${sort}`}>
                {SORT_LABEL[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
