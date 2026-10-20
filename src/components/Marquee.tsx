import { MARQUEE_ITEMS } from '@/data/loyolasData'
import { useLandingContent } from '@/context/LandingContentContext'

export default function Marquee() {
  const { content } = useLandingContent()
  const source = content.marqueeBlocks ? content.marqueeItems : content.marqueeItems?.length ? content.marqueeItems : MARQUEE_ITEMS
  const items = [...source, ...source]

  if (!source.length) return null
  return (
    <aside
      className="text-[#C4C4C4] py-3 overflow-hidden border-y border-white/[0.06] select-none relative z-20"
      aria-label="Destaques do Loyolas Lanches"
    >
      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, var(--landing-bg-secondary), transparent 20%, transparent 80%, var(--landing-bg-secondary))' }} />
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((text, idx) => (
          <div key={idx} className="flex items-center mx-6 cursor-default">
            <span className="font-heading text-xs tracking-[0.16em] uppercase text-[#E2E8F0]/90">
              {text}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#8F0F1B] ml-6 opacity-70" />
          </div>
        ))}
      </div>
    </aside>
  )
}
