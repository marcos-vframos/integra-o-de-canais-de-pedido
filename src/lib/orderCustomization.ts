import type { CartLine, InventoryItem, MenuItem } from '@/types/loyolas'

export type BreadChoice = 'hamburguer' | 'frances'
export const BREAD_HAMBURGUER = 'ing-pao'
export const BREAD_FRANCES = 'ing-pao-frances'
export const BREAD_FRANCES_SURCHARGE = 2

type AddedLine = Pick<CartLine, 'added'>
type CartLike = Pick<CartLine, 'removed' | 'added' | 'qty' | 'gourmetFreeChoice'> & { breadChoice?: BreadChoice }

const normalize = (value: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Distinguishes the bread "ing-pao" from meat "ing-hamburguer". */
export function breadKind(idOrCode: string, resolveStockItem: (id: string) => InventoryItem | undefined): BreadChoice | null {
  const stock = resolveStockItem(idOrCode)
  const code = normalize(stock?.code || idOrCode)
  const name = normalize(stock?.name || '')
  if (code === BREAD_FRANCES || name.includes('pao frances')) return 'frances'
  if (code === BREAD_HAMBURGUER || name.includes('pao de hamburguer')) return 'hamburguer'
  return null
}

export function hasBread(item: MenuItem | null | undefined, resolveStockItem: (id: string) => InventoryItem | undefined) {
  return !!item?.recipe?.some(r => !!breadKind(r.ingredientId, resolveStockItem))
}

/** Choose exactly one bread. French bread replaces the included hamburger bun for +R$ 2,00 per sandwich. */
export function breadName(choice: BreadChoice) {
  return choice === 'frances' ? 'Pão Francês' : 'Pão de Hambúrguer'
}

/** Returns the per-unit bread surcharge, only for sandwiches whose recipe includes bread. */
export function breadSurcharge(
  item: MenuItem | null | undefined,
  line: { breadChoice?: BreadChoice },
  resolveStockItem: (id: string) => InventoryItem | undefined,
): number {
  return line.breadChoice === 'frances' && hasBread(item, resolveStockItem) ? BREAD_FRANCES_SURCHARGE : 0
}

export function extraUnitPrice(
  ingredientId: string,
  resolveStockItem: (id: string) => InventoryItem | undefined,
  menu: MenuItem[],
): number {
  const stock = resolveStockItem(ingredientId)
  const code = normalize(stock?.code || ingredientId)
  const isCatupiry = code.includes('catupiry')
  const isCheddar = code.includes('cheddar')
  const match = menu.find(m => {
    if (m.category !== 'Complementos') return false
    const mCode = normalize(m.code || '')
    if (isCatupiry && (mCode === 'x-catupiry' || normalize(m.name).includes('catupiry'))) return true
    if (isCheddar && (mCode === 'x-cheddar' || normalize(m.name).includes('cheddar'))) return true
    return m.recipe?.some(r => {
      const ingredient = resolveStockItem(r.ingredientId)
      return r.ingredientId === ingredientId || r.ingredientId === code || (ingredient?.code === stock?.code && !!ingredient?.code)
    })
  })
  const fallback = isCatupiry ? 4 : isCheddar ? 3 : 3
  const price = match ? Number(match.price) : fallback
  return Number.isFinite(price) ? Math.max(0, price) : fallback
}

export function addonUnitTotal(line: AddedLine, resolveStockItem: (id: string) => InventoryItem | undefined, menu: MenuItem[]) {
  return (line.added || []).reduce((sum, added) => {
    if (breadKind(added.ingredientId, resolveStockItem)) return sum
    return sum + Math.max(0, Number(added.qty) || 0) * extraUnitPrice(added.ingredientId, resolveStockItem, menu)
  }, 0)
}

export function lineUnitTotal(item: MenuItem, line: AddedLine & { breadChoice?: BreadChoice }, resolveStockItem: (id: string) => InventoryItem | undefined, menu: MenuItem[]) {
  return Math.round((Number(item.price || 0) + addonUnitTotal(line, resolveStockItem, menu) + breadSurcharge(item, line, resolveStockItem)) * 100) / 100
}

/** Centralizes recipe substitutions, extras and gourmet courtesy stock usage. */
export function accumulateDeductions(
  deductions: Record<string, number>,
  line: CartLike,
  item: MenuItem | undefined,
  resolveStockItem: (id: string) => InventoryItem | undefined,
) {
  if (!item) return
  const quantity = Math.max(0, Number(line.qty) || 0)
  let originalBreadQty = 0
  ;(item.recipe || []).forEach(r => {
    const ingredient = resolveStockItem(r.ingredientId)
    const key = ingredient?.code || ingredient?.id || r.ingredientId
    if (breadKind(r.ingredientId, resolveStockItem)) {
      originalBreadQty += Number(r.qty) || 0
      return
    }
    if ((line.removed || []).includes(key) || (line.removed || []).includes(r.ingredientId)) return
    deductions[key] = (deductions[key] || 0) + (Number(r.qty) || 0) * quantity
  })
  if (originalBreadQty > 0) {
    const preferred = (line.breadChoice || 'hamburguer') === 'frances' ? BREAD_FRANCES : BREAD_HAMBURGUER
    const breadStock = resolveStockItem(preferred)
    const key = breadStock?.code || breadStock?.id || preferred
    deductions[key] = (deductions[key] || 0) + originalBreadQty * quantity
  }
  ;(line.added || []).forEach(a => {
    const stock = resolveStockItem(a.ingredientId)
    const key = stock?.code || stock?.id || a.ingredientId
    // Legacy bread extras should not create a second kind of bread.
    if (breadKind(a.ingredientId, resolveStockItem)) return
    deductions[key] = (deductions[key] || 0) + (Number(a.qty) || 0) * quantity
  })
  if (line.gourmetFreeChoice && line.gourmetFreeChoice !== 'none') {
    const key = line.gourmetFreeChoice === 'catupiry' ? 'ing-catupiry' : 'ing-cheddar'
    deductions[key] = (deductions[key] || 0) + quantity
  }
}
