import {test} from 'node:test'
import assert from 'node:assert/strict'
import {sandwichPreviewLayers} from '../src/lib/sandwichPreview.ts'
import {seedStock,seedMenu} from '../src/lib/seeds.ts'
const stock=seedStock(),menu=seedMenu(),resolve=id=>stock.find(s=>s.code===id||s.id===id)
test('preview follows each sandwich recipe including the three standard Max patties',()=>{
 for(const item of menu.filter(m=>['Carnes','Frango','Hot-Dog','Gourmet','Especial'].includes(m.category))){
  const layers=sandwichPreviewLayers(item,{}, {},resolve)
  for(const r of item.recipe||[]){const s=resolve(r.ingredientId);if(!s||s.group!=='Ingrediente'||s.code==='ing-pao'||s.code==='ing-pao-frances')continue;const expected=item.recipe.filter(p=>resolve(p.ingredientId)?.code===s.code).reduce((n,p)=>n+p.qty,0);assert.equal(layers.find(l=>l.code===s.code)?.qty,expected,item.name+' / '+s.name)}
 }
 const max=menu.find(p=>p.code==='c-xmaxtudo')
 const removed={'ing-bacon':true,'ing-hamburguer':true},added={'ing-ovo':2,'ing-queijo':1}
 const preview=sandwichPreviewLayers(max,removed,added,resolve)
 assert.equal(preview.some(l=>l.code==='ing-bacon'),false)
 assert.equal(preview.some(l=>l.code==='ing-hamburguer'),false)
 assert.equal(preview.find(l=>l.code==='ing-ovo').qty,3)
 assert.equal(preview.find(l=>l.code==='ing-queijo').qty,2)
 assert.equal(sandwichPreviewLayers(max,{}, {},resolve).find(l=>l.code==='ing-hamburguer').qty,3)
})
test('a gourmet courtesy and an extra outside the recipe appear in the preview',()=>{
 const item=menu.find(p=>p.code==='c-xburguer')
 const result=sandwichPreviewLayers(item,{}, {'ing-bacon':2,'ing-pao':1,'ing-refri-lata':1},resolve,'catupiry')
 assert.equal(result.find(l=>l.code==='ing-bacon').qty,2)
 assert.equal(result.find(l=>l.code==='ing-catupiry').qty,1)
 assert.equal(result.some(l=>l.code==='ing-pao'||l.code==='ing-refri-lata'),false)
})
test('fractional stock portions remain part of the visual composition',()=>{
 const part={id:'mass',code:'ing-carne-gourmet',name:'Carne em kg',group:'Ingrediente',unit:'kg'}
 const result=sandwichPreviewLayers({recipe:[{ingredientId:'mass',qty:.15}]},{},{},id=>id==='mass'?part:undefined)
 assert.equal(result[0].qty,.15);assert.equal(result[0].unit,'kg')
})

test('approved assembly puts protein under egg, ham, extras and mozzarella in every line',()=>{
 for(const code of ['c-xtudo','c-xmaxtudo','c-xcontrafiletudo','f-xfiletudo','f-xcarijotudo','g-xtudogourmet']){
  const item=menu.find(p=>p.code===code)
  assert.ok(item,code)
  const layers=sandwichPreviewLayers(item,{}, {},resolve)
  const pos=c=>layers.findIndex(l=>l.code===c)
  const main=item.recipe.find(r=>['ing-hamburguer','ing-contrafile','ing-file-frango','ing-frango-desfiado','ing-carne-gourmet'].includes(r.ingredientId)).ingredientId
  const topDown=['ing-batata-palha','ing-alface','ing-tomate','ing-cebola','ing-milho','ing-queijo','ing-bacon','ing-calabresa','ing-apresuntado','ing-ovo',main]
  for(let i=1;i<topDown.length;i++)assert.ok(pos(topDown[i-1])<pos(topDown[i]),`${code}: ${topDown[i-1]} above ${topDown[i]}`)
  const withCreams=sandwichPreviewLayers(item,{}, {'ing-catupiry':1,'ing-cheddar':1},resolve)
  const creamPos=c=>withCreams.findIndex(l=>l.code===c)
  for(const cream of ['ing-catupiry','ing-cheddar'])assert.ok(creamPos('ing-apresuntado')<creamPos(cream)&&creamPos(cream)<creamPos('ing-ovo'))
 }
})
test('special recipes omit absent layers and keep linguiça, sausage or broccoli at the base',()=>{
 for(const [code,main] of [['h-paolinguica','ing-linguica'],['h-xhotdogtudo','ing-salsicha'],['e-xbrocolis','ing-brocolis']]){
  const item=menu.find(p=>p.code===code), layers=sandwichPreviewLayers(item,{}, {},resolve)
  const filling=layers.filter(l=>!['ing-maionese','ing-maionese-casa','ing-ketchup','ing-mostarda'].includes(l.code))
  assert.equal(filling.at(-1).code,main)
  assert.equal(layers.some(l=>l.code==='ing-apresuntado'),false)
 }
})
test('adding a different meat keeps the original main protein at the base',()=>{
 const item=menu.find(p=>p.code==='f-xfiletudo')
 const layers=sandwichPreviewLayers(item,{}, {'ing-hamburguer':1,'ing-brocolis':1},resolve).filter(l=>!['ing-maionese','ing-ketchup','ing-mostarda'].includes(l.code))
 assert.equal(layers.at(-1).code,'ing-file-frango')
 assert.equal(layers.find(l=>l.code==='ing-hamburguer').qty,1)
})
