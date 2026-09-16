import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SendHorizonal } from 'lucide-react'
import { getClientById } from '@/data/mock'
import { GridAvatar, SectionHeader } from './shared'

interface Msg {
  id: string
  from: 'coach' | 'client'
  text: string
  time: string
}
interface Thread {
  clientId: string
  messages: Msg[]
  unread: number
}

const SUGGESTED = [
  "No problem — let's move you to Saturday 9am",
  'Send me your travel dates',
  "I'll adjust this week's program",
]

const AUTO_REPLIES = [
  "Perfect, thanks Dan — see you then.",
  'Got it — will log everything in the app.',
  'Brilliant, appreciate it.',
]

let mid = 0
const nid = () => `m-${++mid}`

const seedThreads = (): Thread[] => [
  {
    clientId: 'tom-whitfield',
    unread: 2,
    messages: [
      { id: nid(), from: 'coach', text: 'Tom — big week ahead. Deadlift top set on Thursday.', time: '09:12' },
      { id: nid(), from: 'client', text: "Can't make Thursday — travelling for work", time: '09:48' },
      { id: nid(), from: 'client', text: 'Back Sunday morning. Any chance we can reshuffle?', time: '09:49' },
    ],
  },
  {
    clientId: 'rachel-cheung',
    unread: 0,
    messages: [
      { id: nid(), from: 'client', text: 'Bench felt great today!', time: 'Yesterday' },
      { id: nid(), from: 'coach', text: 'Strong work — 60kg is close. Keep the protein up.', time: 'Yesterday' },
    ],
  },
  {
    clientId: 'priya-sharma',
    unread: 0,
    messages: [
      { id: nid(), from: 'client', text: 'Baby slept through — ready for Friday', time: 'Yesterday' },
      { id: nid(), from: 'coach', text: 'Excellent. FITMAMA Strength at 10:00 — see you there.', time: 'Yesterday' },
    ],
  },
  {
    clientId: 'marcus-lau',
    unread: 0,
    messages: [
      { id: nid(), from: 'coach', text: 'Squat depth looked much better this morning.', time: 'Mon' },
      { id: nid(), from: 'client', text: 'Felt solid. Same again Wednesday?', time: 'Mon' },
    ],
  },
  {
    clientId: 'karen-ng',
    unread: 0,
    messages: [
      { id: nid(), from: 'client', text: 'Loved the Restore class — can I add a second day?', time: 'Sun' },
    ],
  },
]

export default function MessagingPanel({
  requestedThread,
}: {
  requestedThread: { id: string; nonce: number } | null
}) {
  const [threads, setThreads] = useState<Thread[]>(seedThreads)
  const [activeId, setActiveId] = useState('tom-whitfield')
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const replyIdx = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const openThread = (clientId: string) => {
    setActiveId(clientId)
    setThreads((prev) =>
      prev.map((t) => (t.clientId === clientId ? { ...t, unread: 0 } : t)),
    )
  }

  useEffect(() => {
    if (requestedThread) openThread(requestedThread.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedThread?.nonce])

  const active = threads.find((t) => t.clientId === activeId) ?? threads[0]
  const activeClient = getClientById(active.clientId)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [active.messages.length, typing, activeId])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const msg: Msg = { id: nid(), from: 'coach', text: trimmed, time: 'Now' }
    setThreads((prev) =>
      prev.map((t) =>
        t.clientId === activeId ? { ...t, messages: [...t.messages, msg] } : t,
      ),
    )
    setDraft('')
    setTyping(true)
    window.setTimeout(() => {
      setTyping(false)
      const reply: Msg = {
        id: nid(),
        from: 'client',
        text: AUTO_REPLIES[replyIdx.current++ % AUTO_REPLIES.length],
        time: 'Now',
      }
      setThreads((prev) =>
        prev.map((t) =>
          t.clientId === activeId ? { ...t, messages: [...t.messages, reply] } : t,
        ),
      )
    }, 1500)
  }

  return (
    <section className="app-card p-6">
      <SectionHeader eyebrow="Messaging" title="Client conversations" />

      <div className="flex h-[480px] overflow-hidden border border-vault-border">
        {/* Conversation list */}
        <div className="hidden w-[280px] shrink-0 flex-col border-r border-vault-border sm:flex">
          {threads.map((t) => {
            const c = getClientById(t.clientId)
            if (!c) return null
            const last = t.messages[t.messages.length - 1]
            const isActive = t.clientId === activeId
            return (
              <button
                key={t.clientId}
                onClick={() => openThread(t.clientId)}
                className={`flex items-center gap-3 border-b border-vault-border/50 px-4 py-3.5 text-left transition-colors ${
                  isActive ? 'bg-vault-surface-2' : 'hover:bg-vault-surface-2'
                }`}
              >
                <GridAvatar name={c.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-white">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-vault-faint">{last.time}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-vault-muted">
                    {last.from === 'coach' ? 'You: ' : ''}
                    {last.text}
                  </span>
                </span>
                {t.unread > 0 && (
                  <span className="tnum flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-vault-bg">
                    {t.unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Active conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-vault-border bg-vault-surface-2/50 px-4 py-3">
            {activeClient && (
              <GridAvatar name={activeClient.name} size={32} />
            )}
            <div>
              <p className="text-[14px] font-medium text-white">{activeClient?.name}</p>
              <p className="text-[11px] text-vault-faint">{activeClient?.tier}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {active.messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320, delay: i === active.messages.length - 1 ? 0 : 0 }}
                  className={`flex ${m.from === 'coach' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.from === 'coach'
                        ? 'bg-white text-vault-btn-text'
                        : 'bg-vault-surface-2 text-white'
                    }`}
                  >
                    <p>{m.text}</p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        m.from === 'coach' ? 'text-vault-btn-text/60' : 'text-vault-faint'
                      }`}
                    >
                      {m.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 bg-vault-surface-2 px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-vault-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggested replies */}
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => setDraft(s)}
                className="border border-vault-border px-3 py-1.5 text-[11px] text-vault-muted transition-colors hover:border-vault-surface-3 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-3 border-t border-vault-border p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(draft)}
              placeholder={`Message ${activeClient?.name ?? ''}…`}
              className="min-w-0 flex-1 border border-vault-border bg-vault-bg px-3.5 py-2.5 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
            />
            <button
              onClick={() => send(draft)}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-vault-btn-text transition-colors hover:bg-vault-btn-hover"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
