import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source = ts.transpileModule(readFileSync(new URL('../src/lib/campaignDisplay.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
})
assert.equal(source.diagnostics?.length || 0, 0)
const context = { exports: {}, URL }
vm.runInNewContext(source.outputText, context)
const { isCampaignLive, campaignDestination, campaignMediaIsVideo } = context.exports
const now = Date.parse('2026-10-20T18:00:00Z')

test('all active campaigns in the current period are eligible, even without a product', () => {
  const campaigns = [
    { id: 'one', title: 'One', active: true },
    { id: 'two', title: 'Two', active: true, startDate: '2026-10-19T18:00:00Z', endDate: '2026-10-21T18:00:00Z' },
    { id: 'inactive', title: 'Inactive', active: false },
    { id: 'future', title: 'Future', active: true, startDate: '2026-10-31T18:00:00Z' },
    { id: 'expired', title: 'Expired', active: true, endDate: '2026-10-19T18:00:00Z' },
  ]
  assert.deepEqual(campaigns.filter(item => isCampaignLive(item, now)).map(item => item.id), ['one','two'])
})
test('campaign dates are inclusive and invalid dates do not publish campaigns', () => {
  assert.equal(isCampaignLive({ active: true, startDate: '2026-10-20T18:00:00Z', endDate: '2026-10-20T18:00:00Z' }, now), true)
  assert.equal(isCampaignLive({ active: true, endDate: 'invalid' }, now), false)
})
test('unsafe campaign links cannot leave the customer on script or protocol-relative URLs', () => {
  for (const url of ['javascript:alert(1)', '//example.com', 'data:text/html,test', 'http://example.com', 'invalid']) {
    assert.equal(campaignDestination(url), '#cardapio')
  }
})
test('valid destinations and legacy integrated-menu anchors work', () => {
  assert.equal(campaignDestination('#fazer-pedido'), '#cardapio')
  assert.equal(campaignDestination(''), '#cardapio')
  assert.equal(campaignDestination('/loja'), '/loja')
  assert.equal(campaignDestination('#cardapio'), '#cardapio')
  assert.equal(campaignDestination('https://example.com/offer'), 'https://example.com/offer')
})
test('video media including signed URLs are identified', () => {
  assert.equal(campaignMediaIsVideo('https://example.com/offer.mp4?token=test'), true)
  assert.equal(campaignMediaIsVideo('https://example.com/offer.webm'), true)
  assert.equal(campaignMediaIsVideo('https://example.com/offer.jpg'), false)
})

test('opening campaign honors the saved selection without publishing inactive, scheduled or deleted campaigns', () => {
  const select = context.exports.selectOpeningCampaign
  const first = { id: 'first', active: true }
  const primary = { id: 'primary', active: true }
  assert.equal(select([first, primary], 'primary', now).id, 'primary')
  assert.equal(select([first, { ...primary, active: false }], 'primary', now).id, 'first')
  assert.equal(select([first, { ...primary, startDate: '2026-10-31' }], 'primary', now).id, 'first')
  assert.equal(select([first], 'deleted', now).id, 'first')
  assert.equal(select([], 'primary', now), null)
})
