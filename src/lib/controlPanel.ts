import type { OrderRecord } from '@/types/loyolas'
export type ControlKind = 'expense'|'payable'|'receivable'|'opening'|'reconciliation'|'lead'|'interaction'|'quality'|'goal'|'alert'|'cost'|'loss'
export type ControlRecord = {id:string;kind:ControlKind;data:Record<string,any>;revision:number;created?:string;updated?:string}
export const controlKinds:ControlKind[]=['expense','payable','receivable','opening','reconciliation','lead','interaction','quality','goal','alert','cost','loss']
export function validSale(order:OrderRecord){return !/cancelad|recusad|rejeitad/i.test(order.status||'')}
export function controlSummary(orders:OrderRecord[],records:ControlRecord[],today:string){
 const sales=orders.filter(validSale),live=records.filter(r=>r.data.status!=='void')
 const amount=(kind:ControlKind,settled=false)=>live.filter(r=>r.kind===kind&&(!settled||r.data.status==='settled')).reduce((s,r)=>s+Number(r.data.amount||0),0)
 const revenue=sales.reduce((s,o)=>s+Number(o.total||0),0)
 const cash=amount('opening')+amount('receivable',true)-amount('expense',true)-amount('payable',true)
 const forecast=(days:number)=>{const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+days);const until=end.toISOString().slice(0,10);return cash+live.filter(r=>['payable','receivable'].includes(r.kind)&&r.data.status==='open'&&r.data.date<=until).reduce((s,r)=>s+(r.kind==='receivable'?1:-1)*Number(r.data.amount||0),0)}
 const expenses=amount('expense',true),units=sales.reduce((s,o)=>s+o.items.reduce((n,i)=>n+Number(i.qty||0),0),0)
 return {revenue,cash,expenses,forecast,orders:sales.length,units,cashConfigured:live.some(r=>r.kind==='opening')}
}
export function validateControlDraft(kind:ControlKind,data:Record<string,any>){
 if(!controlKinds.includes(kind))throw Error('Tipo de registro inválido.')
 if(typeof data.name!=='string'||data.name.trim().length<2||data.name.length>160)throw Error('Informe uma descrição de 2 a 160 caracteres.')
 if(['expense','payable','receivable','opening','cost','loss'].includes(kind)){
  if(data.amount==null||data.amount===''||!Number.isFinite(Number(data.amount))||Number(data.amount)<0||Number(data.amount)>9999999999.99||Math.abs(Number(data.amount)*100-Math.round(Number(data.amount)*100))>.0001)throw Error('Informe um valor válido com até duas casas decimais.')
 }
 if(['expense','payable','receivable','opening'].includes(kind)&&!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date||'')))throw Error('Informe a data do registro.')
 return {...data,name:data.name.trim()}
}
export function productContributions(orders:OrderRecord[],costs:ControlRecord[]){
 const map=new Map<string,{id:string;name:string;qty:number;revenue:number;cost:number|null}>()
 for(const o of orders.filter(validSale)){const gross=o.items.reduce((s,i)=>s+Number(i.qty)*Number(i.price),0),discount=Math.min(gross,Math.max(0,Number(o.discount||0)));for(const item of o.items){const id=item.itemId||item.name;const old=map.get(id)||{id,name:item.name,qty:0,revenue:0,cost:null};old.qty+=Number(item.qty);old.revenue+=Number(item.qty)*Number(item.price)*(gross?1-discount/gross:1);map.set(id,old)}}
 return [...map.values()].map(p=>{const cost=costs.find(r=>r.kind==='cost'&&r.data.productId===p.id&&r.data.status!=='void');return {...p,cost:cost?Number(cost.data.amount):null,contribution:cost?p.revenue-p.qty*Number(cost.data.amount):null}})
}
export const controlToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
