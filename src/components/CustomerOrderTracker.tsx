import {useEffect,useState} from 'react'
import {customerPortalRequest,readTrackedOrders,ORDER_STAGES,customerOrderStatus} from '@/lib/customerPortal'
export function OrderProgress({status}:{status:string}){
 const normalized=customerOrderStatus({status}),index=['concluído','concluido','entregue','finalizado'].includes(normalized)?3:ORDER_STAGES.indexOf(normalized as typeof ORDER_STAGES[number])
 return <div aria-label={'Status do pedido: '+normalized}><strong className="text-sm capitalize">{normalized}</strong><ol className="mt-2 grid grid-cols-4 gap-1 text-[10px]">{ORDER_STAGES.map((s,i)=><li key={s} aria-current={i===index?'step':undefined} className={'border-t-2 pt-1 capitalize '+(i<=index?'border-[var(--red)] text-white':'border-zinc-700 text-zinc-500')}>{s}</li>)}</ol></div>
}
export default function CustomerOrderTracker(){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState('')
 useEffect(()=>{let alive=true,busy=false
 const load=async()=>{if(busy||document.hidden)return;busy=true;try{const results=await Promise.allSettled(readTrackedOrders().map(r=>customerPortalRequest('track',{orderId:r.id,key:r.key})));if(alive){const values=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);const failed=results.some(r=>r.status==='rejected');setRows(previous=>failed?[...values,...previous.filter(o=>!values.some((v:any)=>v.id===o.id))]:values);setError(failed?'Atualização indisponível para alguns pedidos. Tentando novamente…':'')}}catch{if(alive)setError('Atualização indisponível. Tentando novamente…')}finally{busy=false}}
 void load();const timer=setInterval(()=>void load(),3000);window.addEventListener('focus',load);window.addEventListener('loyolas:tracked-order',load);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('loyolas:tracked-order',load)}},[])
 if(!rows.length)return null
 return <section className="space-y-3 rounded-xl border border-zinc-700 p-3"><h3 className="text-sm font-bold">Acompanhe seus pedidos</h3>{rows.map(o=><article key={o.id} className="rounded-lg bg-black/20 p-3"><p className="mb-2 text-xs">Pedido #{o.ticketNumber}</p><OrderProgress status={o.status}/></article>)}<p role="status" className="text-[11px] text-zinc-400">{error||'Atualização automática a cada 3 segundos, independente do WhatsApp.'}</p></section>
}
