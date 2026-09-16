import { MessageCircle } from 'lucide-react'

/**
 * Floating WhatsApp pill — the only non-monochrome element on the site
 * (design.md §5.6). Appears on every page, marketing and app.
 */
export default function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/85228859300"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp us"
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-black/40 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <MessageCircle className="h-4 w-4 fill-white" strokeWidth={0} />
      <span className="hidden sm:inline">WhatsApp us</span>
    </a>
  )
}
