import type { MenuItem } from '@/types/loyolas'
import { sodaImages } from '@/lib/productPresentation'
export default function ProductImage({ item, fallback }: { item: MenuItem; fallback: string }) {
  const combo = item.category === 'Combos'
  const soda = /refri/i.test(item.name) && item.category === 'Bebidas'
  const drink = /2l/i.test(item.name) ? sodaImages.large : /600/i.test(item.name) ? sodaImages.small : /1l/i.test(item.name) ? sodaImages.liter : sodaImages.can
  if (combo) {
    const pair = /2 X-|casal/i.test(item.name)
    const sandwich = /bacon/i.test(item.name) ? 'https://img.usecurling.com/p/500/400?q=bacon+cheeseburger' : 'https://img.usecurling.com/p/500/400?q=cheeseburger'
    return <div className="relative grid h-full w-full grid-cols-3 gap-1 bg-[#132419] p-2" aria-label={item.name}>
      <div className="flex min-w-0 flex-col justify-center gap-1">{Array.from({length:pair?2:1},(_,i)=><img key={i} src={sandwich} alt={pair?'Um dos dois lanches do combo':'Lanche do combo'} className="min-h-0 w-full flex-1 rounded object-cover" loading="lazy"/>)}</div>
      <img src="https://img.usecurling.com/p/500/400?q=plain+french+fries" alt="Porção de batata frita" className="h-full min-h-0 w-full rounded object-cover" loading="lazy"/>
      <img src={/1L/i.test(item.name)?sodaImages.liter:/200ml/i.test(item.name)?'https://static.paodeacucar.com/img/uploads/1/482/33035482.png':sodaImages.can} alt="Refrigerante do combo, marca ilustrativa" className="h-full min-h-0 w-full rounded bg-white object-contain" loading="lazy"/>
      <span className="absolute bottom-1 right-2 rounded bg-black/75 px-2 text-[9px] text-white">Composição ilustrativa • confira volumes no título</span>
    </div>
  }
  const beverageImage = soda ? drink : /água|agua/i.test(item.name) ? 'https://images.tcdn.com.br/img/img_prod/1170916/agua_mineral_crystal_sem_gas_500ml_57090_1_6472a1e1d42fbbaacf384b9b0e57e67f.jpg' : /suco/i.test(item.name) ? '/images/suco-tropical.jpg' : fallback
  return <img src={item.category === 'Bebidas' ? beverageImage : fallback} alt={item.name} className={'h-full w-full ' + (item.category === 'Bebidas' ? 'bg-white object-contain p-3' : 'object-cover object-center')} loading="lazy"/>
}
