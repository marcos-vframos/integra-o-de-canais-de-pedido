import {test} from 'node:test'
import assert from 'node:assert/strict'
import {calculateProfit,emptyProfitDraft,ingredientUnitCost} from '../src/lib/profitCalculator.ts'
const draft=(overrides={})=>({...emptyProfitDraft(),price:'30',ingredientCost:'12',tax:'10',fixedCost:'5',targetMargin:'20',...overrides})
test('separates contribution, allocated result and target price',()=>{
 const r=calculateProfit(draft())
 assert.equal(r.revenue,30);assert.equal(r.fees,3);assert.equal(r.contribution,15);assert.equal(r.profit,10)
 assert.equal(r.contributionMargin,50);assert.ok(Math.abs(r.profitMargin-100/3)<1e-8)
 assert.equal(r.suggestedPrice,24.29);assert.ok(r.suggestedMargin>=20)
})
test('missing fixed allocation never silently becomes zero or produces net profit',()=>{
 const r=calculateProfit(draft({fixedCost:''}))
 assert.equal(r.contribution,15);assert.equal(r.profit,null);assert.equal(r.profitMargin,null);assert.equal(r.suggestedPrice,null)
 assert.equal(calculateProfit(draft({fixedCost:'0'})).profit,15)
})
test('fixed and percentage discounts both reduce the basis for every percentage fee',()=>{
 for(const input of [{discount:'3',discountMode:'amount'},{discount:'10',discountMode:'percent'}]){
  const r=calculateProfit(draft({...input,cardFee:'2',commission:'5'}))
  assert.equal(r.revenue,27);assert.equal(r.discount,3);assert.equal(r.fees,4.59);assert.equal(r.contribution,10.41);assert.equal(r.profit,5.41)
  const suggested=calculateProfit(draft({...input,cardFee:'2',commission:'5',price:String(r.suggestedPrice)}))
  assert.ok(suggested.profitMargin>=20-1e-8)
 }
})
test('recipe costs use net purchase yield and retain subcent ingredient costs until aggregation',()=>{
 const row={id:'a',name:'Carne',unit:'g',purchasePrice:'40',purchaseQty:'1000',usedQty:'100',yieldPercent:'80'}
 assert.equal(ingredientUnitCost(row),5)
 const tiny={...row,purchasePrice:'1',purchaseQty:'1000',usedQty:'4',yieldPercent:'100'}
 const r=calculateProfit(draft({ingredientMode:'recipe',ingredients:[tiny,{...tiny,id:'b'}],packaging:'1',otherCost:'2',deliverySubsidy:'3'}))
 assert.equal(r.variableCost,6.01)
})
test('negative, missing and nonsensical input never produces a false result',()=>{
 for(const override of [{price:''},{price:'0'},{price:'-1'},{ingredientCost:''},{ingredientCost:'NaN'},{tax:'101'},{cardFee:'Infinity'},{discount:'30'},{discountMode:'percent',discount:'100'},{fixedCost:'-1'},{packaging:'0.001'}])assert.throws(()=>calculateProfit(draft(override)))
 const row={id:'a',name:'Carne',unit:'g',purchasePrice:'4',purchaseQty:'0',usedQty:'1',yieldPercent:'100'}
 assert.throws(()=>ingredientUnitCost(row));assert.throws(()=>ingredientUnitCost({...row,purchaseQty:'10',yieldPercent:'0'}))
 assert.throws(()=>calculateProfit(draft({ingredientMode:'recipe',ingredients:[]})))
})
test('unreachable goals remain explicit and do not yield infinite suggested prices',()=>{
 const r=calculateProfit(draft({tax:'80',targetMargin:'20'}))
 assert.equal(r.suggestedPrice,null);assert.match(r.suggestionMessage,/inviável/)
 const loss=calculateProfit(draft({ingredientCost:'35'}));assert.ok(loss.contribution<0);assert.ok(loss.profit<0)
})
test('rounding of each fee is respected even with small ticket values and high rate totals',()=>{
 for(const input of [{price:'1',ingredientCost:'0.03',fixedCost:'0.02',tax:'1.99',cardFee:'2.99',commission:'15.33',targetMargin:'25',discount:'5',discountMode:'percent'},{tax:'99.5',targetMargin:'0.49'}]){
  const r=calculateProfit(draft(input));assert.ok(Number.isFinite(r.suggestedPrice));assert.ok(r.suggestedPrice>0)
  const checked=calculateProfit(draft({...input,price:String(r.suggestedPrice)}))
  assert.ok(checked.profitMargin>=Number(input.targetMargin)-1e-7)
 }
})
test('zero cost is valid only when explicitly entered and comma decimal input is accepted',()=>{
 assert.equal(calculateProfit(draft({ingredientCost:'0',tax:'0',fixedCost:'0'})).profit,30)
 assert.equal(calculateProfit(draft({ingredientCost:'12,50'})).variableCost,12.5)
 const freeCost=calculateProfit(draft({ingredientCost:'0',tax:'0',fixedCost:'0',targetMargin:'100'}));assert.equal(freeCost.suggestedPrice,30);assert.equal(freeCost.suggestedMargin,100)
})
test('half-cent taxes and discounts round deterministically using integer percentage units',()=>{
 const r=calculateProfit(draft({price:'3.75',ingredientCost:'0',tax:'9.2',fixedCost:'0'}));assert.equal(r.fees,0.35)
 const d=calculateProfit(draft({price:'3.75',ingredientCost:'0',tax:'0',fixedCost:'0',discountMode:'percent',discount:'9.2'}));assert.equal(d.discount,0.35);assert.equal(d.revenue,3.4)
 assert.throws(()=>calculateProfit(draft({tax:'9.201'})))
})
