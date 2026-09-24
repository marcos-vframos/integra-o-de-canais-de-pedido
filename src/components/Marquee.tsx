import { MARQUEE_ITEMS } from '@/data/loyolasData'

export default function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <aside
      className="bg-[#0D1A11] text-[#C4C4C4] py-3 overflow-hidden border-y border-white/[0.06] select-none relative z-20"
      aria-label="Destaques do Loyolas Lanches"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A150D] via-transparent to-[#0A150D] pointer-events-none z-10" />
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
