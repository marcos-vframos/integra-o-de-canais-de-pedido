import type { PromotionalCampaign } from '@/lib/campaignOffer'

/** Active flag and validity window both apply, regardless of operator permissions. */
export function isCampaignLive(campaign: Pick<PromotionalCampaign, 'active' | 'startDate' | 'endDate'>, now = Date.now()): boolean {
  const start = campaign.startDate ? Date.parse(campaign.startDate) : -Infinity
  const end = campaign.endDate ? Date.parse(campaign.endDate) : Infinity
  return !!campaign.active && now >= start && now <= end
}

export function campaignDestination(value?: string): string {
  const target = (value || '').trim()
  if (target === '#fazer-pedido' || !target) return '#cardapio'
  if (target.startsWith('#') || /^\/(?!\/)/.test(target)) return target
  try {
    const url = new URL(target)
    if (url.protocol === 'https:') return url.href
  } catch { /* Invalid destinations fall back to the integrated menu. */ }
  return '#cardapio'
}

export function campaignMediaIsVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url)
}

/** Explicit selection wins only while eligible; keep the existing fallback otherwise. */
export function selectOpeningCampaign<T extends { id: string; active?: boolean; startDate?: string; endDate?: string }>(
  campaigns: T[], primaryId: string | null, now = Date.now(),
): T | null {
  const eligible = campaigns.filter(campaign => isCampaignLive(campaign, now))
  return eligible.find(campaign => campaign.id === primaryId) || eligible[0] || null
}
