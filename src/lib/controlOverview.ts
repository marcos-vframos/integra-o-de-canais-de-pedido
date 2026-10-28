import {validSale, type ControlRecord} from './controlPanel.ts'
import type {OrderRecord} from '@/types/loyolas'

export function controlDay(value?:string){
 if(!value)return ''
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value
 const date=new Date(value)
 return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
export function inControlPeriod(value:string|undefined,period:string,today:string){
 const day=controlDay(value)
 return Boolean(day)&&(period==='all'||(period==='today'?day===today:day.slice(0,7)===today.slice(0,7)))
}
export const completedOrder=(order:OrderRecord)=>/conclu[ií]do|finalizado/i.test(order.status||'')
export function overviewCustomers(all:OrderRecord[],period:string,today:string){
 const byPhone=new Map<string,OrderRecord[]>()
 for(const order of all.filter(validSale)){
  const phone=(order.customerPhone||'').replace(/\D/g,'')
  if(!phone||!controlDay(order.created))continue
  const group=byPhone.get(phone)||[];group.push(order);byPhone.set(phone,group)
 }
 let first=0,repeat=0
 for(const group of byPhone.values()){
  group.sort((a,b)=>Date.parse(a.created!)-Date.parse(b.created!))
  if(!group.some(o=>inControlPeriod(o.created,period,today)))continue
  if(group.length>1&&group.slice(1).some(o=>inControlPeriod(o.created,period,today)))repeat++
  else first++
 }
 const identified=first+repeat
 return {first,repeat,identified,recurrence:identified?repeat/identified*100:null}
}
export function cashMovementSeries(records:ControlRecord[],period:string,today:string){
 const grouped=new Map<string,{date:string;incoming:number;outgoing:number}>()
 const add=(date:string)=>{if(!grouped.has(date))grouped.set(date,{date,incoming:0,outgoing:0});return grouped.get(date)!}
 if(period==='today')add(today)
 if(period==='month'){
  const [year,month]=today.split('-').map(Number)
  for(let day=1;day<=new Date(year,month,0).getDate();day++)add(`${today.slice(0,7)}-${String(day).padStart(2,'0')}`)
 }
 for(const r of records){
  if(r.data.status!=='settled'||!['receivable','expense','payable'].includes(r.kind)||!inControlPeriod(r.data.date,period,today))continue
  const amount=Number(r.data.amount)
  if(!Number.isFinite(amount)||amount<0)continue
  const date=controlDay(r.data.date),bucket=add(period==='all'?date.slice(0,7):date)
  if(r.kind==='receivable')bucket.incoming+=amount;else bucket.outgoing+=amount
 }
 return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date))
}
