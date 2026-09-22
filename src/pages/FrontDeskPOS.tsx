/**
 * Point of Sale (/portal/pos) — the front-desk checkout surface. Product
 * grid grouped by category, a cart with quantities, optional customer name,
 * payment method, and a complete-sale action that logs the transaction
 * under the signed-in staff ID. The "Sales today" panel reads the same
 * shift log that feeds the My shift KPI cards.
 */
import { useMemo, useState } from 'react'
import { Check, Minus, Plus, Receipt, Trash2 } from 'lucide-react'
import {
  cartTotal,
  formatHKD,
  recordSale,
  useProducts,
} from '@/lib/pos'
import type { CartLine, PaymentMethod } from '@/lib/pos'
import { getCurrentProfile, listTodayEvents, salesToday } from '@/lib/staff'

const CATEGORIES = ['Passes', 'Memberships', 'PT packs', 'Merch'] as const

const METHODS: PaymentMethod[] = ['Cash', 'Card', 'FPS']

export default function FrontDeskPOS() {
  const profile = getCurrentProfile()
  const products = useProducts()
  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState<PaymentMethod>('Card')
  const [customer, setCustomer] = useState('')
  const [lastSale, setLastSale] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const salesTodayList = useMemo(
    () =>
      listTodayEvents(profile?.id ?? '')
        .filter((e) => e.type === 'sale')
        .slice(-20)
        .reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )

  const todaysTotal = useMemo(
    () => salesToday(profile?.id ?? ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )

  if (!profile) return null

  const addToCart = (id: string) => {
    setLastSale(null)
    setCart((cur) => {
      const line = cur.find((l) => l.product.id === id)
      if (line) return cur.map((l) => (l.product.id === id ? { ...l, qty: l.qty + 1 } : l))
      const product = products.find((p) => p.id === id)
      return product ? [...cur, { product, qty: 1 }] : cur
    })
  }

  const changeQty = (id: string, delta: number) =>
    setCart((cur) =>
      cur
        .map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )

  const completeSale = () => {
    if (cart.length === 0) return
    const { total } = recordSale(profile.id, cart, method, customer)
    setLastSale(`${formatHKD(total)} · ${method}${customer.trim() ? ` · ${customer.trim()}` : ''}`)
    setCart([])
    setCustomer('')
    setTick((t) => t + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Front desk · Point of sale</p>
        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Point of sale</h2>
        <p className="mt-1 text-[13px] text-vault-muted">
          Sales are logged under <b className="text-white">{profile.staffNo}</b> and feed the My shift
          KPIs in real time.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Product grid */}
          {CATEGORIES.map((cat) => (
            <section key={cat} className="app-card p-5" aria-label={cat}>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-vault-muted">{cat}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p.id)}
                    className="group flex items-center justify-between gap-2 border border-vault-border bg-vault-bg px-3 py-3 text-left transition-colors hover:border-gold/60"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-white">{p.label}</span>
                      <span className="tnum block text-[11px] text-vault-faint">
                        {p.price === 0 ? 'Free' : formatHKD(p.price)}
                        {p.stock ? ' · stock' : ''}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-vault-faint transition-colors group-hover:text-gold" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cart rail */}
        <div className="space-y-6">
          <section className="app-card p-5" aria-label="Cart">
            <h3 className="mb-3 flex items-baseline justify-between text-[15px] font-bold">
              Cart <span className="tnum text-[11px] font-normal text-vault-faint">{cart.length} line{cart.length === 1 ? '' : 's'}</span>
            </h3>
            <ul>
              {cart.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 border-b border-vault-border/60 py-2.5 text-[13px] last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white/90">{l.product.label}</span>
                    <span className="tnum text-[11px] text-vault-faint">{formatHKD(l.product.price)}</span>
                  </span>
                  <button type="button" onClick={() => changeQty(l.product.id, -1)} aria-label={`Remove one ${l.product.label}`} className="border border-vault-border p-1 text-vault-muted hover:text-white">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="tnum w-6 text-center text-[13px]">{l.qty}</span>
                  <button type="button" onClick={() => changeQty(l.product.id, 1)} aria-label={`Add one ${l.product.label}`} className="border border-vault-border p-1 text-vault-muted hover:text-white">
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="tnum w-16 text-right text-vault-muted">{formatHKD(l.product.price * l.qty)}</span>
                  <button type="button" onClick={() => changeQty(l.product.id, -l.qty)} aria-label={`Remove ${l.product.label}`} className="p-1 text-vault-faint hover:text-[#e06565]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {cart.length === 0 && (
                <li className="py-6 text-center text-[13px] text-vault-faint">Cart is empty — tap a product to add it.</li>
              )}
            </ul>
            <div className="mt-3 space-y-3 border-t border-vault-border pt-3">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Customer (optional)</span>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Walk-in or member name"
                  className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
                />
              </label>
              <div>
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Payment</span>
                <div className="flex gap-1">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      aria-pressed={method === m}
                      className={`flex-1 border px-2 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                        method === m
                          ? 'border-white bg-white font-semibold text-black'
                          : 'border-vault-border text-vault-muted hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-vault-muted">Total</span>
                <span className="tnum font-bold text-white">{formatHKD(cartTotal(cart))}</span>
              </div>
              <button
                type="button"
                onClick={completeSale}
                disabled={cart.length === 0}
                className="flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-gold-2 disabled:opacity-40"
              >
                <Receipt className="h-4 w-4" /> Complete sale
              </button>
              {lastSale && (
                <p className="flex items-center gap-1.5 text-[12px] text-[#7ec98f]">
                  <Check className="h-3.5 w-3.5" /> Sale logged — {lastSale} · tagged {profile.staffNo}
                </p>
              )}
            </div>
          </section>

          {/* Sales today */}
          <section className="app-card p-5" aria-label="Sales today">
            <h3 className="mb-3 flex items-baseline justify-between text-[15px] font-bold">
              Sales today <span className="tnum text-[11px] font-normal text-gold">{formatHKD(todaysTotal)}</span>
            </h3>
            <ul>
              {salesTodayList.map((e) => (
                <li key={e.id} className="border-b border-vault-border/60 py-2.5 text-[12px] last:border-0">
                  <span className="tnum text-vault-faint">
                    {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="mt-0.5 truncate text-white/90">{e.label}</p>
                </li>
              ))}
              {salesTodayList.length === 0 && (
                <li className="py-6 text-center text-[13px] text-vault-faint">No sales logged yet today.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
