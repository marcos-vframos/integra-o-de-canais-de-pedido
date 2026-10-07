import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowUpRight } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { DEFAULT_THEME_COLORS, LandingThemeColors, useLandingContent } from '@/context/LandingContentContext'

interface SeasonalCampaign {
  id: string
  title: string
  badge?: string
  description?: string
  active?: boolean
  startDate?: string
  endDate?: string
  ctaText?: string
  ctaUrl?: string
  palette?: Partial<LandingThemeColors>
  images?: string[]
}

function isCampaignLive(c: SeasonalCampaign, now = new Date()) {
  if (!c.active) return false
  const start = c.startDate ? new Date(c.startDate) : null
  const end = c.endDate ? new Date(c.endDate) : null
  return (!start || start <= now) && (!end || end >= now)
}

export default function SeasonalCampaignOverlay() {
  const { content } = useLandingContent()
  const [campaigns, setCampaigns] = useState<SeasonalCampaign[]>([])
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  const load = async () => {
    try {
      const rows = await pb.collection('seasonal_campaigns').getFullList({ sort: '-startDate,-created' })
      setCampaigns(rows as unknown as SeasonalCampaign[])
    } catch (error) {
      console.warn('Não foi possível carregar campanhas sazonais:', error)
    }
  }

  useEffect(() => { load() }, [])
  useRealtime('seasonal_campaigns', load)

  const active = useMemo(() => campaigns.find((c) => isCampaignLive(c)) || null, [campaigns])

  useEffect(() => {
    const base = content.activeColors || DEFAULT_THEME_COLORS
    const palette = active?.palette || {}
    const colors = { ...base, ...palette }
    const root = document.documentElement
    root.style.setProperty('--landing-bg-primary', colors.bgPrimary)
    root.style.setProperty('--landing-bg-secondary', colors.bgSecondary)
    root.style.setProperty('--landing-bg-card', colors.bgCard)
    root.style.setProperty('--landing-vinho', colors.accentVinho)
    root.style.setProperty('--landing-vinho-hover', colors.accentVinhoHover)
    root.style.setProperty('--landing-silver', colors.accentSilver)

    return () => {
      root.style.setProperty('--landing-bg-primary', base.bgPrimary)
      root.style.setProperty('--landing-bg-secondary', base.bgSecondary)
      root.style.setProperty('--landing-bg-card', base.bgCard)
      root.style.setProperty('--landing-vinho', base.accentVinho)
      root.style.setProperty('--landing-vinho-hover', base.accentVinhoHover)
      root.style.setProperty('--landing-silver', base.accentSilver)
    }
  }, [active, content.activeColors])

  if (!active || dismissedId === active.id) return null

  const image = Array.isArray(active.images) ? active.images.find(Boolean) : undefined
  const cta = active.ctaUrl || '/loja'
  const internal = cta.startsWith('/')

  return (
    <div className="seasonal-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={active.title}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setDismissedId(active.id)} />
      {image && <div className="absolute inset-0 opacity-35 bg-cover bg-center" style={{ backgroundImage: `url("${image}")` }} />}
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-[var(--landing-bg-secondary)] shadow-2xl">
        <button type="button" onClick={() => setDismissedId(active.id)} className="absolute right-4 top-4 z-20 rounded-full bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Fechar campanha">
          <X className="h-5 w-5" />
        </button>
        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-12">
            {active.badge && <span className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[var(--landing-silver)]">{active.badge}</span>}
            <h2 className="font-heading text-4xl font-extrabold leading-tight text-white sm:text-5xl">{active.title}</h2>
            {active.description && <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--landing-silver)]">{active.description}</p>}
            <div className="mt-8">
              {internal ? (
                <Link to={cta} onClick={() => setDismissedId(active.id)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--landing-vinho)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--landing-vinho-hover)]">
                  {active.ctaText || 'Ver campanha'} <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : (
                <a href={cta} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[var(--landing-vinho)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--landing-vinho-hover)]">
                  {active.ctaText || 'Ver campanha'} <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div className="min-h-[280px] bg-[var(--landing-bg-card)]">
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-[var(--landing-vinho)]/50 to-[var(--landing-bg-card)]" />}
          </div>
        </div>
      </div>
    </div>
  )
}
