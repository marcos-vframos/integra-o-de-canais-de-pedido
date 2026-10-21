import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JUICE_FLAVORS, drinkFlavors, validDrinkFlavor, flavorLines } from '../src/lib/beverages.ts'
import { lowStockRows, escapeHtml } from '../src/lib/stockAlerts.ts'
test('seven Tropical flavors create separate fully priced units',()=>{
 const product={name:'Suco Tropical',code:'b-suco',category:'Bebidas'}
 assert.equal(drinkFlavors(product).length,7)
 assert.equal(JUICE_FLAVORS.length,7)
 const lines=flavorLines('juice',['Maracujá','Goiaba','Maracujá'],1)
 assert.equal(lines.length,2)
 assert.equal(lines.reduce((n,l)=>n+l.qty*8,0),16)
 assert.equal(new Set(lines.map(l=>l.cartLineId)).size,2)
 assert.equal(validDrinkFlavor(product,'Coca-Cola'),false)
 assert.equal(validDrinkFlavor(product,'Guaraná com Açaí'),true)
 assert.equal(flavorLines('juice',['Caju','Laranja'],3).reduce((n,l)=>n+l.qty,0),6)
})
test('alerts include every low item, independent of sales and remove replenished rows',()=>{
 const items=[{name:'Goiaba',qty:2,min:5,unit:'un'},{name:'Pão',qty:8,min:8,unit:'un'},{name:'Caju',qty:0,min:0,unit:'un'}]
 assert.deepEqual(lowStockRows(items).map(x=>x.ingredientName),['Caju','Goiaba'])
 assert.equal(lowStockRows(items).find(x=>x.ingredientName==='Goiaba').suggestedBuy,3)
 assert.equal(lowStockRows([{name:'Goiaba',qty:5,min:5,unit:'un'}]).length,0)
 assert.equal(escapeHtml('<script>'),'&lt;script&gt;')
})
