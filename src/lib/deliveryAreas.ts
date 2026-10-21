export type Point = [number, number]
export const zoneMeta=(description?:string):any=>{try{return JSON.parse(description||'{}')}catch{return {}}}
export function pointInPolygon([lat,lng]:Point,poly:Point[]):boolean {
 if(!Array.isArray(poly)||poly.length<3)return false
 let hit=false
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [yi,xi]=poly[i], [yj,xj]=poly[j]
  const cross=(yi>lat)!==(yj>lat)
  if(cross&&lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)hit=!hit
 }
 return hit
}
export function polygonsOverlap(a:Point[],b:Point[]):boolean {
 if(a.some(p=>pointInPolygon(p,b))||b.some(p=>pointInPolygon(p,a)))return true
 const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length]
  if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return true
 }
 return false
}
export type Neighborhood={id?:string;name:string;fee:number;lat:number;lng:number;polygon?:Point[]}
export function readNeighborhoodGeoJSON(data:any):Neighborhood[] {
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Importe um GeoJSON de bairros (FeatureCollection).')
 return data.features.flatMap((f:any)=>{
  const name=f.properties?.name||f.properties?.nome||f.properties?.NOME||f.properties?.BAIRRO||f.properties?.bairro
  const g=f.geometry, rings=g?.type==='Polygon'?[g.coordinates[0]]:g?.type==='MultiPolygon'?g.coordinates.map((p:any)=>p[0]):[]
  return rings.flatMap((ring:any)=>{
   if(!name||!Array.isArray(ring)||ring.length<4)return []
   const polygon:Point[]=ring.map((p:number[])=>[Number(p[1]),Number(p[0])])
   if(polygon.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90||Math.abs(p[1])>180))return []
   const lat=polygon.reduce((n,p)=>n+p[0],0)/polygon.length,lng=polygon.reduce((n,p)=>n+p[1],0)/polygon.length
   return [{name:String(name),fee:0,lat,lng,polygon}]
  })
 })
}
