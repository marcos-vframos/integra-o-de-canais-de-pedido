import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'

interface Promo {
  id: string; title: string; badge?: string; description?: string; active?: boolean
  startDate?: string; endDate?: string; ctaText?: string; ctaUrl?: string; images?: string[]
  palette?: { accentVinho?: string; bgCard?: string; accentSilver?: string }
}
const live=(p:Promo)=>{const n=Date.now(),s=p.startDate?new Date(p.startDate).getTime():0,e=p.endDate?new Date(p.endDate).getTime():Infinity;return !!p.active&&n>=s&&n<=e}
export default function StorePromotionCarousel(){
 const [items,setItems]=useState<Promo[]>([]),[index,setIndex]=useState(0)
 const load=async()=>{try{setItems((await pb.collection('seasonal_campaigns').getFullList({sort:'-startDate,-created'})) as unknown as Promo[])}catch{}}
 useEffect(()=>{load()},[]); useRealtime('seasonal_campaigns',load)
 const promos=useMemo(()=>items.filter(live),[items])
 useEffect(()=>{if(promos.length<2)return;const t=setInterval(()=>setIndex(i=>(i+1)%promos.length),5000);return()=>clearInterval(t)},[promos.length])
 useEffect(()=>{if(index>=promos.length)setIndex(0)},[promos.length,index])
 if(!promos.length)return null
 const p=promos[index], media=Array.isArray(p.images)?p.images[0]:undefined
 const accent=p.palette?.accentVinho||'#E10600'
 return <section className="relative mb-4 min-h-[150px] overflow-hidden rounded-2xl border border-white/10 bg-[#121215]" aria-label="Promoções atuais">
  {media && (/^data:video|\.(mp4|webm|mov)(\?|$)/i.test(media)?<video src={media} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-40"/>:<img src={media} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40"/>)}
  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30"/>
  <div className="relative z-10 flex min-h-[150px] items-center p-5 pr-14">
   <div className="max-w-[80%]"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em]" style={{color:accent}}><Tag size={12}/>{p.badge||'Promoção atual'}</div>
   <h2 className="text-xl font-black text-white">{p.title}</h2>{p.description&&<p className="mt-1 line-clamp-2 text-xs text-zinc-300">{p.description}</p>}
   {p.ctaText&&<span className="mt-3 inline-block rounded-md px-3 py-1.5 text-[11px] font-bold text-white" style={{backgroundColor:accent}}>{p.ctaText}</span>}</div>
  </div>
  {promos.length>1&&<><button onClick={()=>setIndex(i=>(i-1+promos.length)%promos.length)} className="absolute right-9 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"><ChevronLeft size={15}/></button><button onClick={()=>setIndex(i=>(i+1)%promos.length)} className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"><ChevronRight size={15}/></button><div className="absolute bottom-2 right-3 z-20 text-[10px] text-white/70">{index+1}/{promos.length}</div></>}
 </section>
}
