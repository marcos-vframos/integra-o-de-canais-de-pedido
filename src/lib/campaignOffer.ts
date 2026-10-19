/** One campaign announces one canonical item. Customer selections never authorize free extras. */
export interface CampaignOffer {
  productId: string
  unitPrice?: number
  included: Array<{ ingredientId: string; qty: number }>
}
export interface PromotionalCampaign {
  id: string
  title: string
  active?: boolean
  startDate?: string
  endDate?: string
  offer?: CampaignOffer
}
export function activeOffer(campaign: PromotionalCampaign): boolean {
  const now=Date.now()
  const start=campaign.startDate ? new Date(campaign.startDate).getTime():-Infinity
  const end=campaign.endDate ? new Date(campaign.endDate).getTime():Infinity
  return !!campaign.active && now >= start && now <= end && !!campaign.offer?.productId
}
export function notifyOffer(campaign: PromotionalCampaign): void {
  if (!activeOffer(campaign)) return
  window.dispatchEvent(new CustomEvent('loyolas:select-offer', {
    detail: { campaignId: campaign.id, itemId: campaign.offer!.productId },
  }))
}
