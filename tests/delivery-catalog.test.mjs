import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const modules={}
function module(name){
 if(modules[name])return modules[name]
 const source=readFileSync(new URL('../src/lib/'+name+'.ts',import.meta.url),'utf8')
 const context={exports:{},require:path=>module(path.replace('./',''))}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
 return modules[name]=context.exports
}
const {resolveDeliveryFee}=module('geoDistance')
const {distanceBand,DEFAULT_DELIVERY_ORIGIN,neighborhoodDescription,deliveryZone}=module('deliveryCatalog')
const catalog=JSON.parse(readFileSync(new URL('../src/data/pinda-neighborhoods.json',import.meta.url),'utf8'))
test('all 130 PDF references are preserved with coordinates and individual zone classifications',()=>{
 assert.equal(catalog.length,130)
 assert.equal(new Set(catalog.map(r=>r.referenceId)).size,130)
 assert.equal(new Set(catalog.map(r=>r.name.toLowerCase())).size,130)
 for(const r of catalog){assert.ok(r.lat< -22&&r.lat> -24);assert.ok(r.lng< -45&&r.lng> -46);assert.ok(['urban','rural','central','district'].includes(r.zoneType))}
 assert.equal(catalog[0].name,'Centro');assert.equal(catalog[129].name,'Malacacheta')
})
test('distance bands include upper boundaries and separate every requested interval',()=>{
 for(const max of [3,5,7,9,11,13,15,17,19,21]){
  assert.equal(distanceBand(max).max,max)
  assert.notEqual(distanceBand(max).color,distanceBand(max+.00001).color)
 }
 assert.equal(distanceBand(21.1).label,'Acima de 21 km')
 assert.equal(distanceBand(NaN).label,'Trajeto não calculado')
})
test('blank price is pending while a deliberately configured zero is a valid free fee',()=>{
 const row={id:'ref',name:'Pendente',fee:null,lat:-22.9,lng:-45.4}
 assert.equal(resolveDeliveryFee(row.lat,row.lng,[row]).pending,true)
 assert.equal(resolveDeliveryFee(row.lat,row.lng,[{...row,fee:0}]).fee,0)
 assert.notEqual(resolveDeliveryFee(row.lat,row.lng,[{...row,fee:0}]).pending,true)
 const polygon=[[-23,-46],[-23,-45],[-22,-45],[-22,-46]]
 assert.equal(resolveDeliveryFee(row.lat,row.lng,[{...row,description:JSON.stringify({polygon})}]).pending,true)
 assert.equal(resolveDeliveryFee(row.lat,row.lng,[{...row,fee:9}]).fee,9)
})
test('editing zone preserves legacy polygons and area membership even for double-encoded descriptions',()=>{
 const metadata={zoneId:'area',zonePolygon:[[-23,-46],[-23,-45],[-22,-45]],fixedFee:true}
 const description=neighborhoodDescription({name:'Centro',fee:null,lat:-22.9,lng:-45.4,description:JSON.stringify(JSON.stringify(metadata))},{zoneType:'central'})
 const parsed=JSON.parse(description)
 assert.equal(parsed.zoneId,'area');assert.deepEqual(parsed.zonePolygon,metadata.zonePolygon)
 assert.equal(deliveryZone({description}),'central')
})
