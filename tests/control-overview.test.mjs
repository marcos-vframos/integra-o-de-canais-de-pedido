import {test} from 'node:test'
import assert from 'node:assert/strict'
import {controlDay,inControlPeriod,overviewCustomers,cashMovementSeries,completedOrder} from '../src/lib/controlOverview.ts'
const sale=(phone,created,status='concluído')=>({customerPhone:phone,created,status,total:20,items:[]})
const row=(kind,amount,date,status='settled')=>({kind,data:{amount,date,status}})
test('periods use local Brazilian dates, including UTC day boundaries',()=>{
 assert.equal(controlDay('2026-10-29T01:00:00Z'),'2026-10-28')
 assert.equal(inControlPeriod('2026-10-29T01:00:00Z','today','2026-10-28'),true)
 assert.equal(inControlPeriod('2026-09-30T23:00:00Z','month','2026-10-28'),false)
 assert.equal(inControlPeriod(undefined,'all','2026-10-28'),false)
 assert.equal(controlDay('invalid'),'')
})
test('recurrence uses purchases before or within the selected period, not future purchases or cancelled sales',()=>{
 const orders=[sale('11999990000','2026-09-01T12:00:00Z'),sale('(11) 99999-0000','2026-10-15T12:00:00Z'),sale('11999990001','2026-10-20T12:00:00Z'),sale('11999990001','2026-11-20T12:00:00Z'),sale('11999990002','2026-10-20T12:00:00Z','cancelado'),sale('','2026-10-20T12:00:00Z')]
 assert.deepEqual(overviewCustomers(orders,'month','2026-10-28'),{first:1,repeat:1,identified:2,recurrence:50})
 assert.equal(orders[0].created,'2026-09-01T12:00:00Z')
 assert.equal(overviewCustomers([],'month','2026-10-28').recurrence,null)
})
test('financial graph excludes opening balance, pending and reversed entries, and combines paid obligations without assuming sales are receipts',()=>{
 const series=cashMovementSeries([row('opening',1000,'2026-10-01'),row('receivable',80,'2026-10-02'),row('expense',10,'2026-10-02'),row('payable',20,'2026-10-02'),row('receivable',900,'2026-10-02','open'),row('expense',900,'2026-10-02','void'),row('receivable',9,'2026-09-02')],'month','2026-10-28')
 assert.equal(series.length,31)
 assert.deepEqual(series.find(p=>p.date==='2026-10-02'),{date:'2026-10-02',incoming:80,outgoing:30})
 assert.equal(series.reduce((s,p)=>s+p.incoming,0),80)
})
test('all-history graph groups by month, maintains chronological order and ignores malformed amounts',()=>{
 assert.deepEqual(cashMovementSeries([row('receivable',8,'2026-11-02'),row('receivable',4,'2026-10-20'),row('expense',2,'2026-10-01'),row('expense','bad','2026-10-01')],'all','2026-10-28'),[{date:'2026-10',incoming:4,outgoing:2},{date:'2026-11',incoming:8,outgoing:0}])
})
test('completed orders accept both spelling variants and the existing finalized status',()=>{
 for(const status of ['concluido','concluído','finalizado'])assert.equal(completedOrder({status}),true)
 for(const status of ['aceito','pronto','pendente'])assert.equal(completedOrder({status}),false)
})
