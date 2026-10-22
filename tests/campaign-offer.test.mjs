import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const display = {exports:{},URL}
vm.runInNewContext(compile('../src/lib/campaignDisplay.ts'),display)
const dispatched=[]
const context={exports:{}, require:()=>display.exports, window:{dispatchEvent:e=>dispatched.push(e)},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}}}
vm.runInNewContext(compile('../src/lib/campaignOffer.ts'),context)
const {eligibleProductIds,notifyOffer}=context.exports
test('legacy campaigns work and explicit multi-product selection is authoritative',()=>{
 assert.deepEqual(Array.from(eligibleProductIds({productId:'old'})),['old'])
 assert.deepEqual(Array.from(eligibleProductIds({productId:'old',productIds:['a','b','a']})),['a','b'])
 assert.deepEqual(Array.from(eligibleProductIds({productId:'old',productIds:[]})),[])
})
test('selecting a campaign product cannot add an unrelated product or inactive benefit',()=>{
 const campaign={id:'promo',title:'Promo',active:true,offer:{productId:'a',productIds:['a','b'],included:[{ingredientId:'gift',qty:1}]}}
 notifyOffer(campaign,'b')
 assert.equal(dispatched.length,1)
 assert.equal(dispatched[0].detail.itemId,'b')
 notifyOffer(campaign,'unrelated')
 notifyOffer({...campaign,active:false},'a')
 notifyOffer({...campaign,endDate:'2000-01-01'},'a')
 assert.equal(dispatched.length,1)
})
