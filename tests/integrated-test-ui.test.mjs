import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const shop=readFileSync(new URL('../src/pages/LojaPublica.tsx',import.meta.url),'utf8')
test('checkout no longer stops at the old local draft warning',()=>{assert.equal(shop.includes('nenhum pedido nem pagamento real será registrado'),false);assert.ok(shop.includes("'/backend/v1/orders/finalize'"))})
test('integrated test mode hides real Pix generation and checkout QR display',()=>{assert.match(shop,/const pixEMV = useMemo\(\(\) => \{\s*if \(integrationTestMode\) return ''/);assert.match(shop,/const pixQrCodeUrl = useMemo\(\(\) => \{\s*if \(integrationTestMode\) return ''/);assert.ok(shop.includes("payment === 'Pix' && !integrationTestMode &&"));assert.ok(shop.includes("payment === 'Pix' && !integrationTestMode ? pixKey : undefined"))})
