export const phoneDigits=(v:string)=>String(v||'').replace(/\D/g,'')
export const validOrders=(orders:any[])=>orders.filter(o=>!/(cancel|rejeit|estorn)/i.test(o.status||''))
export function customerMetrics(customer:any,orders:any[],days=30,vip=500,now=Date.now()) {
 const history=validOrders(orders).filter(o=>phoneDigits(o.customerPhone)===phoneDigits(customer.phone)&&phoneDigits(customer.phone))
 const total=history.reduce((n,o)=>n+Number(o.total||0),0)
 const last=history.reduce((t,o)=>Math.max(t,new Date(o.created||0).getTime()||0),0)
 const inactive=last?Math.floor((now-last)/86400000):null
 const segment=inactive!==null&&inactive>=days?'Inativo':total>=vip?'VIP':history.length>=2?'Recorrente':history.length===1?'Novo':'Sem compra'
 return {history,total,count:history.length,average:history.length?total/history.length:0,last,inactive,segment}
}
export function csvCell(value:unknown) {
 let s=String(value??'')
 if(/^[=+@\-]/.test(s))s="'"+s
 return '"'+s.replace(/"/g,'""')+'"'
}
