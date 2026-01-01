<script setup lang="ts">
import { ArrowUpDown, ChevronDown, Search, UserRound } from 'lucide-vue-next'
import { onBeforeUnmount, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PRIORITIES,
  PRIORITY_LABEL,
  SORTS,
  SORT_LABEL,
  STATUSES,
  STATUS_LABEL,
  type SortKey,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/types'
import { useDirectory } from './directory'
import { SEARCH_DEBOUNCE_MS, type TicketFilters } from './filters'

const props = defineProps<{ filters: TicketFilters }>()
const emit = defineEmits<{ change: [filters: TicketFilters] }>()
const directory = useDirectory()

const search = defineModel<string>('search', { required: true })
let timer: ReturnType<typeof setTimeout> | undefined

// Back/forward navigation changes the URL: reflect it in the input.
watch(
  () => props.filters.q,
  (q) => {
    if (q !== search.value) {
      clearTimeout(timer)
      search.value = q
    }
  },
)

function onSearchInput(value: string) {
  search.value = value
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (search.value !== props.filters.q) emit('change', { ...props.filters, q: search.value })
  }, SEARCH_DEBOUNCE_MS)
}
onBeforeUnmount(() => clearTimeout(timer))

function toggle<T extends string>(list: T[], value: T, on: boolean): T[] {
  return on ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value)
}

function setStatus(status: TicketStatus, on: boolean) {
  emit('change', { ...props.filters, status: toggle(props.filters.status, status, on) })
}
function setPriority(priority: TicketPriority, on: boolean) {
  emit('change', { ...props.filters, priority: toggle(props.filters.priority, priority, on) })
}
function setAssignee(value: unknown) {
  emit('change', { ...props.filters, assignee: value === 'all' ? null : String(value) })
}
function setSort(value: unknown) {
  emit('change', { ...props.filters, sort: value as SortKey })
}
</script>

<template>
  <div class="flex flex-col gap-2 @container">
    <div class="relative">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        :model-value="search"
        type="search"
        data-testid="search-input"
        aria-label="Search tickets"
        placeholder="Search tickets"
        class="pl-9"
        @update:model-value="onSearchInput"
      />
    </div>
    <div class="grid grid-cols-2 gap-2 @lg:grid-cols-4">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            data-testid="filter-status"
            :aria-label="`Status filter${filters.status.length ? `, ${filters.status.length} selected` : ''}`"
            class="min-w-0 justify-between px-3 font-normal"
          >
            <span class="truncate">Status</span>
            <span class="flex items-center gap-1">
              <span
                v-if="filters.status.length"
                class="rounded-full bg-primary px-1.5 text-xs font-medium leading-5 text-primary-foreground"
              >
                {{ filters.status.length }}
              </span>
              <ChevronDown class="text-muted-foreground" aria-hidden="true" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            v-for="status in STATUSES"
            :key="status"
            :data-testid="`filter-status-option-${status}`"
            :model-value="filters.status.includes(status)"
            @update:model-value="(on: boolean) => setStatus(status, on)"
          >
            {{ STATUS_LABEL[status] }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            data-testid="filter-priority"
            :aria-label="`Priority filter${filters.priority.length ? `, ${filters.priority.length} selected` : ''}`"
            class="min-w-0 justify-between px-3 font-normal"
          >
            <span class="truncate">Priority</span>
            <span class="flex items-center gap-1">
              <span
                v-if="filters.priority.length"
                class="rounded-full bg-primary px-1.5 text-xs font-medium leading-5 text-primary-foreground"
              >
                {{ filters.priority.length }}
              </span>
              <ChevronDown class="text-muted-foreground" aria-hidden="true" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            v-for="priority in PRIORITIES"
            :key="priority"
            :data-testid="`filter-priority-option-${priority}`"
            :model-value="filters.priority.includes(priority)"
            @update:model-value="(on: boolean) => setPriority(priority, on)"
          >
            {{ PRIORITY_LABEL[priority] }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Select :model-value="filters.assignee ?? 'all'" @update:model-value="setAssignee">
        <SelectTrigger data-testid="filter-assignee" aria-label="Assignee filter" class="w-full">
          <span class="flex min-w-0 items-center gap-2">
            <UserRound class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue class="truncate" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="filter-assignee-option-all">Anyone</SelectItem>
          <SelectItem value="me" data-testid="filter-assignee-option-me">Me</SelectItem>
          <SelectItem value="unassigned" data-testid="filter-assignee-option-unassigned">Unassigned</SelectItem>
          <SelectItem
            v-for="agent in directory.agents"
            :key="agent.id"
            :value="agent.id"
            :data-testid="`filter-assignee-option-${agent.id}`"
          >
            {{ agent.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="filters.sort" @update:model-value="setSort">
        <SelectTrigger data-testid="sort-select" aria-label="Sort by" class="w-full">
          <span class="flex min-w-0 items-center gap-2">
            <ArrowUpDown class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue class="truncate" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="sort in SORTS" :key="sort" :value="sort" :data-testid="`sort-option-${sort}`">
            {{ SORT_LABEL[sort] }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
