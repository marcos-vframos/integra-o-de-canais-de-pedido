import type { OrderRecord } from '@/types/loyolas'
export type DeliveryPeriod = 'day' | 'week' | 'month' | 'year' | 'all'
export type CourierReference = { id: string; name: string }
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
export function businessDay(value: string | Date = new Date()): string {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  const p = Object.fromEntries(dateFormatter.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}
export const deliveryTimestamp = (order: OrderRecord) =>
  order.motoboyAssignedAt || order.created || ''
export const isDelivery = (order: OrderRecord) =>
  order.deliveryType === 'entrega' && !/(recus|cancel|rejeit|estorn)/i.test(order.status || '')
export const belongsToCourier = (order: OrderRecord, courier: CourierReference) =>
  order.motoboyId
    ? order.motoboyId === courier.id
    : !!order.motoboyName && order.motoboyName.trim() === courier.name.trim()
export function deliveryFee(order: OrderRecord): number | null {
  if (
    order.deliveryFee === null ||
    order.deliveryFee === undefined ||
    String(order.deliveryFee).trim() === ''
  )
    return null
  const n = Number(order.deliveryFee)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export function totalDeliveryFees(orders: OrderRecord[]) {
  return Math.round(orders.reduce((sum, o) => sum + (deliveryFee(o) ?? 0), 0) * 100) / 100
}
const dateShift = (key: string, days: number) => {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function periodBounds(
  period: DeliveryPeriod,
  anchor: string,
): { start: string; end: string } | null {
  if (period === 'all') return null
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor) ||
    !Number.isFinite(new Date(anchor + 'T12:00:00Z').getTime())
  )
    return null
  if (new Date(anchor + 'T12:00:00Z').toISOString().slice(0, 10) !== anchor) return null
  if (period === 'day') return { start: anchor, end: dateShift(anchor, 1) }
  if (period === 'week') {
    const day = new Date(anchor + 'T12:00:00Z').getUTCDay(),
      start = dateShift(anchor, -((day + 6) % 7))
    return { start, end: dateShift(start, 7) }
  }
  const year = Number(anchor.slice(0, 4)),
    month = Number(anchor.slice(5, 7))
  if (period === 'year') return { start: `${year}-01-01`, end: `${year + 1}-01-01` }
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
  }
}
export function filterDeliveryHistory(
  orders: OrderRecord[],
  period: DeliveryPeriod,
  anchor: string,
  courier?: CourierReference | null,
) {
  const bounds = periodBounds(period, anchor)
  return orders
    .filter((o) => {
      if (!isDelivery(o) || (courier && !belongsToCourier(o, courier))) return false
      if (period === 'all') return true
      if (!bounds) return false
      const day = businessDay(deliveryTimestamp(o))
      return !!day && day >= bounds.start && day < bounds.end
    })
    .sort(
      (a, b) =>
        (new Date(deliveryTimestamp(b)).getTime() || 0) -
          (new Date(deliveryTimestamp(a)).getTime() || 0) || a.id.localeCompare(b.id),
    )
}
export function monthlyDeliveryTotals(
  orders: OrderRecord[],
  year: number,
  courier?: CourierReference | null,
) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0'),
      anchor = `${year}-${month}-01`,
      list = filterDeliveryHistory(orders, 'month', anchor, courier)
    return { anchor, month: i + 1, count: list.length, fees: totalDeliveryFees(list) }
  })
}
