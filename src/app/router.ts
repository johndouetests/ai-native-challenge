import { createRouter, createWebHistory } from 'vue-router'
import InboxLayout from './InboxLayout.vue'
import TicketPlaceholder from '@/features/thread/TicketPlaceholder.vue'
import TicketView from '@/features/thread/TicketView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: (to) => ({ path: '/tickets', query: to.query }) },
    {
      path: '/tickets',
      component: InboxLayout,
      children: [
        { path: '', name: 'tickets', component: TicketPlaceholder },
        { path: ':id', name: 'ticket', component: TicketView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/tickets' },
  ],
})
