import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isBeverage, hasSodaFlavor, SODA_FLAVORS, validSodaFlavor } from '../src/lib/beverages.ts'
test('six flavors are offered without allowing arbitrary values', () => {
  assert.equal(SODA_FLAVORS.length, 6)
  for (const flavor of SODA_FLAVORS) assert.equal(validSodaFlavor(flavor), true)
  assert.equal(validSodaFlavor(''), false)
  assert.equal(validSodaFlavor('Carne'), false)
})
test('drinks are distinct from sandwiches; only soda and soda combos select flavor', () => {
  assert.equal(isBeverage({ category:'Bebidas',name:'Água Mineral' }), true)
  assert.equal(hasSodaFlavor({ category:'Bebidas',name:'Água Mineral' }), false)
  assert.equal(hasSodaFlavor({ category:'Bebidas',name:'Suco Tropical' }), false)
  assert.equal(hasSodaFlavor({ category:'Bebidas',name:'Refrigerante Lata' }), true)
  assert.equal(hasSodaFlavor({ category:'Combos',name:'Combo + Refri 1L' }), true)
  assert.equal(isBeverage({ category:'Carnes',name:'X-Tudo' }), false)
})
