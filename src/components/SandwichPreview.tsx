import type { CSSProperties } from 'react'
import type { SandwichLayer } from '@/lib/sandwichPreview'
import { previewBreadLabel } from '@/lib/sandwichPreview'
import type { BreadChoice } from '@/lib/orderCustomization'
const appearances:Record<string,[string,string]>={
 'ing-alface':['#6b9c35','leaf'],'ing-tomate':['#c84a31','tomato'],'ing-cebola':['#c9a7bc','onion'],'ing-milho':['#e6bd3c','bits'],'ing-batata-palha':['#d9b461','bits'],
 'ing-ovo':['#f6e6b8','egg'],'ing-queijo':['#eed487','cheese'],'ing-cheddar':['#edaa27','cheese'],'ing-catupiry':['#f1e4ca','sauce'],
 'ing-bacon':['#b45c3a','bacon'],'ing-calabresa':['#a65035','meat'],'ing-apresuntado':['#cf8f85','ham'],'ing-hamburguer':['#69412b','meat'],
 'ing-carne-gourmet':['#67402b','meat'],'ing-contrafile':['#805440','meat'],'ing-file-frango':['#c2975d','meat'],'ing-frango-desfiado':['#d0ae6e','bits'],
 'ing-salsicha':['#b96748','sausage'],'ing-maionese':['#eddfb7','sauce'],'ing-maionese-casa':['#e1ddb0','sauce'],'ing-molho':['#e4d6ac','sauce'],
 'ing-ketchup':['#b93b2a','sauce'],'ing-mostarda':['#d8ad28','sauce'],'ing-brocolis':['#56813a','leaf'],'ing-linguica':['#9c6341','sausage'],
}
export default function SandwichPreview({layers,bread}:{layers:SandwichLayer[];bread:BreadChoice}) {
 const pieces=(layer:SandwichLayer)=>['g','kg','ml','l'].includes(layer.unit||'')?1:Math.min(Math.ceil(layer.qty),20)
 const count=layers.reduce((s,l)=>s+pieces(l),0),gap=Math.min(8,118/Math.max(1,count))
 const description=[previewBreadLabel(bread),...layers.map(l=>`${l.qty} × ${l.name}`)].join(', ')
 return <figure className={'sandwich-preview '+(bread==='frances'?'sandwich-french':'')} role="img" aria-label={'Composição ilustrativa: '+description} style={{'--layer-gap':gap+'px','--layer-count':count} as CSSProperties}>
  <div className="sandwich-bun-top" aria-hidden="true"><i/><i/><i/><i/><i/></div>
  <div className="sandwich-layers" aria-hidden="true">{layers.flatMap(layer=>Array.from({length:pieces(layer)},(_,i)=>{const [color,kind]=appearances[layer.code]||['#b29773','bits'];return <span key={layer.code+'_'+i} data-ingredient={layer.code} className={'sandwich-layer layer-'+kind} style={{'--ingredient-color':color} as CSSProperties}/> }))}</div>
  <div className="sandwich-bun-base" aria-hidden="true"/>
  <figcaption>Seu lanche · composição</figcaption><span className="sr-only">{description}</span>
 </figure>
}
