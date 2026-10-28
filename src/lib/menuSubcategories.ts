import type { MenuItem } from '@/types/loyolas'

const groups: Record<string, readonly string[]> = {
  carnes: ['Tradicionais', 'Max', 'Contra-Filé'],
  frango: ['Filé', 'Carijó'],
}
const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function menuSubcategories(category: string): readonly string[] {
  return groups[normalize(category)] || []
}
export function currentMenuSubcategory(category: string, selected: string): string {
  const options = menuSubcategories(category)
  return options.includes(selected) ? selected : options[0] || ''
}
/** Presentation only: the canonical product, recipe and parent category stay unchanged. */
export function menuSubcategory(item: Pick<MenuItem, 'name' | 'category' | 'code'>): string {
  const category = normalize(item.category || '')
  const name = normalize(item.name || '')
  const code = normalize(item.code || '')
  if (category === 'carnes') {
    if (/contra[\s-]*file/.test(name) || code.includes('contrafile')) return 'Contra-Filé'
    if (/\bmax\b/.test(name) || /^c-(x)?max/.test(code)) return 'Max'
    return 'Tradicionais'
  }
  if (category === 'frango') return name.includes('carijo') || code.includes('carijo') ? 'Carijó' : 'Filé'
  return ''
}
export function matchesMenuSubcategory(item: Pick<MenuItem, 'name' | 'category' | 'code'>, selected: string): boolean {
  return !selected || menuSubcategory(item) === selected
}
