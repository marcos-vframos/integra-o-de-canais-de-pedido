import { pointInPolygon, zoneMeta } from './deliveryAreas'
/**
 * Cálculo de distância em quilômetros via fórmula de Haversine
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface DeliveryFeeItem {
  id: string
  name: string
  fee: number
  lat?: number
  lng?: number
  description?: string
  polygon?: [number, number][]
}

/**
 * Encontra a taxa por proximidade ou calcula interpolação
 */
export function resolveDeliveryFee(
  lat: number,
  lng: number,
  feesList: DeliveryFeeItem[],
): { fee: number; nearestName: string; distanceKm: number } {
  if (!feesList || feesList.length === 0) {
    return { fee: 5, nearestName: 'Taxa Padrão', distanceKm: 0 }
  }

  const parsed=feesList.map(f=>({...f,meta:zoneMeta(f.description)}))
  // Prioriza limites de bairro; áreas sem esses limites usam o ponto mais próximo dentro da área.
  const exact=parsed.filter(f=>pointInPolygon([lat,lng],f.polygon||f.meta.polygon||[]))
  const covered=exact.length?exact:parsed.filter(f=>pointInPolygon([lat,lng],f.meta.zonePolygon||[]))
  if(covered.length){
    const nearest=covered.reduce((a,b)=>calculateDistanceKm(lat,lng,b.lat??lat,b.lng??lng)<calculateDistanceKm(lat,lng,a.lat??lat,a.lng??lng)?b:a)
    return {fee:Number(nearest.fee),nearestName:nearest.name,distanceKm:0}
  }

  const withCoords = parsed.filter(
    (f) => typeof f.lat === 'number' && typeof f.lng === 'number' && !isNaN(f.lat) && !isNaN(f.lng),
  )

  if (withCoords.length === 0) {
    return { fee: feesList[0].fee, nearestName: feesList[0].name, distanceKm: 0 }
  }

  let nearest = withCoords[0]
  let minDistance = calculateDistanceKm(lat, lng, nearest.lat!, nearest.lng!)

  for (let i = 1; i < withCoords.length; i++) {
    const item = withCoords[i]
    const dist = calculateDistanceKm(lat, lng, item.lat!, item.lng!)
    if (dist < minDistance) {
      minDistance = dist
      nearest = item
    }
  }

  // Se estiver a menos de 3km do ponto mais próximo, aplica a taxa dele
  // Se estiver além, cobra uma taxa base com acréscimo proporcional por km excedente (R$ 1,50/km)
  let calculatedFee = nearest.fee
  if (minDistance > 3 && !nearest.meta.fixedFee) {
    const extraKm = minDistance - 3
    calculatedFee = Math.round((nearest.fee + extraKm * 1.5) * 2) / 2
  }

  return {
    fee: calculatedFee,
    nearestName: nearest.name,
    distanceKm: Math.round(minDistance * 10) / 10,
  }
}
