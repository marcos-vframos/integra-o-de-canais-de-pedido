import pb from '@/lib/pocketbase/client'

const section = 'primary_campaign'
async function record() {
  try { return await pb.collection('landing_content').getFirstListItem(`section="${section}"`) }
  catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return null
    throw error
  }
}
export async function loadPrimaryCampaign(): Promise<string | null> {
  const row = await record()
  const data = row?.data as { campaignId?: string } | undefined
  return data?.campaignId || null
}
export async function savePrimaryCampaign(campaignId: string): Promise<void> {
  if (!pb.authStore.hasSession) throw new Error('Entre com uma conta de operador autorizada.')
  const row = await record()
  const payload = { section, data: { campaignId } }
  if (row) await pb.collection('landing_content').update(row.id, payload)
  else await pb.collection('landing_content').create(payload)
  if (await loadPrimaryCampaign() !== campaignId) throw new Error('O banco não confirmou a promoção principal.')
}
