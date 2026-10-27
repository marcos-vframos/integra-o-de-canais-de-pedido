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
