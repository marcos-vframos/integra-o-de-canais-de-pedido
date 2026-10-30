import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GENERATED_CATALOG,generatedCatalogImage} from '../src/lib/generatedCatalogImages.ts'
import {seedMenu} from '../src/lib/seeds.ts'

const menu=seedMenu()
const webp=src=>{
 const data=readFileSync(new URL('../public'+src,import.meta.url))
 assert.equal(data.toString('ascii',0,4),'RIFF',src)
 assert.equal(data.toString('ascii',8,12),'WEBP',src)
 return data.length
}
test('all registered food recipes have their own full image and lighter listing thumbnail',()=>{
 const food=menu.filter(item=>item.category!=='Bebidas')
 assert.equal(food.length,82)
 const sources=new Set()
 for(const item of food){
  const full=generatedCatalogImage(item),thumb=generatedCatalogImage(item,'card')
  assert.ok(full,item.code+' must match its exact recipe')
  assert.ok(thumb,item.code)
  sources.add(full)
  assert.ok(webp(thumb)<webp(full),item.code+' thumbnail must be smaller')
 }
 assert.equal(sources.size,food.length,'no shared generic product photograph')
 assert.equal(Object.keys(GENERATED_CATALOG).length,food.length)
})
test('a recipe change does not silently reuse an image of the old ingredients',()=>{
 const item=menu.find(item=>item.code==='c-xtudo')
 assert.ok(generatedCatalogImage(item))
 assert.equal(generatedCatalogImage({...item,recipe:item.recipe.filter(row=>row.ingredientId!=='ing-bacon')}),undefined)
 assert.equal(generatedCatalogImage({...item,recipe:item.recipe.map(row=>({...row,qty:row.qty+1}))}),undefined)
 assert.equal(generatedCatalogImage({...item,recipe:[...item.recipe].reverse()}),generatedCatalogImage(item))
 assert.equal(generatedCatalogImage({...item,code:'new-product'}),undefined)
})
test('plain bread and distinct Carijó, linguiça, sausage and broccoli layer assets are packaged',()=>{
 for(const code of ['bread-top-plain','bread-base-plain','layer-frango-desfiado','layer-linguica','layer-salsicha','layer-brocolis']){
  webp('/images/catalog/'+code+'-montagem-v2.webp')
  webp('/images/catalog/'+code+'-montagem-v2-thumb.webp')
 }
})
