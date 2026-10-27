import { UtensilsCrossed } from 'lucide-react'
import { sodaImages } from '@/lib/productPresentation'

const cells: Record<string, number> = {
  'ing-maionese': 0, 'ing-maionese-casa': 0, 'ing-molho': 0,
  'ing-ketchup': 1, 'ing-mostarda': 2, 'ing-batata-palha': 3, 'ing-alface': 4,
  'ing-cebola': 5, 'ing-tomate': 6, 'ing-milho': 7, 'ing-apresuntado': 8,
  'ing-queijo': 9, 'ing-ovo': 10, 'ing-bacon': 11, 'ing-hamburguer': 12,
  'ing-carne-max': 12, 'ing-carne-gourmet': 13, 'ing-contrafile': 14,
  'ing-file-frango': 15, 'ing-frango-desfiado': 16, 'ing-catupiry': 17,
  'ing-cheddar': 18, 'ing-calabresa': 19,
}
const otherCells: Record<string,number> = {'ing-salsicha':0,'ing-brocolis':1,'ing-batata-300':2,'ing-pure':3,'ing-vinagrete':4,'ing-linguica':5}

export function IngredientImage({ code, name }: { code: string; name: string }) {
  const cell = cells[code]
  const other = otherCells[code]
  if (other !== undefined) return <span role="img" aria-label={'Imagem ilustrativa de '+name} className="ingredient-image" style={{backgroundImage:'url(/images/ingredients-extra-atlas.webp)',backgroundSize:'200% 300%',backgroundPosition:`${other%2*100}% ${Math.floor(other/2)*50}%`}} />
  if (/^ing-(refri|agua|suco)/.test(code)) {
    const image = code.includes('suco') ? '/images/suco-tropical.jpg' : code.includes('agua') ? 'https://images.tcdn.com.br/img/img_prod/1170916/agua_mineral_crystal_sem_gas_500ml_57090_1_6472a1e1d42fbbaacf384b9b0e57e67f.jpg' : code.includes('2l') ? sodaImages.large : code.includes('1l') ? sodaImages.liter : code.includes('600') ? sodaImages.small : sodaImages.can
    return <img className="ingredient-image object-contain" src={image} alt={'Imagem ilustrativa de '+name} loading="lazy" />
  }
  if (cell === undefined) return <span className="ingredient-image" aria-hidden="true"><UtensilsCrossed size={22} /></span>
  return <span role="img" aria-label={'Imagem ilustrativa de ' + name} className="ingredient-image" style={{
    backgroundImage: 'url(/images/ingredients-atlas.webp)',
    backgroundSize: '500% 500%',
    backgroundPosition: `${(cell % 5) * 25}% ${[16, 40, 64, 88][Math.floor(cell / 5)]}%`,
  }} />
}
