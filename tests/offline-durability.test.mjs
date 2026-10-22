import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
let source=readFileSync(new URL('../src/lib/offlineQueue.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'')
source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
function queue(fail=false){const storage=new Map();let next=0;const c={exports:{},crypto,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(fail)throw Error('quota');storage.set(k,v)}},getTicketCounterCache:()=>1,saveTicketCounterCache:()=>{},uid:()=>String(++next),window:{dispatchEvent:()=>{}},CustomEvent:class{},console:{error:()=>{}}};vm.runInNewContext(source,c);return {api:c.exports,storage}}
test('offline storage failure is surfaced instead of falsely confirming the order',()=>{
 const q=queue(true);assert.throws(()=>q.api.enqueueOfflineOrder({items:[]},1),/não foi confirmado/);assert.equal(q.storage.size,0)
})
test('queued orders preserve their request ID for every future synchronization attempt',()=>{
 const q=queue();const order=q.api.enqueueOfflineOrder({items:[],clientRequestId:'ord-stable'},1);assert.equal(order.payload.clientRequestId,'ord-stable');assert.equal(q.api.getOfflineQueue()[0].payload.clientRequestId,'ord-stable');const newer=q.api.enqueueOfflineOrder({items:[]},2);assert.match(newer.payload.clientRequestId,/^ord-[a-f0-9-]{36}$/)
})
