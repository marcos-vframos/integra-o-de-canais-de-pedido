import type {RoadPoint,RoadRoute} from './roadRouting.ts'
export type FeeReference={id:string;name:string;fee:number|null;lat:number;lng:number;description?:string}
export function metadata(value?:string):any{try{let x=JSON.parse(value||'{}');if(typeof x==='string')x=JSON.parse(x);return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
function contains(p:RoadPoint,ring:number[][]):boolean{
 if(!Array.isArray(ring)||ring.length<3)return false
 let inside=false
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [yi,xi]=ring[i],[yj,xj]=ring[j]
  if((yi>p.lat)!==(yj>p.lat)&&p.lng<(xj-xi)*(p.lat-yi)/(yj-yi)+xi)inside=!inside
 }return inside
}
function squaredDistance(p:RoadPoint,row:FeeReference){return (p.lat-row.lat)**2+((p.lng-row.lng)*Math.cos(p.lat*Math.PI/180))**2}
export function selectFeeReference(fees:FeeReference[],destination?:RoadPoint,name?:string):FeeReference{
 let candidates=fees
 if(destination){
  candidates=fees.filter(f=>Number.isFinite(Number(f.lat))&&Number.isFinite(Number(f.lng)))
  const priority=(f:FeeReference)=>contains(destination,metadata(f.description).polygon)?0:contains(destination,metadata(f.description).zonePolygon)?1:2
  candidates.sort((a,b)=>priority(a)-priority(b)||squaredDistance(destination,a)-squaredDistance(destination,b))
 }else candidates=fees.filter(f=>f.name===name)
 const row=candidates[0]
 if(!row)throw Error('Selecione uma região de entrega cadastrada.')
 if(row.fee===null)throw Error('Taxa de entrega ainda não cadastrada para '+row.name)
 return row
}
export function feeForRoadRoute(reference:FeeReference,route:RoadRoute):number{
 if(reference.fee===null)throw Error('Taxa de entrega pendente.')
 if(metadata(reference.description).fixedFee||metadata(reference.description).polygon?.length||metadata(reference.description).zonePolygon?.length)return Number(reference.fee)
 return route.distanceKm>3?Math.round((Number(reference.fee)+(route.distanceKm-3)*1.5)*2)/2:Number(reference.fee)
}
