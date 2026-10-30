import type { CSSProperties } from 'react'

const isolated:Record<string,string>={
 'ing-pao':'bread-top-plain','bread-base':'bread-base-plain',
 'ing-frango-desfiado':'layer-frango-desfiado','ing-linguica':'layer-linguica',
 'ing-salsicha':'layer-salsicha','ing-brocolis':'layer-brocolis',
 'ing-carne-gourmet':'x-carnegourmet',
}

/** Cell order of the local photographic atlas; no external requests or image inference. */
const cells: Record<string, number> = {
  'ing-pao': 0, 'bread-base': 1, 'ing-alface': 2, 'ing-tomate': 3, 'ing-cebola': 4,
  'ing-queijo': 5, 'ing-ovo': 6, 'ing-bacon': 7, 'ing-calabresa': 8, 'ing-contrafile': 9,
  'ing-hamburguer': 10, 'ing-carne-max': 10, 'ing-carne-gourmet': 10, 'ing-file-frango': 11,
  'ing-apresuntado': 12, 'ing-milho': 13, 'ing-batata-palha': 14,
  'ing-maionese': 15, 'ing-maionese-casa': 15, 'ing-molho': 15,
  'ing-cheddar': 16, 'ing-catupiry': 17, 'ing-pao-frances': 18, 'bread-french-base': 19,
}
export const hasFoodLayerImage = (code: string) => cells[code] !== undefined || isolated[code] !== undefined

export function FoodLayerImage({ code, name, className = '' }: { code: string; name: string; className?: string }) {
  const cell = cells[code]
  if(isolated[code])return <span role="img" aria-label={'Imagem ilustrativa de '+name} className={'food-layer-image food-layer-isolated '+className} style={{backgroundImage:`url('/images/catalog/${isolated[code]}-montagem-v2-thumb.webp')`,backgroundSize:'contain',backgroundPosition:'center'}}/>
  if (cell === undefined) return null
  return <span role="img" aria-label={'Imagem ilustrativa de ' + name} className={'food-layer-image ' + className} style={{
    '--food-x': `${(cell % 5) * 25}%`, '--food-y': `${Math.floor(cell / 5) * 100 / 3}%`,
  } as CSSProperties} />
}
