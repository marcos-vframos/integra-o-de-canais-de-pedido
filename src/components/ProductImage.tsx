import {useEffect,useState} from 'react'
import {useLandingContent} from '@/context/LandingContentContext'
import type { MenuItem } from '@/types/loyolas'
import { sodaImages } from '@/lib/productPresentation'
export default function ProductImage({ item, fallback, presentation = 'card' }: { item: MenuItem; fallback: string; presentation?: 'card' | 'cover' }) {
  const {content}=useLandingContent()
  const gallery=content.productMedia?.[item.id]
  const images=gallery?.images||[]
  const [index,setIndex]=useState(0)
  const [paused,setPaused]=useState(false)
  useEffect(()=>{setIndex(0)},[images.join('|')])
  useEffect(()=>{if(!gallery?.carousel||images.length<2||paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setIndex(i=>(i+1)%images.length),5000);return()=>clearInterval(timer)},[gallery?.carousel,images.length,paused])
  if(images.length) return <div className="relative h-full w-full" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} aria-label={'Imagens de '+item.name}>
    <img src={images[gallery?.carousel?index%images.length:0]} alt={item.name} className="h-full w-full bg-[#101312] object-contain" loading="lazy"/>
    {gallery?.carousel&&images.length>1&&<div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/60 p-1">{images.map((_,i)=><button key={i} type="button" aria-label={'Ver imagem '+(i+1)+' de '+item.name} aria-pressed={index===i} onClick={e=>{e.stopPropagation();setIndex(i)}} className="flex h-8 w-8 items-center justify-center"><span className={'h-2 w-2 rounded-full '+(index===i?'bg-white':'bg-zinc-500')}/></button>)}</div>}
  </div>
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
  const coverImage = presentation === 'cover' && item.code === 'c-xcontrafiletudo' ? '/images/ordering/contra-file-tudo-2099.webp' : fallback
  const beverageImage = soda ? drink : /água|agua/i.test(item.name) ? 'https://images.tcdn.com.br/img/img_prod/1170916/agua_mineral_crystal_sem_gas_500ml_57090_1_6472a1e1d42fbbaacf384b9b0e57e67f.jpg' : /suco/i.test(item.name) ? '/images/suco-tropical.jpg' : coverImage
  return <img src={item.category === 'Bebidas' ? beverageImage : coverImage} alt={item.name} className={'h-full w-full ' + (item.category === 'Bebidas' ? 'bg-white object-contain p-3' : 'object-contain object-center bg-[var(--landing-bg-card)] p-2')} loading={presentation === 'cover' ? 'eager' : 'lazy'}/>
}
