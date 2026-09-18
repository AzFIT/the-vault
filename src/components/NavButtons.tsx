/**
 * Shared topbar navigation trio — back, forward, home. Used by the client /
 * coach AppShell and both portal shells (owner + front desk).
 */
import { ArrowLeft, ArrowRight, Home } from 'lucide-react'
import { useNavigate } from 'react-router'

export default function NavButtons({ homeTo }: { homeTo: string }) {
  const navigate = useNavigate()
  const btn =
    'flex h-8 w-8 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-30 disabled:hover:border-vault-border disabled:hover:text-vault-muted'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Back" title="Back" onClick={() => navigate(-1)} className={btn}>
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Forward" title="Forward" onClick={() => navigate(1)} className={btn}>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Home" title="Home" onClick={() => navigate(homeTo)} className={btn}>
        <Home className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
