import { test } from 'node:test'
import assert from 'node:assert/strict'
import { productCaption, preparationLabel, menuOrder } from '../src/lib/productPresentation.ts'
import { extraUnitPrice, lineUnitTotal } from '../src/lib/orderCustomization.ts'
test('preparation captions respect category and beverage volume',()=>{
 for(const category of ['Carnes','Frango','Gourmet','Especial']) assert.equal(preparationLabel({name:'Item',category}),'Feito na chapa')
 for(const category of ['Bebidas','Combos','Hot-Dog']) assert.notEqual(preparationLabel({name:'Item',category}),'Feito na chapa')
 assert.match(productCaption({name:'Refrigerante 600ml',category:'Bebidas'}),/600 ml/)
 assert.match(productCaption({name:'Água Mineral 500ml',category:'Bebidas'}),/500 ml/)
 assert.equal(menuOrder([{code:'g-a',name:'A'},{code:'e-especialgourmet',name:'Especial Gourmet'}])[0].code,'e-especialgourmet')
})
test('registered ingredient prices replace arbitrary three-real defaults',()=>{
 const stock = [{code:'ing-file-frango',name:'Filé'},{code:'ing-queijo',name:'Queijo'}]
 const resolve=id=>stock.find(s=>s.code===id)
 const menu = [{code:'x-file',category:'Complementos',name:'Filé',price:10,recipe:[{ingredientId:'ing-file-frango',qty:1}]},{code:'x-queijo',category:'Complementos',name:'Queijo',price:4,recipe:[{ingredientId:'ing-queijo',qty:1}]}]
 assert.equal(extraUnitPrice('ing-file-frango',resolve,menu),10)
 assert.equal(extraUnitPrice('ing-queijo',resolve,menu),4)
 assert.equal(extraUnitPrice('ing-refri-1l',resolve,menu),0)
 assert.equal(lineUnitTotal({price:20,recipe:[]},{added:[{ingredientId:'ing-file-frango',qty:2}]},resolve,menu),40)
 assert.equal(lineUnitTotal({price:10,recipe:[]},{added:[]},resolve,menu)*3,30)
})

test('all active priced ingredient add-ons are available outside the sandwich recipe',async()=>{
 const {availableIngredientExtras}=await import('../src/lib/orderCustomization.ts')
 const stock=[{id:'a',code:'ing-ovo',name:'Ovo',group:'Ingrediente'},{id:'b',code:'ing-file-frango',name:'Frango',group:'Ingrediente'},{id:'p',code:'ing-pao-frances',name:'Pão Francês',group:'Ingrediente'},{id:'d',code:'ing-refri-lata',name:'Refri',group:'Ingrediente'},{id:'x',code:'ing-queijo',name:'Queijo',group:'Ingrediente'}]
 const resolve=id=>stock.find(s=>s.code===id||s.id===id)
 const addon=(key,active=true,price=3)=>({category:'Complementos',active,price,recipe:[{ingredientId:key,qty:1}]})
 const menu=[addon('a'),addon('ing-file-frango'),addon('p'),addon('d'),addon('x',false),addon('x',true,0),addon('ing-ovo')]
 assert.deepEqual(availableIngredientExtras(menu,resolve).map(s=>s.code),['ing-file-frango','ing-ovo'])
 assert.equal(extraUnitPrice('ing-queijo',resolve,menu.filter(m=>!m.active)),0)
})
test('only Max recipes use three standard meats and extras consume ordinary patties',async()=>{
 const {seedMenu,seedStock}=await import('../src/lib/seeds.ts')
 const {accumulateDeductions}=await import('../src/lib/orderCustomization.ts')
 const menu=seedMenu(),stock=seedStock();const resolve=id=>stock.find(s=>s.code===id)
 const max=menu.filter(p=>p.code==='c-max'||p.code.startsWith('c-xmax'))
 assert.equal(max.length,8)
 for(const item of max){assert.equal(item.recipe.find(r=>r.ingredientId==='ing-hamburguer').qty,3);assert.equal(item.recipe.some(r=>r.ingredientId==='ing-carne-max'),false)}
 assert.equal(menu.find(p=>p.code==='c-xburguer').recipe.find(r=>r.ingredientId==='ing-hamburguer').qty,1)
 const use={};accumulateDeductions(use,{qty:2,removed:[],added:[{ingredientId:'ing-hamburguer',qty:1}]},max[0],resolve)
 assert.equal(use['ing-hamburguer'],8);assert.equal(use['ing-carne-max'],undefined)
})
test('bacon and calabresa extras use owner prices and deduct each ordered portion',async()=>{
 const {seedMenu,seedStock}=await import('../src/lib/seeds.ts')
 const {accumulateDeductions,availableIngredientExtras}=await import('../src/lib/orderCustomization.ts')
 const menu=seedMenu(),stock=seedStock(),resolve=id=>stock.find(s=>s.code===id)
 const sandwich=menu.find(p=>p.code==='c-xmaxtudo')
 for(const code of ['ing-bacon','ing-calabresa']) {
  assert.equal(extraUnitPrice(code,resolve,menu),8)
  assert.ok(availableIngredientExtras(menu,resolve).some(s=>s.code===code))
 }
 const line={qty:2,removed:[],added:[{ingredientId:'ing-bacon',qty:1},{ingredientId:'ing-calabresa',qty:2}]}
 assert.equal(lineUnitTotal(sandwich,line,resolve,menu),54)
 const use={};accumulateDeductions(use,line,sandwich,resolve)
 assert.equal(use['ing-bacon'],4);assert.equal(use['ing-calabresa'],6)
})
