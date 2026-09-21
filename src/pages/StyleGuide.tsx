/* PHASE 1 — temporary /style-guide route.
 * Renders every design token and component class from tokens.css for review.
 * Wrapped in `.tv2` so the spec classes apply; nothing else on the site is. */
import { asset } from '../lib/utils'
import {
  Dumbbell,
  Calendar,
  Users,
  ClipboardList,
  TrendingUp,
  Apple,
  Activity,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="h-display mb-1 text-xl md:text-2xl">{title}</h2>
      {note ? <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>{note}</p> : null}
      {children}
    </section>
  )
}

function Swatch({ name, value, cssVar }: { name: string; value: string; cssVar?: string }) {
  const isTextSwatch = name.startsWith('--text')
  return (
    <div className="card flex flex-col gap-2 !p-3">
      <div
        className="h-14 w-full rounded"
        style={{
          background: value,
          border: isTextSwatch ? '1px solid var(--border-hairline)' : undefined,
        }}
      />
      <code className="text-[11px]" style={{ color: 'var(--gold)' }}>{name}</code>
      <span className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>
        {value}
        {cssVar ? ` · ${cssVar}` : ''}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Gold line chart — SVG trendline with gradient fill (chart, not AI)  */
/* ------------------------------------------------------------------ */

const CHART_POINTS = [8, 14, 11, 19, 16, 24, 21, 30, 27, 36, 33, 42]
const CHART_W = 560
const CHART_H = 180

function GoldLineChart() {
  const max = Math.max(...CHART_POINTS)
  const stepX = CHART_W / (CHART_POINTS.length - 1)
  const coords = CHART_POINTS.map((v, i) => ({
    x: i * stepX,
    y: CHART_H - (v / max) * (CHART_H - 24) - 8,
  }))
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`
  return (
    <svg
      className="gold-line-chart"
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      role="img"
      aria-label="Sample gold line chart"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="goldLineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} className="gold-line-chart__grid" x1="0" x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} />
      ))}
      <path className="gold-line-chart__area" d={area} />
      <path className="gold-line-chart__line" d={line} />
      {coords.map((c, i) => (
        <circle key={i} className="gold-line-chart__dot" cx={c.x} cy={c.y} r="3.5" />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const GOLD_ICONS = [
  { Icon: Dumbbell, label: 'Dumbbell' },
  { Icon: Calendar, label: 'Calendar' },
  { Icon: Users, label: 'Users' },
  { Icon: ClipboardList, label: 'Clipboard' },
  { Icon: TrendingUp, label: 'Trending up' },
  { Icon: Apple, label: 'Apple' },
  { Icon: Activity, label: 'Activity' },
]

export default function StyleGuide() {
  return (
    <div className="tv2 min-h-dvh px-4 py-8 md:px-10 md:py-12" style={{ background: 'var(--bg-deep)' }}>
      <div className="mx-auto max-w-5xl">
        {/* Header — brand lockup using the actual logo asset */}
        <header className="mb-12 flex flex-col gap-6 border-b pb-8" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="brand-logo">
              <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault" />
              <span className="brand-logo__wordmark">The Vault Fitness</span>
            </span>
            <span className="pill-status-warning">Temporary route — review only</span>
          </div>
          <div>
            <p className="eyebrow mb-2 text-[11px] uppercase" style={{ color: 'var(--gold)', letterSpacing: '0.2em' }}>
              Phase 1 · Design Tokens &amp; Theme Foundation
            </p>
            <h1 className="h-display text-3xl md:text-4xl">
              Token <span className="h-display--gradient">Style Guide</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Every color, class, and component defined in <code className="text-[12px]" style={{ color: 'var(--gold)' }}>src/tokens.css</code>.
              No production page references these classes yet — each later phase opts in by wrapping its surface in{' '}
              <code className="text-[12px]" style={{ color: 'var(--gold)' }}>.tv2</code>.
            </p>
          </div>
        </header>

        {/* Backgrounds */}
        <Section title="Backgrounds" note="Four-step charcoal ramp. --bg-deep is the canvas; --bg-card is every component's home.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" style={{ gap: 'var(--space-gutter)' }}>
            <Swatch name="--bg-deep" value="#0D0D0F" />
            <Swatch name="--bg-charcoal" value="#111214" />
            <Swatch name="--bg-card" value="#17181B" />
            <Swatch name="--bg-elevated" value="#1D1E22" />
          </div>
        </Section>

        {/* Gold scale */}
        <Section title="Gold Scale" note="Metallic gradient, never flat yellow. --gold-gradient is the only fill for primary actions.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" style={{ gap: 'var(--space-gutter)' }}>
            <Swatch name="--gold" value="#D4AF37" />
            <Swatch name="--gold-light" value="#E8C766" />
            <Swatch name="--gold-dark" value="#A67C2E" />
            <Swatch name="--gold-muted" value="#B8A26A" />
          </div>
          <div
            className="card mt-4 flex h-20 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ background: 'var(--gold-gradient)', color: '#000' }}
          >
            --gold-gradient · linear-gradient(135deg, #E8C766 → #D4AF37 → #A67C2E)
          </div>
        </Section>

        {/* Text */}
        <Section title="Text" note="Never pure white — three steps from primary to muted.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3" style={{ gap: 'var(--space-gutter)' }}>
            {[
              ['--text-primary', '#D8D8DC', 'Headlines, key numbers, active states'],
              ['--text-secondary', '#9A9A9E', 'Body copy, labels, table data'],
              ['--text-muted', '#6E6E73', 'Placeholders, timestamps, disabled'],
            ].map(([name, value, use]) => (
              <div key={name} className="card">
                <div className="h-14 w-full rounded border" style={{ background: value, borderColor: 'rgba(212,175,55,0.15)' }} />
                <code className="mt-2 block text-[11px]" style={{ color: 'var(--gold)' }}>{name}</code>
                <span className="block text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>{value}</span>
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{use}</p>
              </div>
            ))}
          </div>
          <div className="card mt-4 space-y-2">
            <p style={{ color: 'var(--text-primary)' }}>Primary — The quick brown fox lifts 100 kg.</p>
            <p style={{ color: 'var(--text-secondary)' }}>Secondary — Session notes and programme details sit here.</p>
            <p style={{ color: 'var(--text-muted)' }}>Muted — Last synced 2 hours ago · Archived.</p>
          </div>
        </Section>

        {/* Status */}
        <Section title="Status" note="Muted, desaturated status colors — used as fills behind the pills below.">
          <div className="grid grid-cols-3 gap-4" style={{ gap: 'var(--space-gutter)' }}>
            <Swatch name="--status-danger" value="#7A2E2E" />
            <Swatch name="--status-success" value="#2E5D3A" />
            <Swatch name="--status-warning" value="#8A6D1E" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" note="Cinzel for display caps (letter-spacing 0.08em) · Inter for data at 16px / 1.5.">
          <div className="card space-y-6">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>.h-display — Cinzel, caps</p>
              <p className="h-display text-2xl md:text-3xl">Unlock Your Fitness Potential</p>
              <p className="h-display h-display--gradient mt-2 text-2xl md:text-3xl">Train Like It's Valuable</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>.body-data — Inter, tabular numerals</p>
              <p className="body-data">4 sets × 6 reps @ 80 kg · HK$14,800.00 · 97.4% retention</p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" note=".btn-gold is the single solid-gold action per view; .btn-outline is every secondary action.">
          <div className="card flex flex-wrap items-center gap-4">
            <button type="button" className="btn-gold">Become a Member</button>
            <button type="button" className="btn-outline">Explore Classes</button>
            <button type="button" className="btn-gold" disabled>Disabled</button>
          </div>
        </Section>

        {/* Pills */}
        <Section title="Status Pills" note="Small uppercase pills over the muted status fills.">
          <div className="card flex flex-wrap items-center gap-3">
            <span className="pill-status-success">Active</span>
            <span className="pill-status-warning">Trial ends Friday</span>
            <span className="pill-status-danger">Payment failed</span>
          </div>
        </Section>

        {/* Card anatomy */}
        <Section title="Card" note=".card — charcoal fill, hairline gold border, 6px radius, shadow-card. Every component lives inside one.">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="h-display text-base">Today's Schedule</h3>
              <span className="pill-status-success">On track</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              09:00 — Hyrox Class · Room A · 8/12 booked
            </p>
            <div className="mt-4">
              <button type="button" className="btn-gold">Book 1-on-1 Session</button>
            </div>
          </div>
        </Section>

        {/* Gold line chart */}
        <Section title="Gold Line Chart" note=".gold-line-chart — glowing gold trendline with gradient area on a black canvas.">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="h-display text-base">Your Progress</h3>
              <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--gold)' }}>Sample data</span>
            </div>
            <GoldLineChart />
          </div>
        </Section>

        {/* Borders, radii, shadows, spacing */}
        <Section title="Borders · Radii · Shadows · Spacing" note="Hairline gold for structure, glow reserved for primary actions.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ gap: 'var(--space-gutter)' }}>
            <div className="card space-y-4">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>--border-hairline · rgba(212,175,55,0.15)</p>
                <div className="h-10 rounded" style={{ border: 'var(--border-hairline)' }} />
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>--border-gold · rgba(212,175,55,0.4)</p>
                <div className="h-10 rounded" style={{ border: 'var(--border-gold)' }} />
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>--radius-card 6px · --radius-pill 999px</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-24" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-card)' }} />
                  <div className="h-10 w-24" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-pill)' }} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>--shadow-gold-glow</p>
                <div className="h-10 w-24 rounded" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-gold-glow)' }} />
              </div>
            </div>
            <div className="card">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Spacing scale 4 → 48px</p>
              <div className="space-y-2">
                {[4, 8, 12, 16, 20, 24, 32, 48].map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-8 text-[11px] tnum" style={{ color: 'var(--text-muted)' }}>{s}</span>
                    <div className="h-3" style={{ width: s, background: 'var(--gold)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Icons */}
        <Section title="Icons" note="Lucide, stroke always gold (#D4AF37). Fitness set only — coins, gems, and investment symbols are forbidden.">
          <div className="card grid grid-cols-4 gap-4 md:grid-cols-7" style={{ gap: 'var(--space-gutter)' }}>
            {GOLD_ICONS.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon size={22} strokeWidth={1.75} color="#D4AF37" aria-hidden />
                <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Brand logo */}
        <Section title="Brand Lockup" note=".brand-logo — the actual THEVAULT-logo-transparent.png asset, sized 28px navbar / 36px sidebar, with wordmark.">
          <div className="card flex flex-wrap items-center gap-10">
            <span className="brand-logo">
              <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault" />
              <span className="brand-logo__wordmark">The Vault Fitness</span>
            </span>
            <span className="brand-logo brand-logo--sidebar">
              <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault" />
              <span className="brand-logo__wordmark">The Vault Fitness</span>
            </span>
          </div>
        </Section>

        <footer className="border-t pt-6 text-center text-[11px] uppercase tracking-[0.2em]" style={{ borderColor: 'rgba(212,175,55,0.15)', color: 'var(--text-muted)' }}>
          Phase 1 — awaiting approval before any page adopts these tokens
        </footer>
      </div>
    </div>
  )
}
