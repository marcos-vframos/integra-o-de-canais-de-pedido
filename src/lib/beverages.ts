export const SODA_FLAVORS = ['Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Fanta Uva', 'Fanta Laranja', 'Guaraná Antarctica'] as const
type Product = { category?: string; name?: string; code?: string } | null | undefined
export const isBeverage = (item: Product) => (item?.category || '').trim().toLowerCase() === 'bebidas'
export const hasSodaFlavor = (item: Product) => /refri|refrigerante/i.test(item?.name || '') || /^b-refri/.test(item?.code || '')
export const validSodaFlavor = (value: string) => SODA_FLAVORS.some(flavor => flavor === value)

export const JUICE_FLAVORS = ['Maracujá','Goiaba','Guaraná com Açaí','Abacaxi','Caju','Laranja com Acerola','Laranja'] as const
export const hasDrinkFlavor = (item: Product) => hasSodaFlavor(item) || /suco/i.test(item?.name || '') || item?.code === 'b-suco'
export const drinkFlavors = (item: Product): readonly string[] => /suco/i.test(item?.name || '') || item?.code === 'b-suco' ? JUICE_FLAVORS : SODA_FLAVORS
export const validDrinkFlavor = (item: Product, flavor: string) => drinkFlavors(item).includes(flavor)
export function flavorLines(itemId: string, flavors: string[], qty: number) {
  return [...new Set(flavors)].map(beverageFlavor => ({ cartLineId: 'drink_'+crypto.randomUUID(), itemId, beverageFlavor, qty, removed: [], added: [] }))
}
