import {test} from 'node:test'
import assert from 'node:assert/strict'
import {controlSummary,validateControlDraft,productContributions} from '../src/lib/controlPanel.ts'
const row=(kind,data)=>({id:kind,kind,data,revision:1})
test('sales are separate from cash and cancelled orders do not inflate revenue',()=>{
 const orders=[{total:100,status:'concluído',items:[{qty:2,price:50,name:'Lanche',itemId:'p'}]},{total:900,status:'cancelado',items:[]}]
 const records=[row('opening',{amount:200,status:'settled'}),row('expense',{amount:20,status:'settled'}),row('receivable',{amount:50,status:'settled'}),row('payable',{amount:30,status:'open',date:'2026-10-29'}),row('receivable',{amount:60,status:'open',date:'2026-11-10'})]
 const metrics=controlSummary(orders,records,'2026-10-28')
 assert.equal(metrics.revenue,100);assert.equal(metrics.cash,230);assert.equal(metrics.forecast(7),200);assert.equal(metrics.forecast(15),260);assert.equal(metrics.cashConfigured,true)
 assert.equal(controlSummary(orders,[],'2026-10-28').cashConfigured,false)
 const voided=controlSummary([],records.map(r=>r.kind==='expense'?{...r,data:{...r.data,status:'void'}}:r),'2026-10-28');assert.equal(voided.cash,250)
})
test('unknown costs stay unknown and contribution is not presented as net profit',()=>{
 const orders=[{total:40,status:'aceito',items:[{itemId:'p',name:'Produto',qty:2,price:20}]}]
 assert.equal(productContributions(orders,[])[0].contribution,null)
 assert.equal(productContributions(orders,[row('cost',{productId:'p',amount:8})])[0].contribution,24)
})
test('financial drafts reject invalid amounts and preserve valid zero without coercing missing money',()=>{
 const draft={name:' Energia ',amount:12.5,date:'2026-10-28',status:'settled'}
 assert.equal(validateControlDraft('expense',draft).name,'Energia')
 for(const amount of [-1,Infinity,'x',1.001,10000000000,null,'',undefined])assert.throws(()=>validateControlDraft('expense',{...draft,amount}))
 assert.throws(()=>validateControlDraft('expense',{...draft,name:'a'}))
 assert.equal(validateControlDraft('opening',{...draft,amount:0}).amount,0)
})

test('order-wide discounts are allocated to product revenue without adding delivery fees',()=>{const result=productContributions([{status:'aceito',total:45,discount:5,deliveryFee:10,items:[{itemId:'p',name:'Produto',qty:2,price:20}]}],[row('cost',{productId:'p',amount:8})]);assert.equal(result[0].revenue,35);assert.equal(result[0].contribution,19)})
