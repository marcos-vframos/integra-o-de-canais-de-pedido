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
