import type { InjectionKey, Ref } from 'vue'

export const WIDE_LAYOUT_KEY: InjectionKey<Ref<boolean>> = Symbol('wide-layout')
