import { Link } from 'react-router'
import { motion } from 'framer-motion'

/** Marketing 404 — Vault-styled dead end. */
export default function NotFound() {
  return (
    <section className="flex min-h-[70dvh] flex-col items-center justify-center px-6 py-24 text-center">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="eyebrow text-gold"
      >
        404
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="display-title mt-4 text-4xl font-bold leading-tight md:text-5xl"
      >
        This page is locked in the vault.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16 }}
        className="mt-4 max-w-sm text-[14px] leading-relaxed text-vault-muted"
      >
        The page you're looking for doesn't exist — but the gym floor is open.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.24 }}
      >
        <Link to="/" className="btn-gold mt-8 inline-flex">
          Back to Home <span className="btn-arrow">→</span>
        </Link>
      </motion.div>
    </section>
  )
}
