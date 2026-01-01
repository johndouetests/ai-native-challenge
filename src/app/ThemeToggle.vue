<script setup lang="ts">
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ThemeChoice } from './theme'

const { choice, resolved, setTheme } = useTheme()
const icon = computed(() => (choice.value === 'system' ? Monitor : resolved.value === 'dark' ? Moon : Sun))
const options: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        data-testid="theme-toggle"
        :data-theme-choice="choice"
      >
        <component :is="icon" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        :model-value="choice"
        @update:model-value="(v: unknown) => setTheme(v as ThemeChoice)"
      >
        <DropdownMenuRadioItem
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :data-testid="`theme-option-${option.value}`"
        >
          {{ option.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
