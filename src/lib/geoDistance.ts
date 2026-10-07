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

  // Regiões desenhadas são persistidas no campo description como JSON para manter
  // compatibilidade com a coleção atual, sem exigir migração imediata do PocketBase.
  const parsed = feesList.map((f) => {
    if (f.polygon?.length) return f
    try {
      const meta = f.description ? JSON.parse(f.description) : null
      return meta?.polygon ? { ...f, polygon: meta.polygon as [number, number][] } : f
    } catch { return f }
  })
  const inside = parsed.find((f) => {
    const poly = f.polygon
    if (!poly || poly.length < 3) return false
    let hit = false
    for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const yi=poly[i][0], xi=poly[i][1], yj=poly[j][0], xj=poly[j][1]
      const cross=((yi>lat)!==(yj>lat)) && (lng < (xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi)
      if(cross) hit=!hit
    }
    return hit
  })
  if (inside) return { fee: inside.fee, nearestName: inside.name, distanceKm: 0 }

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
  if (minDistance > 3) {
    const extraKm = minDistance - 3
    calculatedFee = Math.round((nearest.fee + extraKm * 1.5) * 2) / 2
  }

  return {
    fee: calculatedFee,
    nearestName: nearest.name,
    distanceKm: Math.round(minDistance * 10) / 10,
  }
}
