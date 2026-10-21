import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {voucherDiscount} from '../src/lib/voucherPricing.ts'
import {readNeighborhoodGeoJSON,polygonsOverlap} from '../src/lib/deliveryAreas.ts'
test('coupon preview matches target, quantity, cap, percentages and free delivery',()=>{
 const lines=[{productId:'burger',total:26},{productId:'drink',total:4}]
 assert.equal(voucherDiscount({type:'product_discount',targetProductId:'burger',discountAmount:5},lines,0),5)
 assert.equal(voucherDiscount({type:'product_discount',targetProductId:'other',discountAmount:5},lines,0),0)
 assert.equal(voucherDiscount({type:'product_discount',targetProductId:'drink',discountAmount:5},lines,0),4)
 assert.equal(voucherDiscount({type:'product_discount',discountAmount:40},lines,0),30)
 assert.equal(voucherDiscount({type:'product_discount',targetProductId:'burger',discountPercent:50},lines,0),13)
 assert.equal(voucherDiscount({type:'voucher_10',discountPercent:15},lines,0),4.5)
 assert.equal(voucherDiscount({type:'free_delivery'},lines,12),12)
 assert.equal(voucherDiscount(null,lines,12),0)
})
test('bundled city map contains 42 unique real boundaries and central area intersects multiple neighborhoods',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/data/pindamonhangaba-bairros.geojson',import.meta.url),'utf8'))
 const rows=readNeighborhoodGeoJSON(data)
 assert.equal(rows.length,42);assert.equal(new Set(rows.map(r=>r.name)).size,42)
 for(const r of rows)assert.ok(r.polygon.every(([lat,lng])=>lat>-23.1&&lat<-22.8&&lng>-45.6&&lng<-45.2))
 const names=rows.filter(r=>polygonsOverlap([[-22.907,-45.468],[-22.907,-45.45],[-22.93,-45.45],[-22.93,-45.468]],r.polygon)).map(r=>r.name)
 for(const name of ['Centro','Tabaú','São Benedito','Vila Nair'])assert.ok(names.includes(name),name)
 assert.ok(names.length>=4)
})
