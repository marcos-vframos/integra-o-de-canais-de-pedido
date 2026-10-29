import { useId } from 'react'
import type { SandwichLayer } from '@/lib/sandwichPreview'
import { previewBreadLabel } from '@/lib/sandwichPreview'
import type { BreadChoice } from '@/lib/orderCustomization'

const colors: Record<string, string> = {
  'ing-hamburguer': '#75462d', 'ing-carne-max': '#75462d', 'ing-carne-gourmet': '#65402e',
  'ing-contrafile': '#875139', 'ing-file-frango': '#d9a76a', 'ing-frango-desfiado': '#d8b06f',
  'ing-calabresa': '#ac5035', 'ing-linguica': '#a35e38', 'ing-salsicha': '#cb744e',
  'ing-queijo': '#f6d877', 'ing-cheddar': '#efac30', 'ing-apresuntado': '#d99491',
  'ing-maionese': '#f2e9c9', 'ing-maionese-casa': '#e8e3b7', 'ing-molho': '#e8dfb7',
  'ing-catupiry': '#fff0d9', 'ing-ketchup': '#c43d2c', 'ing-mostarda': '#e5b530',
}
const sauce = (code: string) => /maionese|molho|catupiry|ketchup|mostarda/.test(code)
const formatQty = (layer: SandwichLayer) => `${layer.qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${layer.unit && layer.unit !== 'un' ? ' ' + layer.unit : ' ×'}`

/** Recognizable illustrations; quantities and removals come only from the actual customization. */
function IngredientLayer({ layer }: { layer: SandwichLayer }) {
  const code = layer.code
  const color = colors[code] || '#be995e'
  if (code === 'ing-alface' || code === 'ing-brocolis') return <g>
    <path d="M13 9 24 1 41 5 55 0 72 6 88 2 106 6 125 0 144 5 160 2 181 10 172 19 154 15 138 21 118 16 99 21 79 15 61 20 43 14 25 18Z" fill="#609936" stroke="#35652b" strokeWidth="2" />
    <path d="m29 9 29 2 30-3 29 3 35-3" fill="none" stroke="#afd364" strokeWidth="2" />
  </g>
  if (code === 'ing-tomate') return <g>{[52, 104, 151].map(x => <g key={x}><ellipse cx={x} cy="9" rx="30" ry="9" fill="#cc3b28" stroke="#8f2a21" strokeWidth="2" /><ellipse cx={x} cy="7" rx="22" ry="5" fill="#ea7050" /><path d={`M${x - 14} 7h9m9 0h9`} stroke="#f5c380" strokeWidth="2" /></g>)}</g>
  if (code === 'ing-cebola') return <g fill="none" stroke="#ddb3cf" strokeWidth="3">{[55, 107, 150].map(x => <ellipse key={x} cx={x} cy="8" rx="29" ry="7" />)}<path d="M33 8q20 7 42 0m54 0q20 7 42 0" stroke="#f4deed" strokeWidth="2" /></g>
  if (code === 'ing-ovo') return <g><path d="M20 9Q21-1 48 4T94 3 133 4 179 10Q184 21 157 19T111 20 66 19 20 9" fill="#faf0d7" stroke="#d8c69b" strokeWidth="1.5" /><ellipse cx="103" cy="9" rx="25" ry="8" fill="#efb231" /><ellipse cx="97" cy="7" rx="12" ry="3" fill="#ffda66" /></g>
  if (code === 'ing-bacon') return <g>{[0, 1, 2].map(i => <g key={i} transform={`translate(${i * 47} 0)`}><path d="M22 6 38 1 53 6 73 2 81 11 62 16 48 11 31 16Z" fill="#a9442c" stroke="#713c26" /><path d="m29 7 12-2 13 5 20-4" fill="none" stroke="#eaa480" strokeWidth="3" /></g>)}</g>
  if (code === 'ing-queijo' || code === 'ing-cheddar' || code === 'ing-apresuntado') return <g><path d="m16 6 145-5 24 9-49 6-18 7-23-7-59 4Z" fill={color} stroke={code === 'ing-apresuntado' ? '#ae6d70' : '#cb952e'} strokeWidth="1.5" /><path d="m26 6 130-3" stroke="#fff1b7" strokeWidth="2" opacity=".6" /></g>
  if (code === 'ing-milho' || code === 'ing-batata-palha' || code === 'ing-frango-desfiado') return <g fill={code === 'ing-milho' ? '#f0c64a' : color} stroke="#ac7b34" strokeWidth=".8">{Array.from({ length: 17 }, (_, i) => <rect key={i} x={19 + (i * 29) % 151} y={(i % 3) * 4} width={code === 'ing-milho' ? 9 : 22} height={code === 'ing-milho' ? 6 : 3} rx="2" transform={`rotate(${i % 2 ? -10 : 12} ${25 + (i * 29) % 151} 8)`} />)}</g>
  if (sauce(code)) return <path d="M29 5q17-7 31 0t30 0 30 0 30 0 24-1" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
  if (/calabresa|salsicha|linguica/.test(code)) return <g>{[37, 69, 102, 135, 165].map(x => <g key={x}><ellipse cx={x} cy="9" rx="20" ry="8" fill={color} stroke="#713c2d" strokeWidth="2" /><path d={`m${x - 5} 5 4 3m5 1 4 3`} stroke="#ecc09a" strokeWidth="2" /></g>)}</g>
  if (!/hamburguer|carne-|contrafile|file-frango/.test(code)) return <g><ellipse cx="100" cy="10" rx="78" ry="8" fill={color} /><path d="M36 7q62-8 128 0" fill="none" stroke="#f4dab0" strokeWidth="2" opacity=".6" /></g>
  return <g>
    <path d="M17 8Q23 0 50 3L149 1Q178 1 183 10L178 19Q151 24 118 20L47 22Q19 21 17 8" fill={color} stroke="#513322" strokeWidth="2" />
    <ellipse cx="100" cy="8" rx="79" ry="7" fill="#f5ce8a" opacity=".14" />
    {[44, 71, 98, 125, 152].map(x => <path key={x} d={`m${x} 4-7 11`} stroke="#422c22" strokeWidth="3" opacity=".65" />)}
    <path d="m33 18 23 1m72-1 27 0" stroke="#e1a878" strokeWidth="1.5" opacity=".6" />
  </g>
}

export default function SandwichPreview({ layers, bread }: { layers: SandwichLayer[]; bread: BreadChoice }) {
  const id = useId().replace(/:/g, '')
  let cursor = 38
  const positioned = layers.map(layer => {
    const y = cursor
    const copies = !['g', 'kg', 'ml', 'l'].includes(layer.unit || '') && !sauce(layer.code) ? Math.min(3, Math.max(1, Math.ceil(layer.qty))) : 1
    cursor += sauce(layer.code) ? 9 : 17 + (copies - 1) * 4
    return { layer, y, copies }
  })
  const height = cursor + 24
  const description = [previewBreadLabel(bread), ...layers.map(layer => `${formatQty(layer)} ${layer.name}`)].join(', ')
  return <figure className="sandwich-preview" role="img" aria-label={'Sua montagem, composição ilustrativa: ' + description}>
    <svg viewBox={`0 0 200 ${height}`} aria-hidden="true" className="sandwich-illustration">
      <defs><linearGradient id={id + '-bread'} x2="0" y2="1"><stop stopColor="#f8d692" /><stop offset=".5" stopColor="#dca04c" /><stop offset="1" stopColor="#a9682a" /></linearGradient></defs>
      <path d={bread === 'frances' ? 'M18 25Q23 0 100 3T182 25Q166 36 100 32T18 25' : 'M20 28Q24 1 100 1T180 28Q162 37 100 33T20 28'} fill={`url(#${id}-bread)`} stroke="#ae7131" strokeWidth="1.5" />
      {bread === 'frances' ? [58, 94, 130].map(x => <path key={x} d={`m${x} 9 13 17`} stroke="#fff0c8" strokeWidth="5" strokeLinecap="round" />) : [48, 72, 101, 128, 151].map((x, i) => <ellipse key={x} cx={x} cy={13 + (i % 2) * 7} rx="4" ry="1.6" fill="#fff0c8" transform={`rotate(-22 ${x} 16)`} />)}
      {positioned.map(({ layer, y, copies }) => <g key={layer.code} data-ingredient={layer.code} transform={`translate(0 ${y})`}>
        <title>{layer.name}: {formatQty(layer)}</title>{Array.from({ length: copies }, (_, i) => <g key={i} transform={`translate(0 ${(copies - i - 1) * 4})`}><IngredientLayer layer={layer} /></g>)}
        {layer.qty > 1 && !['g', 'kg', 'ml', 'l'].includes(layer.unit || '') ? <g transform="translate(163 -1)"><rect width="34" height="14" rx="7" fill="#201b17" stroke="#e5ce9b" strokeWidth=".7" /><text x="17" y="10" textAnchor="middle" fill="#fff7e6" fontSize="10" fontWeight="700">×{layer.qty}</text></g> : null}
      </g>)}
      <path d={`M21 ${cursor + 2}Q100 ${cursor + 10} 179 ${cursor + 2}L174 ${cursor + 15}Q100 ${cursor + 25} 26 ${cursor + 15}Z`} fill={`url(#${id}-bread)`} stroke="#ae7131" strokeWidth="1.5" />
    </svg>
    <figcaption>Sua montagem</figcaption>
  </figure>
}
