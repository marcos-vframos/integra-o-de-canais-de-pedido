import type { CSSProperties } from 'react'
import type { SandwichLayer } from '@/lib/sandwichPreview'
import { previewBreadLabel } from '@/lib/sandwichPreview'
import type { BreadChoice } from '@/lib/orderCustomization'
import { FoodLayerImage, hasFoodLayerImage } from './FoodLayerImage'
import { IngredientImage } from './IngredientImage'

const portionUnits = new Set(['g', 'kg', 'ml', 'l', 'porção', 'porcao'])
const label = (layer: SandwichLayer) => `${layer.qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${layer.unit && layer.unit !== 'un' ? ' ' + layer.unit : ' ×'} ${layer.name}`
const shortNames: Record<string, string> = { 'ing-apresuntado': 'Presunto', 'ing-queijo': 'Mussarela', 'ing-batata-palha': 'Batata palha', 'ing-contrafile': 'Contra-filé', 'ing-maionese-casa': 'Maionese', 'ing-frango-desfiado': 'Frango desfiado', 'ing-carne-gourmet': 'Carne gourmet' }

/** Photographic layers follow the actual recipe, removals, extras and courtesy. */
export default function SandwichPreview({ layers, bread }: { layers: SandwichLayer[]; bread: BreadChoice }) {
  const description = [previewBreadLabel(bread), ...layers.map(label)].join(', ')
  return <figure className="sandwich-preview sandwich-preview-photo" role="img" aria-label={'Sua montagem, composição ilustrativa: ' + description}>
    <figcaption>Sua montagem</figcaption>
    <div className="sandwich-photo-stack" aria-hidden="true" style={{ '--photo-layer-count': layers.length } as CSSProperties}>
      <div className="sandwich-photo-bread sandwich-photo-top"><FoodLayerImage code={bread === 'frances' ? 'ing-pao-frances' : 'ing-pao'} name={previewBreadLabel(bread)} /></div>
      {layers.map(layer => {
        const sauce = /maionese|ketchup|mostarda|molho|catupiry|cheddar/.test(layer.code)
        const copies = !portionUnits.has(layer.unit || '') && !sauce ? Math.min(3, Math.max(1, Math.ceil(layer.qty))) : 1
        return <div key={layer.code} data-ingredient={layer.code} title={label(layer)} className={'sandwich-photo-layer' + (sauce ? ' sandwich-photo-sauce' : '')} style={{ '--photo-copies': copies } as CSSProperties}>
          {Array.from({ length: copies }, (_, i) => <div className="sandwich-photo-piece" key={i} style={{ '--photo-copy': i } as CSSProperties}>
            {hasFoodLayerImage(layer.code) ? <FoodLayerImage code={layer.code} name={layer.name} /> : layer.code === 'ing-ketchup' || layer.code === 'ing-mostarda' ? <span className={'sandwich-photo-condiment ' + layer.code} /> : <IngredientImage code={layer.code} name={layer.name} />}
          </div>)}
          {layer.qty > 1 && !portionUnits.has(layer.unit || '') ? <span className="sandwich-photo-count">×{layer.qty}</span> : null}
          <span className="sandwich-photo-name">{shortNames[layer.code] || layer.name}</span>
        </div>
      })}
      <div className="sandwich-photo-bread sandwich-photo-bottom"><FoodLayerImage code={bread === 'frances' ? 'bread-french-base' : 'bread-base'} name="Base do pão" /></div>
    </div>
  </figure>
}
