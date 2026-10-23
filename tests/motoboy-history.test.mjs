import {test} from 'node:test'
import assert from 'node:assert/strict'
import {businessDay,deliveryTimestamp,deliveryFee,totalDeliveryFees,belongsToCourier,filterDeliveryHistory,monthlyDeliveryTotals,periodBounds} from '../src/lib/motoboyHistory.ts'
const courier={id:'courier-a',name:'Mesmo Nome',dailyRate:40}
const order=(id,created,deliveryFee=7,extra={})=>({id,created,deliveryFee,total:80,ticketNumber:1,items:[],payment:'Pix',deliveryType:'entrega',status:'pronto',motoboyId:'courier-a',motoboyName:'Mesmo Nome',...extra})
test('history uses Sao Paulo business dates across UTC midnight',()=>{
 assert.equal(businessDay('2026-10-01T01:30:00Z'),'2026-09-30');assert.equal(businessDay('2026-10-01T03:00:00Z'),'2026-10-01');assert.equal(businessDay('invalid'),'')
})
test('daily rate is never multiplied into delivery fees and explicit zero stays zero',()=>{
 const rows=[order('1','2026-10-01T12:00:00Z',5.5),order('2','2026-10-01T12:00:00Z',7.9),order('3','2026-10-01T12:00:00Z',0)]
 assert.equal(totalDeliveryFees(rows),13.4);assert.equal(deliveryFee(rows[2]),0)
 assert.equal(deliveryFee({...rows[0],deliveryFee:undefined}),null);assert.equal(deliveryFee({...rows[0],deliveryFee:-1}),null)
 assert.equal(monthlyDeliveryTotals(rows,2026,courier)[9].fees,13.4)
})
test('courier IDs prevent double counting same-name couriers; legacy name fallback remains readable',()=>{
 assert.equal(belongsToCourier(order('1','2026-10-01',7,{motoboyId:'courier-b'}),courier),false)
 assert.equal(belongsToCourier(order('2','2026-10-01',7,{motoboyId:null}),courier),true)
 assert.equal(belongsToCourier(order('3','2026-10-01',7,{motoboyId:null,motoboyName:null}),courier),false)
})
test('week filtering starts Monday and crosses month/year without losing Sunday deliveries',()=>{
 assert.deepEqual(periodBounds('week','2026-01-01'),{start:'2025-12-29',end:'2026-01-05'})
 const rows=[order('a','2025-12-29T12:00Z'),order('b','2026-01-04T23:59Z'),order('c','2026-01-05T12:00Z')]
 assert.deepEqual(filterDeliveryHistory(rows,'week','2026-01-01',courier).map(x=>x.id),['b','a'])
})
test('day, month, year and full-history filters exclude cancellations and pickup orders',()=>{
 const rows=[order('a','2026-10-01T15:00Z'),order('b','2026-10-02T15:00Z'),order('c','2026-09-01T15:00Z'),order('d','2025-10-01T15:00Z'),order('cancel','2026-10-01T15:00Z',9,{status:'recusado'}),order('pickup','2026-10-01T15:00Z',9,{deliveryType:'retirada'})]
 assert.equal(filterDeliveryHistory(rows,'day','2026-10-01',courier).length,1)
 assert.equal(filterDeliveryHistory(rows,'month','2026-10-01',courier).length,2)
 assert.equal(filterDeliveryHistory(rows,'year','2026-10-01',courier).length,3)
 assert.equal(filterDeliveryHistory(rows,'all','2026-10-01',courier).length,4)
 assert.equal(filterDeliveryHistory(rows,'month','2026-02-31',courier).length,0)
})
test('monthly bars use actual fee sums, distinguish years and include zero months',()=>{
 const rows=[order('a','2026-10-01T15:00Z',5),order('b','2026-10-21T15:00Z',8),order('c','2025-10-01T15:00Z',50)]
 const bars=monthlyDeliveryTotals(rows,2026,courier)
 assert.equal(bars.length,12);assert.equal(bars[9].fees,13);assert.equal(bars[9].count,2);assert.equal(bars[9].anchor,'2026-10-01');assert.equal(bars[0].fees,0)
})
test('recorded dispatch time drives the period; legacy orders retain their original order timestamp',()=>{
 const row=order('a','2026-09-30T12:00Z',7,{motoboyAssignedAt:'2026-10-01T12:00Z'})
 assert.equal(filterDeliveryHistory([row],'month','2026-10-01',courier).length,1)
 assert.equal(filterDeliveryHistory([row],'month','2026-09-01',courier).length,0)
 assert.equal(deliveryTimestamp({...row,motoboyAssignedAt:null}),row.created)
})
test('only dispatched deliveries count; reopening removes them until redispatch and completion never duplicates',()=>{
 const yesterday=order('sale','2026-10-01T12:00Z',7,{motoboyAssignedAt:'2026-10-22T12:00Z'})
 const reopened={...yesterday,status:'aceito'}
 assert.equal(filterDeliveryHistory([reopened],'all','2026-10-23',courier).length,0)
 const dispatched={...reopened,status:'pronto',motoboyAssignedAt:'2026-10-23T12:00Z'}
 assert.equal(filterDeliveryHistory([dispatched],'day','2026-10-23',courier).length,1)
 assert.equal(totalDeliveryFees(filterDeliveryHistory([dispatched],'day','2026-10-23',courier)),7)
 assert.equal(filterDeliveryHistory([{...dispatched,status:'concluído'}],'day','2026-10-23',courier).length,1)
 assert.equal(filterDeliveryHistory([{...dispatched,status:'pendente'}],'all','2026-10-23',courier).length,0)
})
