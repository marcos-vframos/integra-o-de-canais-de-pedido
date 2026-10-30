import type {InventoryItem,MenuItem,OrderRecord,OrderItem} from '@/types/loyolas'
import type {ControlRecord} from './controlPanel.ts'
import {validSale} from './controlPanel.ts'
import {controlDay,completedOrder} from './controlOverview.ts'
import {monthlyTotals,recipeCost,stockUnitCost,type MonthlyPlan} from './controlPricing.ts'

export type ReportFilters={period:'day'|'week'|'month'|'year';date:string;channel:string;expenseBasis:'plan'|'entries';historyMonths:number}
export type ReportData={orders:OrderRecord[];records:ControlRecord[];inventory:InventoryItem[];menu:MenuItem[]}
export type ProductReport={id:string;name:string;qty:number;revenue:number;variable:number|null;fees:number|null;expenses:number;cost:number|null;profit:number|null;estimated:boolean;manual:boolean;issues:string[]}
export type ReportTotals={orders:number;qty:number;revenue:number;delivery:number;registered:number;variable:number|null;fees:number|null;expenses:number;cost:number|null;profit:number|null;pending:number;unallocated:number;issues:string[]}
export type ReportSlice={products:ProductReport[];totals:ReportTotals}
export type SalesReport={filters:ReportFilters;start:string;end:string;generatedAt:string;products:ProductReport[];totals:ReportTotals;channels:{id:string;label:string;totals:ReportTotals}[];history:{month:string;totals:ReportTotals}[];annual:{months:number;qty:number;revenue:number;cost:number|null;profit:number|null;products:ProductReport[]}|null;notes:string[]}
const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100
const dateString=(date:Date)=>date.toISOString().slice(0,10)
const plusDays=(day:string,days:number)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return dateString(date)}
function validDay(day:string){const date=new Date(day+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(date.getTime())&&dateString(date)===day}
const endMonth=(month:string)=>{const [year,m]=month.split('-').map(Number);return dateString(new Date(Date.UTC(year,m,0,12)))}
export function reportRange(period:ReportFilters['period'],day:string,today:string){
 if(!validDay(day)||!validDay(today))throw Error('Informe uma data válida.')
 let start=day,end=day
 if(period==='week'){const weekday=new Date(day+'T12:00:00Z').getUTCDay();start=plusDays(day,-((weekday+6)%7));end=plusDays(start,6)}
 else if(period==='month'){start=day.slice(0,7)+'-01';end=endMonth(day.slice(0,7))}
 else if(period==='year'){start=day.slice(0,4)+'-01-01';end=day.slice(0,4)+'-12-31'}
 else if(period!=='day')throw Error('Período inválido.')
 if(start>today)throw Error('O período começa no futuro. Selecione uma data até hoje.')
 return {start,end:end>today?today:end}
}
export const channelId=(order:OrderRecord)=>String(order.origin||'unknown')
export const channelLabel=(id:string)=>({all:'Todos os canais',online:'Loja online',balcao:'Balcão',unknown:'Canal não informado'}[id]||id)
export const reportChannels=(orders:OrderRecord[])=>[...new Set(['online','balcao',...orders.map(channelId)])]
function safeNumber(value:unknown){const n=Number(value);return value!==null&&value!==undefined&&value!==''&&Number.isFinite(n)&&n>=0?n:null}
function planFor(records:ControlRecord[]):MonthlyPlan|null{return records.find(r=>r.kind==='cost'&&r.data.model==='pricing_v1'&&r.data.status!=='void')?.data.plan||null}
function inRange(day:string,start:string,end:string){return Boolean(day)&&day>=start&&day<=end}
function allocations(total:number,weights:number[]){
 const cents=Math.round(total*100),sum=weights.reduce((s,w)=>s+w,0)
 if(!sum)return weights.map(()=>0)
 const exact=weights.map(w=>cents*w/sum),parts=exact.map(Math.floor),remainder=cents-parts.reduce((a,b)=>a+b,0)
 const rank=exact.map((v,i)=>({i,f:v-parts[i]})).sort((a,b)=>b.f-a.f||a.i-b.i)
 for(let i=0;i<remainder;i++)parts[rank[i%rank.length].i]++
 return parts.map(v=>v/100)
}
function planExpenses(plan:MonthlyPlan,start:string,end:string){
 const monthly=monthlyTotals(plan).total;let value=0,cursor=start
 while(cursor<=end){const month=cursor.slice(0,7),last=endMonth(month),stop=last<end?last:end,days=Math.round((Date.parse(stop)-Date.parse(cursor))/86400000)+1;value+=monthly*days/Number(last.slice(-2));cursor=plusDays(stop,1)}
 return money(value)
}
function expensesFor(data:ReportData,filters:ReportFilters,start:string,end:string){
 if(filters.expenseBasis==='plan'){const plan=planFor(data.records);if(!plan)throw Error('Cadastre o plano mensal ou selecione despesas lançadas.');return planExpenses(plan,start,end)}
 return money(data.records.filter(r=>['expense','payable','loss'].includes(r.kind)&&r.data.status==='settled'&&inRange(controlDay(r.data.date||r.created),start,end)&&r.data.category!=='stock_purchase').reduce((sum,r)=>sum+(safeNumber(r.data.amount)||0),0))
}
type Line={order:OrderRecord;id:string;name:string;qty:number;revenue:number;variable:number|null;fee:number|null;estimated:boolean;manual:boolean;issues:string[]}
function productFor(item:OrderItem,menu:MenuItem[]){const exact=menu.find(p=>p.id===item.itemId||p.code===item.itemId);if(exact)return exact;const named=menu.filter(p=>p.name===item.name);return named.length===1?named[0]:undefined}
function lineCost(item:OrderItem,product:MenuItem|undefined,data:ReportData,plan:MonthlyPlan|null){
 const ids=[item.itemId,product?.id,product?.code].filter(Boolean)
 const manual=data.records.find(r=>r.kind==='cost'&&r.data.model!=='pricing_v1'&&r.data.status!=='void'&&ids.includes(r.data.productId))
 if(manual){const amount=safeNumber(manual.data.amount);if(amount===null)throw Error('Custo manual inválido.');return {value:money(amount*item.qty),manual:true,estimated:true}}
 if(!plan)throw Error('Custo não cadastrado.')
 let ingredients=0
 const deductions=item.stockDeductions
 if(deductions&&Object.keys(deductions).length){
  for(const [code,quantity] of Object.entries(deductions)){const stock=data.inventory.find(i=>i.code===code||i.id===code),qty=safeNumber(quantity);if(!stock||qty===null||!plan.costs[stock.id])throw Error('Custo do consumo não cadastrado.');ingredients+=stockUnitCost(plan.costs[stock.id])*qty}
  const breads=Object.entries(deductions).filter(([code])=>['ing-pao','ing-pao-frances'].includes(code)).reduce((s,[,q])=>s+Number(q),0)
  const pack=safeNumber(plan.pack),prep=safeNumber(plan.prep);if(pack===null||prep===null)throw Error('Embalagem ou preparo não informados.')
  return {value:money(ingredients+breads*(pack+prep)),manual:false,estimated:true}
 }
 if(!product||item.added?.length||item.removed?.length||item.gourmetFreeChoice&&item.gourmetFreeChoice!=='none'||item.breadChoice==='frances'||(item as any).promotionId)throw Error('Consumo da personalização não registrado; cadastre custo completo.')
 return {value:money(recipeCost(product,data.inventory,plan).total*item.qty),manual:false,estimated:true}
}
function linesFor(data:ReportData,orders:OrderRecord[]){
 const plan=planFor(data.records),lines:Line[]=[],issues:string[]=[]
 for(const order of orders){
  if(!order.items?.length){issues.push('Comanda sem itens: '+order.ticketNumber);continue}
  const gross=order.items.map(item=>{const qty=safeNumber(item.qty),price=safeNumber(item.price);if(qty===null||qty<=0||price===null)throw Error('Quantidade ou preço inválido na comanda '+order.ticketNumber);return money(qty*price)})
  const total=gross.reduce((a,b)=>a+b,0),discount=safeNumber(order.discount??0)
  if(discount===null||discount>total)throw Error('Desconto inválido na comanda '+order.ticketNumber)
  const discounts=allocations(discount,gross),revenues=gross.map((v,i)=>money(v-discounts[i]))
  const freight=safeNumber(order.deliveryFee??0),recorded=safeNumber(order.total)
  if(freight===null||recorded===null||Math.abs(money(total-discount+freight)-recorded)>.011)issues.push('Total divergente na comanda '+order.ticketNumber)
  const pay=String(order.payment||'');let rate:number|null=pay==='Dinheiro'?0:plan?safeNumber(pay.startsWith('Cartão')?plan.cardRate:pay==='Pix'?plan.pixRate:undefined):null
  const tax=plan?safeNumber(plan.taxRate):null
  if(rate!==null&&(rate>100||tax!==null&&rate+tax>=100))rate=null
  const totalFees=rate===null||tax===null||tax>100?null:money(revenues.reduce((a,b)=>a+b,0)*(rate+tax)/100)
  const fees=totalFees===null?revenues.map(()=>null):allocations(totalFees,revenues)
  order.items.forEach((item,i)=>{const product=productFor(item,data.menu),line:Line={order,id:product?.id||item.itemId||'name:'+item.name,name:item.name,qty:Number(item.qty),revenue:revenues[i],variable:null,fee:fees[i],estimated:true,manual:false,issues:[]};try{const cost=lineCost(item,product,data,plan);line.variable=cost.value;line.manual=cost.manual;if(cost.manual){line.fee=0;line.issues.push('Custo manual completo; taxas não somadas novamente.')}}catch(e){line.issues.push((e as Error).message)}if(line.fee===null)line.issues.push('Taxa de pagamento ou imposto não informado.');lines.push(line)})
 }
 return {lines,issues}
}
function aggregate(data:ReportData,filters:ReportFilters,start:string,end:string):ReportSlice{
 const all=data.orders.filter(o=>validSale(o)&&completedOrder(o)&&inRange(controlDay(o.created),start,end)),{lines,issues}=linesFor(data,all)
 const common=expensesFor(data,filters,start,end)
 const revenue=lines.reduce((s,l)=>s+l.revenue,0),weights=lines.map(l=>revenue>0?l.revenue:l.qty),allocated=allocations(common,weights)
 const selected=lines.map((line,i)=>({line,expense:allocated[i]})).filter(({line})=>filters.channel==='all'||channelId(line.order)===filters.channel)
 const products=new Map<string,ProductReport>()
 for(const {line,expense} of selected){const row=products.get(line.id)||{id:line.id,name:line.name,qty:0,revenue:0,variable:0,fees:0,expenses:0,cost:0,profit:0,estimated:true,manual:false,issues:[]};row.qty+=line.qty;row.revenue=money(row.revenue+line.revenue);row.variable=row.variable===null||line.variable===null?null:money(row.variable+line.variable);row.fees=row.fees===null||line.fee===null?null:money(row.fees+line.fee);row.expenses=money(row.expenses+expense);row.manual=row.manual||line.manual;row.issues=[...new Set([...row.issues,...line.issues])];row.cost=row.variable===null||row.fees===null?null:money(row.variable+row.fees+row.expenses);row.profit=row.cost===null?null:money(row.revenue-row.cost);products.set(row.id,row)}
 const rows=[...products.values()].sort((a,b)=>b.revenue-a.revenue||a.name.localeCompare(b.name))
 const selectedOrders=all.filter(o=>filters.channel==='all'||channelId(o)===filters.channel),nullableSum=(key:'variable'|'fees'|'cost')=>rows.some(r=>r[key]===null)?null:money(rows.reduce((s,r)=>s+Number(r[key]),0))
 const unallocated=filters.channel==='all'&&!lines.length?common:0,expenses=money(rows.reduce((s,r)=>s+r.expenses,0)+unallocated),variable=nullableSum('variable'),fees=nullableSum('fees'),cost=variable===null||fees===null?null:money(variable+fees+expenses),net=money(rows.reduce((s,r)=>s+r.revenue,0))
 const hasDivergence=issues.length>0
 return {products:rows,totals:{orders:selectedOrders.length,qty:rows.reduce((s,r)=>s+r.qty,0),revenue:net,delivery:money(selectedOrders.reduce((s,o)=>s+Number(o.deliveryFee||0),0)),registered:money(selectedOrders.reduce((s,o)=>s+Number(o.total||0),0)),variable,fees,expenses,cost:hasDivergence?null:cost,profit:hasDivergence||cost===null?null:money(net-cost),pending:rows.filter(r=>r.cost===null).length,unallocated,issues}}
}
export function generateSalesReport(data:ReportData,filters:ReportFilters,generatedAt=new Date().toISOString()):SalesReport{
 const today=controlDay(generatedAt),range=reportRange(filters.period,filters.date,today)
 if(![3,6,12].includes(filters.historyMonths))throw Error('Escolha 3, 6 ou 12 meses para a projeção.')
 const cache=new Map<string,ReportSlice>()
 const slice=(start:string,end:string,channel=filters.channel)=>{const key=start+'|'+end+'|'+channel;if(!cache.has(key))cache.set(key,aggregate(data,{...filters,channel},start,end));return cache.get(key)!}
 const current=slice(range.start,range.end)
 const channels=reportChannels(data.orders).filter(id=>filters.channel==='all'||id===filters.channel).map(id=>({id,label:channelLabel(id),totals:slice(range.start,range.end,id).totals}))
 // Closed calendar months with recorded activity, across the whole store. A product
 // absent in an observed month contributes zero; missing store months are not invented.
 const observed=new Set(data.orders.filter(o=>validSale(o)&&completedOrder(o)).map(o=>controlDay(o.created).slice(0,7)).filter(Boolean))
 if(filters.expenseBasis==='entries')for(const r of data.records)if(['expense','payable','loss'].includes(r.kind)&&r.data.status==='settled')observed.add(controlDay(r.data.date||r.created).slice(0,7))
 const anchor=filters.date<today?filters.date:today
 const history:SalesReport['history']=[],year=Number(anchor.slice(0,4)),month=Number(anchor.slice(5,7))
 for(let ago=filters.historyMonths;ago>=1;ago--){const first=dateString(new Date(Date.UTC(year,month-1-ago,1,12))),key=first.slice(0,7);if(observed.has(key))history.push({month:key,totals:slice(first,endMonth(key)).totals})}
 let annual:SalesReport['annual']=null
 if(history.length>=2){
  const baseRows=history.map(h=>slice(h.month+'-01',endMonth(h.month))),ids=[...new Set(baseRows.flatMap(h=>h.products.map(p=>p.id)))],factor=12/history.length
  const annualProducts=ids.map(id=>{const values=baseRows.map(h=>h.products.find(p=>p.id===id)),present=values.filter((v):v is ProductReport=>Boolean(v)),sum=(key:'qty'|'revenue'|'expenses')=>present.reduce((s,r)=>s+r[key],0)*factor,nullable=(key:'variable'|'fees'|'cost'|'profit')=>present.some(r=>r[key]===null)?null:money(present.reduce((s,r)=>s+Number(r[key]),0)*factor);return {...present[0],qty:sum('qty'),revenue:money(sum('revenue')),expenses:money(sum('expenses')),variable:nullable('variable'),fees:nullable('fees'),cost:nullable('cost'),profit:nullable('profit'),issues:[...new Set(present.flatMap(p=>p.issues))]}})
  annual={months:history.length,qty:history.reduce((s,h)=>s+h.totals.qty,0)*factor,revenue:money(history.reduce((s,h)=>s+h.totals.revenue,0)*factor),cost:history.some(h=>h.totals.cost===null)?null:money(history.reduce((s,h)=>s+Number(h.totals.cost),0)*factor),profit:history.some(h=>h.totals.profit===null)?null:money(history.reduce((s,h)=>s+Number(h.totals.profit),0)*factor),products:annualProducts.sort((a,b)=>b.revenue-a.revenue)}
 }
 return {filters:{...filters},...range,generatedAt,...current,channels,history,annual,notes:[
  'Base: pedidos concluídos; cancelados, recusados e pedidos em andamento ficam fora das vendas.',
  'Custos e resultados são estimados pelos custos atuais cadastrados, não pelo custo histórico de cada venda.',
  filters.expenseBasis==='plan'?'Despesas do plano mensal proporcionais aos dias decorridos. Lançamentos pagos não são somados novamente.':'Despesas confirmadas por data de lançamento; valores ainda não lançados não estão cobertos. Compras identificadas como estoque ficam fora do resultado.',
  'Despesas comuns são distribuídas uma única vez por participação na receita dos produtos de todos os canais; na ausência de receita, pela quantidade.',
  'Frete cobrado é exibido à parte. Custos e taxas do frete não estão apurados neste resultado dos produtos.',
  'Projeção de 12 meses: média dos meses calendários anteriores encerrados com movimento registrado, sem ajuste de sazonalidade. Meses sem registros na loja não são assumidos como zero.',
  'A completude de cada mês deve ser conferida. Despesas e taxas não cadastradas podem deixar o resultado incompleto.',
  ...current.totals.issues]}
}
export function salesReportCsv(report:SalesReport){
 const rows:(string|number|null)[][]=[['Relatório de vendas e resultado estimado'],['Gerado em',report.generatedAt],['Início',report.start],['Fim',report.end],['Canal',channelLabel(report.filters.channel)],['Despesas',report.filters.expenseBasis==='plan'?'Plano mensal proporcional':'Lançamentos confirmados'],[],['Resumo'],['Pedidos','Unidades','Receita dos produtos','Frete cobrado separado','Total registrado','Custos estimados','Resultado estimado'],[report.totals.orders,report.totals.qty,report.totals.revenue,report.totals.delivery,report.totals.registered,report.totals.cost,report.totals.profit],[],['Produtos'],['Produto','Unidades','Receita líquida dos itens','Custo variável','Taxas adicionais','Despesas rateadas','Custo total estimado','Resultado estimado','Pendências']]
 for(const p of report.products)rows.push([p.name,p.qty,p.revenue,p.variable,p.fees,p.expenses,p.cost,p.profit,p.issues.join(' / ')])
 rows.push([],['Canais'],['Canal','Pedidos','Unidades','Receita dos produtos','Frete cobrado','Custos estimados','Resultado estimado'])
 for(const c of report.channels)rows.push([c.label,c.totals.orders,c.totals.qty,c.totals.revenue,c.totals.delivery,c.totals.cost,c.totals.profit])
 rows.push([],['Meses usados na projeção'],['Mês','Receita dos produtos','Custos estimados','Resultado estimado'])
 for(const h of report.history)rows.push([h.month,h.totals.revenue,h.totals.cost,h.totals.profit])
 rows.push([],['Projeção anual de 12 meses'])
 if(report.annual){rows.push(['Meses observados',report.annual.months],['Produto','Unidades estimadas','Receita estimada','Gasto estimado','Resultado estimado']);for(const p of report.annual.products)rows.push([p.name,p.qty,p.revenue,p.cost,p.profit]);rows.push(['TOTAL',report.annual.qty,report.annual.revenue,report.annual.cost,report.annual.profit])}else rows.push(['Pendente: são necessários ao menos dois meses anteriores com movimento registrado.'])
 rows.push([],['Critérios e limites'],...report.notes.map(note=>[note]))
 const cell=(value:string|number|null)=>{if(value===null)return '"Pendente"';let text=typeof value==='number'?String(value).replace('.',','):value;if(typeof value==='string'&&/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
 return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')
}
