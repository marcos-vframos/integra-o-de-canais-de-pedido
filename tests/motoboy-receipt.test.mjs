import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fmtBRL, padTicket } from '../src/lib/seeds.ts'

const source = readFileSync(new URL('../src/components/ReceiptModal.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.React, esModuleInterop: true,
} })
function render(ticket, mode = 'kitchen') {
  const context = { exports: {}, require(name) {
    if (name === 'react') return mode === 'customer' ? { ...React, useState: () => ['customer', () => {}] } : React
    if (name === 'lucide-react') return { X: () => null, Printer: () => null, Receipt: () => null, FileText: () => null }
    if (name === '@/lib/seeds') return { fmtBRL, padTicket }
    throw new Error('Unexpected import: ' + name)
  } }
  vm.runInNewContext(outputText, context)
  return renderToStaticMarkup(React.createElement(context.exports.ReceiptModal, {
    ticket, storeName: 'Loja Teste', onClose() {}, onPrint() {},
  }))
}
const delivery = {
  id: 'test-only', ticketNumber: 42, deliveryType: 'entrega', total: 25, payment: 'Pix',
  customerName: 'Cliente <Teste>', customerPhone: '(12) 90000-0000',
  customerAddress: 'Rua de Teste, 123 — Bairro — Casa dos fundos',
  items: [{ name: 'Lanche teste', qty: 1, price: 25 }], created: '2026-10-27T18:00:00Z',
}
test('delivery kitchen receipt includes a self-contained courier slip with two writing lines', () => {
  const html = render(delivery)
  const slip = html.match(/<section aria-label="Via do motoboy"[^>]*>([\s\S]*?)<\/section>/)?.[1]
  assert.ok(slip)
  for (const value of ['COMANDA #0042', 'Cliente &lt;Teste&gt;', delivery.customerPhone, delivery.customerAddress, 'Forma de pagamento:', 'Pix']) assert.ok(slip.includes(value), value)
  assert.equal((slip.match(/border-bottom:1px solid #000/g) || []).length, 2)
  assert.ok(html.includes('break-inside:avoid'))
  assert.ok(html.includes('Lanche teste'))
})
test('pickup, counter and customer receipts do not include the courier slip', () => {
  for (const ticket of [{ ...delivery, deliveryType: 'retirada' }, { ...delivery, deliveryType: undefined }]) assert.ok(!render(ticket).includes('VIA DO MOTOBOY'))
  assert.ok(!render(delivery, 'customer').includes('VIA DO MOTOBOY'))
})
test('missing customer information stays explicit on delivery slips', () => {
  const html = render({ ...delivery, customerName: '', customerPhone: '', customerAddress: '' })
  const slip = html.match(/<section aria-label="Via do motoboy"[^>]*>([\s\S]*?)<\/section>/)?.[1]
  assert.equal((slip.match(/Não informado/g) || []).length, 3)
})
