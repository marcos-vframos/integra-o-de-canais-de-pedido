import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seedMenu } from '../src/lib/seeds.ts'
import { menuSubcategories, menuSubcategory, currentMenuSubcategory, matchesMenuSubcategory } from '../src/lib/menuSubcategories.ts'

const approved = {
 Tradicionais: ['Americano','Bauru','Hambúrguer','Misto Quente','X-Burguer','X-Salada','X-Egg','X-Calabresa','X-Calabresa Egg','X-Bacon','X-Bacon Egg','X-Tudo'],
 Max: ['Max','X Max','X Max Egg','X Max Calabresa','X Max Calabresa Egg','X Max Bacon','X Max Bacon Egg','X Max Tudo'],
 'Contra-Filé': ['Contra-Filé','X-Contra-Filé','X-Contra-Filé Egg','X-Contra-Filé Calabresa','X-Contra-Filé Calabresa Egg','X-Contra-Filé Bacon','X-Contra-Filé Bacon Egg','X-Contra-Filé Tudo'],
 Filé: ['Filé','X-Filé','X-Filé Egg','X-Filé Calabresa','X-Filé Calabresa Egg','X-Filé Bacon','X-Filé Bacon Egg','X-Filé Tudo'],
 Carijó: ['Carijó','X-Carijó','X-Carijó Egg','X-Carijó Calabresa','X-Carijó Calabresa Egg','X-Carijó Bacon','X-Carijó Bacon Egg','X-Carijó Tudo'],
}
test('all 44 approved sandwiches appear exactly once in their approved subdivision', () => {
 const menu = seedMenu(), before = JSON.stringify(menu)
 const sandwiches = menu.filter(item => ['Carnes','Frango'].includes(item.category))
 assert.equal(sandwiches.length, 44)
 for (const [group, names] of Object.entries(approved)) {
  const matches = sandwiches.filter(item => matchesMenuSubcategory(item, group))
  assert.deepEqual(matches.map(item => item.name).sort(), [...names].sort(), group)
 }
 for (const item of sandwiches) assert.equal(menuSubcategories(item.category).filter(group => matchesMenuSubcategory(item, group)).length, 1)
 assert.equal(JSON.stringify(menu), before)
})
test('parent category transitions select a valid default and other categories remain unfiltered', () => {
 assert.deepEqual(menuSubcategories('Carnes'), ['Tradicionais','Max','Contra-Filé'])
 assert.deepEqual(menuSubcategories('Frango'), ['Filé','Carijó'])
 assert.equal(currentMenuSubcategory('Frango','Max'), 'Filé')
 assert.equal(currentMenuSubcategory('Carnes','Carijó'), 'Tradicionais')
 assert.equal(currentMenuSubcategory('Carnes','Max'), 'Max')
 assert.equal(currentMenuSubcategory('Bebidas','Max'), '')
 for (const item of seedMenu().filter(item => !['Carnes','Frango'].includes(item.category))) {
  assert.equal(menuSubcategory(item), '')
  assert.equal(matchesMenuSubcategory(item, currentMenuSubcategory(item.category, 'Max')), true)
 }
})
test('accent and case variations do not change the correct line', () => {
 assert.equal(menuSubcategory({category:'Carnes',name:'X CONTRA FILE',code:''}), 'Contra-Filé')
 assert.equal(menuSubcategory({category:'Frango',name:'X CARIJO',code:''}), 'Carijó')
 assert.equal(menuSubcategory({category:'Carnes',name:'Nome editado',code:'c-xmaxtudo'}), 'Max')
})
