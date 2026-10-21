import assert from 'node:assert/strict'
import {test} from 'node:test'
import {flavorQuantityLines,drinkUnitCount,validDrinkFlavor} from '../src/lib/beverages.ts'
import {customerMetrics,csvCell} from '../src/lib/crmMetrics.ts'
import {pointInPolygon,polygonsOverlap,readNeighborhoodGeoJSON} from '../src/lib/deliveryAreas.ts'
test('independent flavor quantities charge every unit and omit zero selections',()=>{
 const counts={'Maracujá':2,'Goiaba':1,'Caju':0}
 const lines=flavorQuantityLines('juice',counts)
 assert.equal(lines.length,2);assert.equal(drinkUnitCount(counts),3)
 assert.equal(lines.reduce((n,l)=>n+8*l.qty,0),24)
 assert.equal(lines.find(l=>l.beverageFlavor==='Maracujá').qty,2)
 assert.equal(lines.find(l=>l.beverageFlavor==='Goiaba').qty,1)
 assert.equal(new Set(lines.map(l=>l.cartLineId)).size,2)
 assert.equal(flavorQuantityLines('juice',{'Caju':-1,'Laranja':1.5,'Goiaba':31}).length,0)
 assert.equal(validDrinkFlavor({name:'Suco natural'},'Laranja com Acerola'),true)
})
test('CRM normalizes phones, excludes cancelled sales and computes spend and inactivity',()=>{
 const orders=[{customerPhone:'12999999999',total:100,created:'2026-10-01',status:'Finalizado'},{customerPhone:'(12) 99999-9999',total:50,created:'2026-10-03',status:'Finalizado'},{customerPhone:'12999999999',total:999,status:'Cancelado'},{customerPhone:'12888888888',total:999,status:'Finalizado'}]
 const m=customerMetrics({phone:'(12)99999-9999'},orders,30,500,Date.parse('2026-10-10'))
 assert.equal(m.count,2);assert.equal(m.total,150);assert.equal(m.average,75);assert.equal(m.segment,'Recorrente')
 assert.equal(customerMetrics({phone:'12999999999'},orders,5,500,Date.parse('2026-10-10')).segment,'Inativo')
 assert.equal(customerMetrics({phone:''},orders).count,0)
 assert.equal(csvCell('=cmd'),'"\'=cmd"');assert.equal(csvCell('a"b'),'"a""b"')
})
test('neighborhood polygons select coverage even when no vertices fall inside the area',()=>{
 const a=[[0,1],[4,1],[4,2],[0,2]],b=[[1,0],[2,0],[2,4],[1,4]]
 assert.equal(polygonsOverlap(a,b),true);assert.equal(pointInPolygon([1.5,1.5],a),true);assert.equal(pointInPolygon([8,8],a),false)
 const rows=readNeighborhoodGeoJSON({type:'FeatureCollection',features:[{properties:{nome:'Centro'},geometry:{type:'Polygon',coordinates:[[[1,0],[2,0],[2,4],[1,4],[1,0]]]}}]})
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Centro');assert.deepEqual(rows[0].polygon[0],[0,1]);assert.equal(rows[0].fee,0)
 assert.throws(()=>readNeighborhoodGeoJSON({}),/GeoJSON/)
})
