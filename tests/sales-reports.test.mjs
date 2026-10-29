import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateSalesReport,reportRange,salesReportCsv} from '../src/lib/salesReports.ts'
import {blankPlan} from '../src/lib/controlPricing.ts'
const now='2026-10-29T12:00:00Z'
const filters=(extra={})=>({period:'day',date:'2026-10-29',channel:'all',expenseBasis:'plan',historyMonths:6,...extra})
const plan=()=>({...blankPlan(),expenses:{rent:'310'},cardRate:'3',pixRate:'0',taxRate:'1',pack:'0',prep:'0'})
const setup=(orders=[],p=plan())=>({orders,inventory:[],menu:[],records:[{id:'plan',kind:'cost',revision:1,data:{model:'pricing_v1',status:'settled',plan:p}},{id:'cost-a',kind:'cost',revision:1,data:{productId:'a',amount:2,status:'settled'}},{id:'cost-b',kind:'cost',revision:1,data:{productId:'b',amount:3,status:'settled'}}]})
const order=(id,origin='online',qty=1,price=10,extra={})=>({id,origin,created:now,status:'concluído',payment:'Dinheiro',ticketNumber:id,total:qty*price,items:[{itemId:'a',name:'Produto A',qty,price}],...extra})
test('Brazilian dates, Monday weeks, leap months and current partial periods are exact',()=>{
 assert.deepEqual(reportRange('week','2026-10-29','2026-10-29'),{start:'2026-10-26',end:'2026-10-29'})
 assert.deepEqual(reportRange('week','2026-10-04','2026-10-29'),{start:'2026-09-28',end:'2026-10-04'})
 assert.deepEqual(reportRange('month','2024-02-15','2026-10-29'),{start:'2024-02-01',end:'2024-02-29'})
 assert.throws(()=>reportRange('day','2026-11-01','2026-10-29'))
 assert.throws(()=>reportRange('month','2026-02-30','2026-10-29'))
 const r=generateSalesReport(setup([order('late','online',1,10,{created:'2026-10-30T01:00:00Z'})]),filters(),now);assert.equal(r.totals.orders,1)
})
test('channel shares reconcile to the full report without duplicating common monthly expenses',()=>{
 const data=setup([order('1'),order('2','balcao',3),order('3','online',1,100,{status:'cancelado'}),order('4','online',1,100,{status:'pendente'})])
 const all=generateSalesReport(data,filters(),now),online=generateSalesReport(data,filters({channel:'online'}),now),counter=generateSalesReport(data,filters({channel:'balcao'}),now)
 assert.equal(all.totals.orders,2);assert.equal(all.totals.qty,4);assert.equal(all.totals.revenue,40);assert.equal(all.totals.variable,8);assert.equal(all.totals.expenses,10);assert.equal(all.totals.cost,18);assert.equal(all.totals.profit,22)
 assert.equal(online.totals.expenses,2.5);assert.equal(counter.totals.expenses,7.5)
 assert.equal(online.totals.profit+counter.totals.profit,all.totals.profit)
 assert.equal(online.totals.fees,0,'complete manual unit costs do not receive selling fees twice')
})
test('consumption deductions are already line totals and card taxes only affect the relevant payment',()=>{
 const p=plan();p.costs={egg:{price:'1',unit:'un',portion:'1',portionUnit:'un',yield:'100'}}
 const data=setup([],p);data.records=data.records.filter(r=>r.id==='plan');data.inventory=[{id:'egg',code:'ing-ovo',name:'Ovo',unit:'un'}]
 data.orders=[order('1','online',2,10,{payment:'Cartão',items:[{itemId:'a',name:'Produto A',qty:2,price:10,stockDeductions:{'ing-ovo':4}}]})]
 const r=generateSalesReport(data,filters({expenseBasis:'entries'}),now)
 assert.equal(r.totals.variable,4);assert.equal(r.totals.fees,.8);assert.equal(r.totals.profit,15.2)
 data.orders[0].payment='Pix';assert.equal(generateSalesReport(data,filters({expenseBasis:'entries'}),now).totals.fees,.2)
 p.taxRate='';const pending=generateSalesReport(data,filters({expenseBasis:'entries'}),now);assert.equal(pending.totals.cost,null);assert.equal(pending.totals.profit,null)
})
test('discount pennies reconcile and freight stays separate from the product result',()=>{
 const data=setup([order('1','online',1,10,{total:24.99,discount:.01,deliveryFee:5,items:[{itemId:'a',name:'Produto A',qty:1,price:10},{itemId:'b',name:'Produto B',qty:1,price:10}]})])
 const r=generateSalesReport(data,filters({expenseBasis:'entries'}),now)
 assert.equal(r.products.reduce((s,p)=>s+Math.round(p.revenue*100),0),1999);assert.equal(r.totals.revenue,19.99);assert.equal(r.totals.delivery,5);assert.equal(r.totals.registered,24.99);assert.equal(r.totals.profit,14.99)
})
test('missing costs and mismatched totals remain pending rather than producing false profit',()=>{
 const data=setup([order('1')]);data.records=[]
 assert.equal(generateSalesReport(data,filters({expenseBasis:'entries'}),now).totals.profit,null)
 const inconsistent=setup([order('1','online',1,10,{total:20})]);const r=generateSalesReport(inconsistent,filters(),now)
 assert.equal(r.totals.profit,null);assert.match(r.totals.issues[0],/divergente/)
})
test('annual estimates exclude current/future months and include zero sales for a product in observed months',()=>{
 const data=setup([order('aug','online',1,10,{created:'2026-08-10T12:00:00Z'}),order('sep','balcao',1,20,{created:'2026-09-10T12:00:00Z',items:[{itemId:'b',name:'Produto B',qty:1,price:20}]}),order('oct','online',20,100),order('future','online',100,100,{created:'2026-11-01T12:00:00Z'})])
 const r=generateSalesReport(data,filters(),now)
 assert.deepEqual(r.history.map(h=>h.month),['2026-08','2026-09']);assert.equal(r.annual.months,2);assert.equal(r.annual.revenue,180);assert.equal(r.annual.cost,3750);assert.equal(r.annual.products.find(p=>p.id==='a').qty,6);assert.equal(r.annual.products.find(p=>p.id==='a').revenue,60)
 assert.equal(generateSalesReport(data,filters({date:'2026-09-29'}),now).annual,null,'historical reference does not use later months')
 const channel=generateSalesReport(data,filters({channel:'online'}),now);assert.equal(channel.annual.revenue,60)
})
test('unrecorded months do not become invented zeros and insufficient history has no annual number',()=>{
 const r=generateSalesReport(setup([order('1')]),filters(),now);assert.equal(r.annual,null);assert.equal(r.history.length,0)
 const empty=generateSalesReport(setup([]),filters(),now);assert.equal(empty.totals.orders,0);assert.equal(empty.totals.cost,10);assert.equal(empty.totals.profit,-10);assert.equal(empty.totals.unallocated,10)
})
test('settled financial expenses use their own dates, exclude void/pending and identified inventory purchases',()=>{
 const data=setup([order('1')]);data.records.push(...[
  {kind:'expense',data:{amount:7,date:'2026-10-29',status:'settled'}},
  {kind:'payable',data:{amount:5,date:'2026-10-29',status:'settled'}},
  {kind:'expense',data:{amount:100,date:'2026-10-29',status:'void'}},
  {kind:'expense',data:{amount:100,date:'2026-10-29',status:'open'}},
  {kind:'expense',data:{amount:100,date:'2026-10-28',status:'settled'}},
  {kind:'expense',data:{amount:100,date:'2026-10-29',status:'settled',category:'stock_purchase'}}])
 const r=generateSalesReport(data,filters({expenseBasis:'entries'}),now);assert.equal(r.totals.expenses,12);assert.equal(r.totals.profit,-4)
})
test('CSV exports the same generated snapshot, annual detail and protects spreadsheet formulas',()=>{
 const data=setup([order('1','online',1,10,{items:[{itemId:'a',name:'=HYPERLINK("bad")',qty:1,price:10}]})]);const r=generateSalesReport(data,filters(),now),csv=salesReportCsv(r)
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('Todos os canais'));assert.ok(csv.includes('Projeção anual'));assert.ok(csv.includes('Pendente:'))
 data.orders[0].total=999;assert.equal(r.totals.registered,10,'generated snapshot remains unchanged after source data changes')
})
