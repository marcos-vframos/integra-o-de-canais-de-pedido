import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function read(name){const context={exports:{},fetch,URLSearchParams,AbortSignal,Map,Date,setTimeout};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../supabase/functions/_shared/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports}
const routing=read('roadRouting'),quote=read('deliveryQuote')
const fixture={code:'Ok',routes:[{distance:7136.5,duration:668.8,geometry:{coordinates:[[-45.5,-22.95],[-45.46,-22.92]]}}],waypoints:[{distance:5},{distance:6}]}
test('road distance and duration come from routed segments, never endpoint straight-line distance',()=>{
 const route=routing.parseOsrmRoute(fixture)
 assert.equal(route.distanceKm,7.1365);assert.equal(route.durationMinutes,668.8/60)
 assert.equal(route.traffic,'unavailable');assert.equal(route.delayMinutes,null)
 assert.deepEqual(Array.from(route.geometry[0]),[-22.95,-45.5])
})
test('unreachable, invalid and far-from-road points have no fabricated kilometer fallback',()=>{
 assert.throws(()=>routing.parseOsrmRoute({code:'NoRoute'}),/não encontrado/)
 assert.throws(()=>routing.parseOsrmRoute({...fixture,waypoints:[{distance:700}]}),/distante/)
 assert.throws(()=>routing.parseOsrmRoute({...fixture,routes:[{distance:NaN,duration:1}]}),/válido/)
 const matrix=routing.parseOsrmMatrix({code:'Ok',distances:[[7000,null]],durations:[[600,null]],sources:[{distance:0}],destinations:[{distance:0},{distance:0}]},2)
 assert.equal(matrix[0].distanceKm,7);assert.equal(matrix[1],null)
})
test('live traffic duration and delay stay distinct and require a configured provider',async()=>{
 const route=routing.parseTomtomRoute({routes:[{summary:{lengthInMeters:9000,travelTimeInSeconds:1200,trafficDelayInSeconds:300},legs:[{points:[{latitude:-22.95,longitude:-45.5}]}]}]})
 assert.equal(route.durationMinutes,20);assert.equal(route.delayMinutes,5);assert.equal(route.traffic,'live');assert.equal(route.profile,'motorcycle')
 await assert.rejects(routing.roadRoute({lat:-22.95,lng:-45.5},{lat:-22.92,lng:-45.46},{traffic:true}),/não configurado/)
})
test('fixed neighborhood fees remain fixed, while distance-based fees use road kilometers',()=>{
 const route={distanceKm:10,durationMinutes:20}
 assert.equal(quote.feeForRoadRoute({fee:5,description:'{}'},route),15.5)
 assert.equal(quote.feeForRoadRoute({fee:5,description:'{"fixedFee":true}'},route),5)
 assert.equal(quote.feeForRoadRoute({fee:0,description:'{"fixedFee":true}'},route),0)
 assert.throws(()=>quote.feeForRoadRoute({fee:null},route),/pendente/)
})
test('pending nearest neighborhood is rejected instead of silently using another price',()=>{
 const point={lat:-22.95,lng:-45.5}
 const fees=[{id:'p',name:'Pendente',fee:null,...point},{id:'paid',name:'Outro',fee:8,lat:-22.9,lng:-45.4}]
 assert.throws(()=>quote.selectFeeReference(fees,point),/não cadastrada/)
})
