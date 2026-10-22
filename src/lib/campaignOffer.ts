import { isCampaignLive, type CampaignSchedule } from '@/lib/campaignDisplay'
/** Eligibility, price and gifts are revalidated by the checkout against saved campaign data. */
export interface CampaignOffer {
  productId: string
  productIds?: string[]
  unitPrice?: number
  included: Array<{ ingredientId: string; qty: number }>
}
export interface PromotionalCampaign {
  id: string
  title: string
  active?: boolean
  startDate?: string
  endDate?: string
  schedule?: CampaignSchedule
  offer?: CampaignOffer
}
export function activeOffer(campaign: PromotionalCampaign): boolean {
  return isCampaignLive(campaign) && eligibleProductIds(campaign.offer).length > 0
}
export function eligibleProductIds(offer?: CampaignOffer): string[] {
  return [...new Set((Array.isArray(offer?.productIds) ? offer.productIds : [offer?.productId]).filter((id): id is string => typeof id === 'string' && !!id))]
}
export function notifyOffer(campaign: PromotionalCampaign, itemId = eligibleProductIds(campaign.offer)[0]): void {
  if (!activeOffer(campaign) || !eligibleProductIds(campaign.offer).includes(itemId)) return
  window.dispatchEvent(new CustomEvent('loyolas:select-offer', {
    detail: { campaignId: campaign.id, itemId },
  }))
}
