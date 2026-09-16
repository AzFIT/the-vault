import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { buildInsights } from './analyticsData'

export default function InsightStrip() {
  const insights = useMemo(() => buildInsights(), [])
  return (
    <div className="grid gap-6 border-t border-vault-border pt-8 md:grid-cols-3">
      {insights.map((text, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: i * 0.15, duration: 0.5, ease: 'easeOut' }}
          className="flex gap-3"
        >
          <span className="mt-[7px] h-2 w-2 shrink-0 rotate-45 bg-white" aria-hidden />
          <p className="text-[15px] leading-relaxed text-white">{text}</p>
        </motion.div>
      ))}
    </div>
  )
}
