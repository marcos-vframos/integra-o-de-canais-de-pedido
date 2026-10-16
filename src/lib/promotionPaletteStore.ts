import pb, { backendConfigured, backendConfigMessage } from '@/lib/pocketbase/client'
import type { LandingThemeColors } from '@/context/LandingContentContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface SavedPromotionPalette {
  id: string
  name: string
  colors: LandingThemeColors
}

const COLLECTION = 'landing_content'
const SECTION = 'promotion_palettes'

/** Both Vercel apps read the same server-side collection when configured with the same PocketBase endpoint. */
export async function loadPromotionPalettes(): Promise<SavedPromotionPalette[]> {
  if (!backendConfigured) return []
  const record = await pb.collection(COLLECTION).getFirstListItem(`section="${SECTION}"`).catch((e: unknown) => {
    if (typeof e === 'object' && e !== null && 'status' in e && e.status === 404) return null
    throw e
  })
  if (!record) return []
  const data = record.data as { presets?: SavedPromotionPalette[] } | undefined
  return Array.isArray(data?.presets) ? data.presets.filter(p => !!p?.id && !!p?.colors) : []
}

export async function savePromotionPalette(
  palette: SavedPromotionPalette,
): Promise<SavedPromotionPalette[]> {
  if (!backendConfigured) throw new Error('Banco ainda não configurado: ' + backendConfigMessage)
  if (!pb.authStore.isValid) throw new Error('Para salvar paletas compartilhadas, autentique um operador após conectar o PocketBase.')
  const previous = await loadPromotionPalettes()
  const updated = [...previous.filter(p => p.id !== palette.id && p.name.toLowerCase() !== palette.name.toLowerCase()), palette]
  try {
    const record = await pb.collection(COLLECTION).getFirstListItem(`section="${SECTION}"`).catch((e: unknown) => {
      if (typeof e === 'object' && e !== null && 'status' in e && e.status === 404) return null
      throw e
    })
    const payload = { section: SECTION, data: { presets: updated } }
    if (record) await pb.collection(COLLECTION).update(record.id, payload)
    else await pb.collection(COLLECTION).create(payload)
    const confirmed = await loadPromotionPalettes()
    if (!confirmed.some(p => p.id === palette.id)) throw new Error('O banco não confirmou o salvamento desta paleta.')
    return confirmed
  } catch (error: unknown) {
    throw new Error('Não foi possível salvar paleta de promoção: ' + getErrorMessage(error))
  }
}
