type Product = { name: string; category: string; code?: string }
export function productCaption(item: Product) {
  if (item.category === 'Bebidas') {
    if (/água|agua/i.test(item.name)) return 'Água mineral em garrafa de 500 ml para acompanhar seu pedido.'
    if (/suco/i.test(item.name)) return 'Suco natural: maracujá, goiaba, guaraná com açaí, abacaxi, caju, laranja com acerola e laranja. Cada sabor conta como uma unidade.'
    const size = /2l/i.test(item.name) ? '2 litros' : /600/i.test(item.name) ? '600 ml' : /1l/i.test(item.name) ? '1 litro' : 'lata'
    return 'Refrigerante em ' + size + '. Escolha o sabor ao pedir.'
  }
  if (item.category === 'Combos') return item.name.split('—')[1]?.trim() || item.name
  if (item.category === 'Hot-Dog') return 'Cachorro-quente montado na hora com os ingredientes da receita.'
  return 'Lanche preparado na chapa com os ingredientes da receita.'
}
export function preparationLabel(item: Product) {
  if (['Carnes','Carne','Frango','Gourmet','Especial'].includes(item.category)) return 'Feito na chapa'
  if (item.category === 'Bebidas') return /água|agua/i.test(item.name) ? 'Para acompanhar' : 'Escolha sua bebida'
  if (item.category === 'Combos') return 'Lanche + batata + refrigerante'
  if (item.category === 'Hot-Dog') return 'Montado na hora'
  return 'Confira os ingredientes'
}
export function menuOrder<T extends { code?: string; name: string }>(items: T[]): T[] {
  return [...items].sort((a,b) => Number(b.code === 'e-especialgourmet') - Number(a.code === 'e-especialgourmet') || a.name.localeCompare(b.name, 'pt-BR'))
}
export const sodaImages = {
  can: 'https://santaluzia.vtexassets.com/arquivos/ids/997380/556297.jpg',
  liter: 'https://carrefourbrfood.vtexassets.com/arquivos/ids/18900734/coca-cola-1-litro-1.jpg',
  small: 'https://static.paodeacucar.com/img/uploads/1/875/33024875.png',
  large: 'https://assets.ibecom.com.br/ib.item.image.large/l-6914a2bb4f5945e096287835120c831e.png',
}

// Shared visual fallback: cards and the ordering sheet display the same product image.
export const productFallbackImage = (item: Product) => {
    const nameLower = item.name.toLowerCase()
    if (nameLower.includes('dog') || item.category === 'Hot-Dog') {
      return 'https://img.usecurling.com/p/800/600?q=hot+dog+gourmet'
    }
    if (nameLower.includes('batata') || nameLower.includes('fritas')) {
      return 'https://img.usecurling.com/p/800/600?q=french+fries+cheese+bacon'
    }
    if (
      nameLower.includes('refri') ||
      nameLower.includes('suco') ||
      nameLower.includes('água') ||
      item.category === 'Bebidas'
    ) {
      return 'https://img.usecurling.com/p/800/600?q=cold+soda+can'
    }
    if (nameLower.includes('bacon')) {
      return 'https://img.usecurling.com/p/800/600?q=bacon+cheeseburger'
    }
    if (nameLower.includes('gourmet') || nameLower.includes('especial')) {
      return 'https://img.usecurling.com/p/800/600?q=gourmet+burger+bacon'
    }
    if (nameLower.includes('misto') || nameLower.includes('bauru')) {
      return 'https://img.usecurling.com/p/800/600?q=grilled+cheese+sandwich'
    }
    return 'https://img.usecurling.com/p/800/600?q=cheeseburger+melted+cheese'
  }
