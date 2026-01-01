import { createRng, int, pick, uuid, weighted, type Rng } from './rng'
import type { Agent, MessageRecord, TicketPriority, TicketRecord, TicketStatus } from './types'

export const SEED = 1337
export const ME_ID = 'a_1'
export const FIRST_TICKET_NUMBER = 1001
export const TICKET_COUNT = 120
export const FIRST_MESSAGE_NUMBER = 9001

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export const AGENTS: readonly Agent[] = [
  { id: 'a_1', name: 'Maya Lopez', initials: 'ML', color: 'blue' },
  { id: 'a_2', name: 'Daniel Okafor', initials: 'DO', color: 'violet' },
  { id: 'a_3', name: 'Priya Raman', initials: 'PR', color: 'teal' },
  { id: 'a_4', name: 'Tomás Herrera', initials: 'TH', color: 'amber' },
  { id: 'a_5', name: 'Lena Fischer', initials: 'LF', color: 'rose' },
  { id: 'a_6', name: 'Kenji Watanabe', initials: 'KW', color: 'emerald' },
  { id: 'a_7', name: 'Sofia Marchetti', initials: 'SM', color: 'indigo' },
  { id: 'a_8', name: 'Oliver Grant', initials: 'OG', color: 'orange' },
]

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn',
  'Noah', 'Emma', 'Liam', 'Olivia', 'Mila', 'Lucas', 'Hannah', 'Ethan', 'Chloe', 'Isaac',
  'Nora', 'Felix', 'Iris', 'Hugo', 'Ada', 'Leo', 'Zara', 'Owen', 'Ruby', 'Theo',
]
const LAST_NAMES = [
  'Carter', 'Nguyen', 'Silva', 'Kowalski', 'Brennan', 'Haddad', 'Lindqvist', 'Moreau', 'Patel',
  'Rossi', 'Schmidt', 'Tanaka', 'Walsh', 'Young', 'Duarte', 'Eriksen', 'Fontaine', 'Gallagher',
  'Ibrahim', 'Jensen', 'Kim', 'Larsen', 'Mendes', 'Novak', 'Osei', 'Park', 'Quinn', 'Reyes',
]

const SUBJECTS = [
  "Can't reset my password from the login page",
  'Invoice shows the wrong billing address',
  'Export to CSV is missing the notes column',
  'Two-factor codes arrive several minutes late',
  'How do I add a second admin to our workspace?',
  'Dashboard charts are empty since this morning',
  'Charged twice for the March subscription',
  'Email notifications go to the spam folder',
  'Mobile app logs me out every few hours',
  'Request to close our old workspace',
  'Search does not find documents by title',
  'Need a copy of last year’s receipts',
  'Uploading files larger than 20 MB fails',
  'Team member did not receive the invite email',
  'Calendar sync shows events in the wrong time zone',
  'Feature request: dark mode for the reports page',
  'API key stopped working after rotation',
  'Cannot change the owner of a shared folder',
  'Page is very slow when I open the archive',
  'Webhook deliveries return 401',
  'Downgrade plan at the end of the billing period',
  'Typo in the welcome email template',
  'Imported contacts have duplicated phone numbers',
  'Printing a report cuts off the last column',
  'Single sign-on redirects to a blank page',
  'Account locked after too many attempts',
  'Where can I find the audit log?',
  'Language setting keeps switching back to English',
  'Attachments are not visible to guests',
  'Please update the company name on invoices',
]

const CUSTOMER_LINES = [
  'Hi team, I tried again this morning and the problem is still there.',
  'Thanks for the quick reply! I will check and let you know.',
  'I attached a screenshot of what I see on my side.',
  'This is blocking my whole team, could you prioritise it?',
  'It worked yesterday, nothing changed on our end as far as I know.',
  'Could you tell me when the change will be live?',
  'I cleared the cache and tried another browser — same result.',
  'Just checking in on this one.',
  'Perfect, that solved it. Thank you!',
  'Sorry, one more question about the same thing.',
  'Here are the steps:\n1. Open settings\n2. Click Save\n3. Nothing happens',
  'We are on the Team plan, if that matters.',
]

const AGENT_LINES = [
  'Thanks for reaching out! I am looking into this now.',
  'Could you send me the exact time when it happened? That helps us find the logs.',
  'I have escalated this to our engineers and will update you today.',
  'A change went out an hour ago — could you try again and confirm?',
  'I can see the duplicate charge, the refund is on its way (3–5 business days).',
  'You can find this under Settings → Workspace → Members.',
  'Glad it works now! I will close this ticket, reply any time to reopen it.',
  'Thanks for your patience while we investigate.',
  'Could you check whether the issue also happens in a private window?',
  'I updated the record on our side. Let me know if anything still looks off.',
]

const LONG_SUBJECT =
  'Recurring export of monthly usage reports fails for workspaces with more than five hundred members, ' +
  'shows a generic error and never sends the scheduled email to the billing contact'

const LONG_TOKEN =
  'https://files.example.com/shared/exports/2026/03/usage-report-final-version-' +
  'a8f3c2d1e9b74f6a8c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0' +
  'a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d.csv'

interface SpecialSpec {
  number: number
  subject: string
  requester: { name: string; email: string }
  status: TicketStatus
  priority: TicketPriority
  assigneeId: string | null
  unread: boolean
  updatedAgo: number
  span: number
  messageCount: number
  bodies?: { type: 'customer' | 'agent' | 'system'; body: string }[]
}

const SPECIALS: SpecialSpec[] = [
  {
    number: 1001,
    subject: 'Bulk import keeps timing out on large spreadsheets',
    requester: { name: 'Alex Carter', email: 'alex.carter@example.com' },
    status: 'open',
    priority: 'high',
    assigneeId: 'a_1',
    unread: true,
    updatedAgo: 2 * MIN,
    span: 6 * DAY,
    messageCount: 1200,
  },
  {
    number: 1002,
    subject: LONG_SUBJECT,
    requester: { name: 'Jordan Fontaine', email: 'jordan.fontaine@example.com' },
    status: 'pending',
    priority: 'normal',
    assigneeId: 'a_3',
    unread: false,
    updatedAgo: 25 * MIN,
    span: 3 * DAY,
    messageCount: 12,
  },
  {
    number: 1003,
    subject: 'Shared export link is cut off in the email',
    requester: { name: 'Sam Kowalski', email: 'sam.kowalski@example.com' },
    status: 'open',
    priority: 'normal',
    assigneeId: 'a_1',
    unread: true,
    updatedAgo: 40 * 1000,
    span: 2 * HOUR,
    messageCount: 8,
    bodies: [{ type: 'customer', body: `The link from the email does not open:\n${LONG_TOKEN}` }],
  },
  {
    number: 1004,
    subject: 'Рахунок-фактура не відображається / Rechnung wird nicht angezeigt',
    requester: {
      name: 'Олександра Шевченко-Гриценко',
      email: 'oleksandra.shevchenko@example.com',
    },
    status: 'open',
    priority: 'high',
    assigneeId: 'a_5',
    unread: false,
    updatedAgo: 3 * HOUR,
    span: 2 * DAY,
    messageCount: 10,
    bodies: [
      {
        type: 'customer',
        body: 'Добрий день! Після оновлення сторінка з рахунками-фактурами залишається порожньою, хоча минулого місяця все працювало.',
      },
      {
        type: 'agent',
        body: 'Guten Tag! Vielen Dank für Ihre Nachricht. Die Rechnungsübersicht wird gerade überarbeitet; die Benachrichtigungseinstellungen bleiben unverändert.',
      },
      {
        type: 'customer',
        body: 'Danke! Zusätzlich: Kundendienstmitarbeiterinnen sehen die Zahlungsbestätigungsnachrichten nicht.',
      },
    ],
  },
  {
    number: 1005,
    subject: 'Thank you so much for the help 🎉🙏',
    requester: { name: 'Mila Tanaka', email: 'mila.tanaka@example.com' },
    status: 'resolved',
    priority: 'low',
    assigneeId: 'a_2',
    unread: false,
    updatedAgo: 22 * HOUR,
    span: DAY,
    messageCount: 6,
    bodies: [
      { type: 'customer', body: 'It works now! 🎉🎉 You are the best 🙌' },
      { type: 'agent', body: 'Happy to help 😊 Have a great week! 🌟' },
    ],
  },
  {
    number: 1006,
    subject: 'Request to delete an old test account',
    requester: { name: 'Riley Walsh', email: 'riley.walsh@example.com' },
    status: 'closed',
    priority: 'normal',
    assigneeId: 'a_1',
    unread: false,
    updatedAgo: 5 * HOUR,
    span: 2 * DAY,
    messageCount: 7,
  },
  {
    number: 1007,
    subject: 'Nobody can sign in — whole team locked out',
    requester: { name: 'Taylor Haddad', email: 'taylor.haddad@example.com' },
    status: 'open',
    priority: 'urgent',
    assigneeId: null,
    unread: true,
    updatedAgo: 12 * MIN,
    span: 30 * MIN,
    messageCount: 5,
  },
  {
    number: 1008,
    subject: 'Change the billing email for our account',
    requester: { name: 'Casey Lindqvist', email: 'casey.lindqvist@example.com' },
    status: 'pending',
    priority: 'low',
    assigneeId: 'a_4',
    unread: false,
    updatedAgo: 5 * MIN,
    span: 6 * HOUR,
    messageCount: 9,
  },
]

export interface SeedData {
  tickets: TicketRecord[]
  messages: Map<string, MessageRecord[]>
  nextMessageNumber: number
  nextTicketNumber: number
}

export function requesterFor(rng: Rng): { name: string; email: string } {
  const first = pick(rng, FIRST_NAMES)
  const last = pick(rng, LAST_NAMES)
  return { name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase() }
}

export function randomSubject(rng: Rng): string {
  return pick(rng, SUBJECTS)
}

export function randomCustomerLine(rng: Rng): string {
  return pick(rng, CUSTOMER_LINES)
}

function randomStatus(rng: Rng): TicketStatus {
  return weighted(rng, [
    ['open', 40],
    ['pending', 25],
    ['resolved', 20],
    ['closed', 15],
  ] as const)
}

function randomPriority(rng: Rng): TicketPriority {
  return weighted(rng, [
    ['low', 20],
    ['normal', 45],
    ['high', 25],
    ['urgent', 10],
  ] as const)
}

function randomAssignee(rng: Rng): string | null {
  const roll = rng()
  if (roll < 0.15) return null
  if (roll < 0.35) return ME_ID
  return pick(rng, AGENTS.slice(1)).id
}

export function agentName(id: string | null): string {
  return AGENTS.find((a) => a.id === id)?.name ?? 'Support'
}

/** Generates the full deterministic dataset relative to `now` (epoch ms). */
export function generateSeed(now: number): SeedData {
  const rng = createRng(SEED)
  const tickets: TicketRecord[] = []
  const messages = new Map<string, MessageRecord[]>()
  let messageNumber = FIRST_MESSAGE_NUMBER

  for (let i = 0; i < TICKET_COUNT; i++) {
    const number = FIRST_TICKET_NUMBER + i
    const special = SPECIALS.find((s) => s.number === number)
    let ticket: TicketRecord
    let count: number
    let span: number
    let bodies: SpecialSpec['bodies']

    if (special) {
      const updatedAt = now - special.updatedAgo
      span = special.span
      count = special.messageCount
      bodies = special.bodies
      ticket = {
        id: `t_${number}`,
        key: `DSK-${number}`,
        subject: special.subject,
        status: special.status,
        priority: special.priority,
        requester: { ...special.requester },
        assigneeId: special.assigneeId,
        unread: special.unread,
        createdAt: updatedAt - span,
        updatedAt,
        version: 1 + int(rng, 0, 3),
      }
    } else {
      // Spread the remaining tickets from ~1 hour to ~40 days back, deterministically.
      const updatedAgo = Math.round(HOUR + rng() * rng() * 40 * DAY)
      const updatedAt = now - Math.floor(updatedAgo / 1000) * 1000
      span = Math.round(HOUR + rng() * 9 * DAY)
      count = int(rng, 5, 80)
      const status = randomStatus(rng)
      ticket = {
        id: `t_${number}`,
        key: `DSK-${number}`,
        subject: randomSubject(rng),
        status,
        priority: randomPriority(rng),
        requester: requesterFor(rng),
        assigneeId: randomAssignee(rng),
        unread: status !== 'closed' && rng() < 0.3,
        createdAt: updatedAt - span,
        updatedAt,
        version: 1 + int(rng, 0, 4),
      }
    }

    const list: MessageRecord[] = []
    for (let m = 0; m < count; m++) {
      const createdAt =
        count === 1
          ? ticket.updatedAt
          : Math.floor((ticket.createdAt + (span * m) / (count - 1)) / 1000) * 1000
      const fromBodies = bodies && m >= count - bodies.length ? bodies[m - (count - bodies.length)] : undefined
      let type: MessageRecord['type']
      let body: string
      if (fromBodies) {
        type = fromBodies.type
        body = fromBodies.body
      } else if (m === 0) {
        type = 'customer'
        body = `Hello, ${ticket.subject.charAt(0).toLowerCase()}${ticket.subject.slice(1)}. Can you help?`
      } else if (m === count - 1 && ticket.status === 'closed') {
        type = 'system'
        body = `Ticket closed by ${agentName(ticket.assigneeId ?? 'a_2')}`
      } else if (rng() < 0.06) {
        type = 'system'
        body = pick(rng, [
          `Assigned to ${agentName(ticket.assigneeId ?? 'a_2')}`,
          'Status changed to pending',
          'Priority changed to high',
        ])
      } else if (rng() < 0.5) {
        type = 'customer'
        body = pick(rng, CUSTOMER_LINES)
      } else {
        type = 'agent'
        body = pick(rng, AGENT_LINES)
      }
      const authorId = type === 'agent' ? (ticket.assigneeId ?? 'a_2') : null
      list.push({
        id: `m_${messageNumber}`,
        seq: messageNumber,
        ticketId: ticket.id,
        type,
        authorName:
          type === 'customer' ? ticket.requester.name : type === 'agent' ? agentName(authorId) : 'System',
        authorId,
        body,
        createdAt,
        clientMessageId: type === 'agent' ? uuid(rng) : null,
      })
      messageNumber++
    }
    tickets.push(ticket)
    messages.set(ticket.id, list)
  }

  return {
    tickets,
    messages,
    nextMessageNumber: messageNumber,
    nextTicketNumber: FIRST_TICKET_NUMBER + TICKET_COUNT,
  }
}
