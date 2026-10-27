import { test } from 'node:test'
import assert from 'node:assert/strict'
import { themePaletteCatalog, registerCatalogTheme, catalogThemeId, describeThemeColors } from '../src/lib/themePaletteCatalog.ts'

test('occasion and saved promotion with the same ID keep distinct identities and colors', () => {
  const occasion = themePaletteCatalog([]).find(p => p.id === 'natal')
  const saved = {id: 'natal', name: 'Meu Natal', colors: {...occasion.colors, accentVinho:'#123456'}}
  const choices = themePaletteCatalog([saved])
  assert.equal(new Set(choices.map(p => p.key)).size, choices.length)
  const promotion = choices.find(p => p.key === 'promotion:natal')
  assert.notEqual(catalogThemeId(occasion), catalogThemeId(promotion))
  const cards = registerCatalogTheme(registerCatalogTheme([], occasion), promotion)
  assert.equal(cards.length, 2)
  assert.equal(cards[1].colors.accentVinho, '#123456')
})
test('registration preserves the active palette and existing cards without duplicates', () => {
  const choice = themePaletteCatalog([]).find(p => p.id === 'halloween')
  const content = {activeThemeId:'padrao',activeColors:{...choice.colors,accentVinho:'#abcdef'},themePresets:[{id:'padrao',name:'Padrão',colors:choice.colors}]}
  const cards = registerCatalogTheme(content.themePresets, choice)
  const persisted = {...content, themePresets:JSON.parse(JSON.stringify(cards))}
  assert.equal(persisted.activeThemeId, 'padrao')
  assert.equal(persisted.activeColors.accentVinho, '#abcdef')
  assert.equal(persisted.themePresets.length, 2)
  assert.deepEqual(persisted.themePresets[1].colors, choice.colors)
  assert.equal(cards[0], content.themePresets[0])
  assert.notEqual(cards[1].colors, choice.colors)
  assert.equal(registerCatalogTheme(cards, choice), cards)
  cards[1].colors.accentVinho='#112233'
  assert.equal(registerCatalogTheme(cards, choice)[1].colors.accentVinho, '#112233')
  assert.match(describeThemeColors(cards[1].colors), /#112233/)
})
