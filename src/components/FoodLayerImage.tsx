import type { CSSProperties } from 'react'

/** Cell order of the local photographic atlas; no external requests or image inference. */
const cells: Record<string, number> = {
  'ing-pao': 0, 'bread-base': 1, 'ing-alface': 2, 'ing-tomate': 3, 'ing-cebola': 4,
  'ing-queijo': 5, 'ing-ovo': 6, 'ing-bacon': 7, 'ing-calabresa': 8, 'ing-contrafile': 9,
  'ing-hamburguer': 10, 'ing-carne-max': 10, 'ing-carne-gourmet': 10, 'ing-file-frango': 11,
  'ing-apresuntado': 12, 'ing-milho': 13, 'ing-batata-palha': 14,
  'ing-maionese': 15, 'ing-maionese-casa': 15, 'ing-molho': 15,
  'ing-cheddar': 16, 'ing-catupiry': 17, 'ing-pao-frances': 18, 'bread-french-base': 19,
}
export const hasFoodLayerImage = (code: string) => cells[code] !== undefined

export function FoodLayerImage({ code, name, className = '' }: { code: string; name: string; className?: string }) {
  const cell = cells[code]
  if (cell === undefined) return null
  return <span role="img" aria-label={'Imagem ilustrativa de ' + name} className={'food-layer-image ' + className} style={{
    '--food-x': `${(cell % 5) * 25}%`, '--food-y': `${Math.floor(cell / 5) * 100 / 3}%`,
  } as CSSProperties} />
}
