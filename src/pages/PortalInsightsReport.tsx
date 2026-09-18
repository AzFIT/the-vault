/**
 * Monthly revenue report (/portal/insights/report) — a standalone,
 * print-first page (no app chrome) opened from the insights page's
 * "Print / PDF report" button. White background, black text, A4-friendly
 * width; every figure comes from the same lib/insights helpers as the
 * insights page, so the numbers always reconcile. Respects the shared
 * hide-figures privacy flag by masking currency values.
 *
 * Deliberately outside PortalShell so printing yields a clean document —
 * the trade-off is that the route is unguarded while auth is tester-mode.
 */
import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { formatHKD } from '@/data/mock'
import { asset } from '@/lib/utils'
import { getKpiHidden } from '@/lib/kpiHidden'
import { revenueRowsNewestFirst, staffPerformanceRows, STREAMS } from '@/lib/insights'

const MASK = '•••'

const th = 'border-b border-neutral-400 pb-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500'
const td = 'tnum border-b border-neutral-200 py-1.5 pr-3 text-[12px] text-neutral-800'
const tdR = `${td} text-right`

export default function PortalInsightsReport() {
  const hidden = getKpiHidden()
  const rows = revenueRowsNewestFirst()
  const last = rows[0]
  const prev = rows[1]
  const staff = staffPerformanceRows()
  const maxRevenue = Math.max(...staff.map((r) => r.revenue))

  const mom = last.mom ?? 0
  const money = (v: number) => (hidden ? MASK : formatHKD(v))
  const avgPerSession = Math.round(last.total / Math.max(1, last.sessionsDelivered))

  // Auto-open the system print dialog once the document has rendered, and
  // neutralise the app-wide dark body background while this page is mounted
  // so the document is white on screen and on paper.
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#ffffff'
    const t = window.setTimeout(() => window.print(), 600)
    return () => {
      document.body.style.background = prev
      window.clearTimeout(t)
    }
  }, [])

  // Column totals — the printed totals must equal the sum of the months.
  const totals = rows.reduce(
    (acc, r) => ({
      pt: acc.pt + r.pt,
      memberships: acc.memberships + r.memberships,
      classes: acc.classes + r.classes,
      total: acc.total + r.total,
      sessions: acc.sessions + r.sessionsDelivered,
      newClients: acc.newClients + r.newClients,
    }),
    { pt: 0, memberships: 0, classes: 0, total: 0, sessions: 0, newClients: 0 },
  )

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-[800px] px-8 py-10 print:px-4 print:py-6">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
          <div>
            <img src={asset('brand/vault-logo-full.png')} alt="The Vault Fitness" className="h-14 w-auto print:h-12" />
          </div>
          <div className="text-right text-[11px] leading-relaxed text-neutral-500">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-900">Monthly revenue report</p>
            <p>Reporting month: {last.label}</p>
            <p>Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Total revenue', value: money(last.total) },
            { label: `vs ${prev.label}`, value: hidden ? MASK : `${mom >= 0 ? '+' : ''}${mom}%` },
            { label: 'Sessions delivered', value: hidden ? MASK : String(last.sessionsDelivered) },
            { label: 'New clients', value: hidden ? MASK : String(last.newClients) },
            { label: 'Avg / session', value: money(avgPerSession) },
          ].map((s) => (
            <div key={s.label} className="border border-neutral-300 p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500">{s.label}</p>
              <p className="tnum mt-1 text-[16px] font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue table */}
        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-[0.14em]">Revenue by month</h2>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Month</th>
              <th className={`${th} text-right`}>PT</th>
              <th className={`${th} text-right`}>Memberships</th>
              <th className={`${th} text-right`}>Classes</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>MoM</th>
              <th className={`${th} text-right`}>Sessions</th>
              <th className={`${th} text-right`}>New clients</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td className={`${td} font-semibold`}>{r.label}</td>
                <td className={tdR}>{money(r.pt)}</td>
                <td className={tdR}>{money(r.memberships)}</td>
                <td className={tdR}>{money(r.classes)}</td>
                <td className={`${tdR} font-bold`}>{money(r.total)}</td>
                <td className={tdR}>{r.mom === null ? '—' : `${r.mom >= 0 ? '+' : ''}${r.mom}%`}</td>
                <td className={tdR}>{hidden ? MASK : r.sessionsDelivered}</td>
                <td className={`${tdR} pr-0`}>{hidden ? MASK : r.newClients}</td>
              </tr>
            ))}
            <tr>
              <td className={`${td} font-bold uppercase tracking-wide`}>Trailing 12 mo</td>
              <td className={`${tdR} font-bold`}>{money(totals.pt)}</td>
              <td className={`${tdR} font-bold`}>{money(totals.memberships)}</td>
              <td className={`${tdR} font-bold`}>{money(totals.classes)}</td>
              <td className={`${tdR} font-bold`}>{money(totals.total)}</td>
              <td className={tdR}>—</td>
              <td className={`${tdR} font-bold`}>{hidden ? MASK : totals.sessions}</td>
              <td className={`${tdR} pr-0 font-bold`}>{hidden ? MASK : totals.newClients}</td>
            </tr>
          </tbody>
        </table>

        {/* Stream breakdown for the reporting month */}
        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-[0.14em]">
          Stream breakdown — {last.label}
        </h2>
        <div className="mt-3 space-y-2.5">
          {STREAMS.map((s) => {
            const v = last[s.key]
            const share = Math.round((v / last.total) * 100)
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-28 text-[12px] text-neutral-600">{s.label}</span>
                <div className="h-2.5 flex-1 border border-neutral-300">
                  <div className={`h-full ${s.printCls}`} style={{ width: `${share}%` }} />
                </div>
                <span className="tnum w-24 text-right text-[12px] font-semibold">{money(v)}</span>
                <span className="tnum w-12 text-right text-[11px] text-neutral-500">{hidden ? MASK : `${share}%`}</span>
              </div>
            )
          })}
        </div>

        {/* Staff performance */}
        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-[0.14em]">
          Staff performance — {last.label}
        </h2>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Coach</th>
              <th className={`${th} text-right`}>Sessions</th>
              <th className={`${th} text-right`}>Revenue</th>
              <th className={`${th} text-right`}>Share</th>
              <th className={`${th} text-right`}>Utilisation</th>
              <th className={`${th} text-right`}>Clients</th>
              <th className={`${th} text-right`}>Adherence</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((r, i) => (
              <tr key={r.coach.id}>
                <td className={td}>
                  <span className="font-semibold">{r.coach.name}</span>
                  <span className="ml-2 text-[11px] text-neutral-500">
                    {i === 0 ? '#1 · ' : ''}
                    {r.coach.role}
                  </span>
                </td>
                <td className={tdR}>{hidden ? MASK : r.sessions}</td>
                <td className={`${tdR} font-semibold`}>{money(r.revenue)}</td>
                <td className={tdR}>
                  {hidden ? MASK : `${Math.round((r.revenue / maxRevenue) * 100)}%`}
                </td>
                <td className={tdR}>{hidden ? MASK : `${r.utilisation}%`}</td>
                <td className={tdR}>{hidden ? MASK : r.clients}</td>
                <td className={`${tdR} pr-0`}>{hidden ? MASK : `${r.adherence}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footnotes */}
        <div className="mt-8 border-t border-neutral-300 pt-4 text-[10px] leading-relaxed text-neutral-500">
          <p>
            Staff revenue attribution is a deterministic weight by seniority — real per-coach splits
            arrive with the backend. Figures derive from the studio management portal (insights
            module) and exclude pass sales settled at the front desk.
          </p>
          <p className="mt-1.5">
            The Vault Fitness · Sheung Wan, Hong Kong · Generated by the management portal
            {hidden ? ' · figures masked by privacy toggle' : ''}.
          </p>
        </div>

        {/* Screen-only actions */}
        <div className="mt-8 flex gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-neutral-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="border border-neutral-400 px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-neutral-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
