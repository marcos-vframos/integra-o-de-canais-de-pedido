import { test } from 'node:test'
import assert from 'node:assert/strict'
import { themePaletteCatalog, registerCatalogTheme, catalogThemeId, describeThemeColors, isCatalogThemeRegistered } from '../src/lib/themePaletteCatalog.ts'
import { duplicateThemePreset,THEME_COLOR_FIELDS } from '../src/lib/themePaletteCatalog.ts'
import { APPROVED_THEME_PRESETS } from '../src/lib/approvedThemePalettes.ts'

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
  const content = {activeThemeId:'padrao',activeColors:{...choice.colors,accentVinho:'#abcdef'},themePresets:[{id:'padrao',name:'Padrão',colors:{...choice.colors,bgPrimary:'#000000'}}]}
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
test('existing manually named cards with the same palette are not duplicated', () => {
  const halloween = themePaletteCatalog([]).find(p => p.id === 'halloween')
  const cards = [{id:'old_manual_id',name:'Halloween',colors:{...halloween.colors,bgPrimary:halloween.colors.bgPrimary.toLowerCase()}}]
  assert.equal(isCatalogThemeRegistered(cards,halloween),true)
  assert.equal(registerCatalogTheme(cards,halloween),cards)
  const changed = {...halloween,colors:{...halloween.colors,accentSilver:'#ffffff'}}
  assert.equal(isCatalogThemeRegistered(cards,changed),false)
})
test('all thirty approved themes have distinct IDs and complete valid color sets',()=>{
 assert.equal(APPROVED_THEME_PRESETS.length,30)
 assert.equal(new Set(APPROVED_THEME_PRESETS.map(p=>p.id)).size,30)
 for(const p of APPROVED_THEME_PRESETS)for(const f of THEME_COLOR_FIELDS)assert.match(p.colors[f.key],/^#[0-9a-f]{6}$/i)
})
test('editing a duplicate preserves the original palette and all existing cards',()=>{
 const original=APPROVED_THEME_PRESETS[0],colors={...original.colors,accentVinho:'#123456'}
 const next=duplicateThemePreset([original],original,'  Minha versão  ',colors,'new-123')
 assert.equal(next.length,2);assert.equal(next[0],original);assert.equal(next[1].name,'Minha versão');assert.notEqual(next[1].colors,colors)
 assert.notEqual(next[0].colors.accentVinho,next[1].colors.accentVinho)
 assert.throws(()=>duplicateThemePreset(next,original,'',colors,'new-2'))
 assert.throws(()=>duplicateThemePreset(next,original,'Outra',colors,'new-123'))
})
