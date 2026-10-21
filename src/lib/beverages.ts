export const SODA_FLAVORS = ['Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Fanta Uva', 'Fanta Laranja', 'Guaraná Antarctica'] as const
type Product = { category?: string; name?: string; code?: string } | null | undefined
export const isBeverage = (item: Product) => (item?.category || '').trim().toLowerCase() === 'bebidas'
export const hasSodaFlavor = (item: Product) => /refri|refrigerante/i.test(item?.name || '') || /^b-refri/.test(item?.code || '')
export const validSodaFlavor = (value: string) => SODA_FLAVORS.some(flavor => flavor === value)
