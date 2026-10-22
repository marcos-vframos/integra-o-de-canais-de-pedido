export type RoadPoint={lat:number;lng:number}
export type RoadRoute={distanceKm:number;durationMinutes:number;delayMinutes:number|null;provider:'OSRM'|'TomTom';traffic:'unavailable'|'live';profile:'car'|'motorcycle';calculatedAt:string;geometry?:[number,number][];accessMeters?:number;warnings:string[]}
export const validRoadPoint=(p:any):p is RoadPoint=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=-23.2&&p.lat<=-22.6&&p.lng>=-45.9&&p.lng<=-45.1
export function routeNumbers(distance:number,duration:number){
 if(!Number.isFinite(distance)||distance<0||!Number.isFinite(duration)||duration<0)throw Error('O serviço não retornou um trajeto viário válido.')
 return {distanceKm:distance/1000,durationMinutes:duration/60}
}
const routeBase=(distance:number,duration:number):RoadRoute=>({...routeNumbers(distance,duration),delayMinutes:null,provider:'OSRM',traffic:'unavailable',profile:'car',calculatedAt:new Date().toISOString(),warnings:['Tempo estimado pelo perfil das vias, sem trânsito ao vivo.','O trajeto segue a malha viária cadastrada; confirme acessos locais e restrições para moto.']})
export function parseOsrmRoute(data:any):RoadRoute{
 const route=data?.routes?.[0]
 if(data?.code!=='Ok'||!route)throw Error('Trajeto viário não encontrado. Revise o ponto no mapa.')
 const access=Math.max(...(data.waypoints||[]).map((p:any)=>Number(p.distance)||0),0)
 if(access>500)throw Error('Ponto distante da via acessível. Ajuste as coordenadas do bairro.')
 const geometry=route.geometry?.coordinates?.map((p:number[])=>[p[1],p[0]])
 return {...routeBase(route.distance,route.duration),geometry,accessMeters:access}
}
export function parseOsrmMatrix(data:any,count:number):(RoadRoute|null)[]{
 if(data?.code!=='Ok')throw Error('Não foi possível calcular os trajetos pelas vias.')
 return Array.from({length:count},(_,i)=>{
  const d=data.distances?.[0]?.[i],t=data.durations?.[0]?.[i]
  if(d===null||t===null||!Number.isFinite(d)||!Number.isFinite(t)||(data.sources?.[0]?.distance||0)>500||(data.destinations?.[i]?.distance||0)>500)return null
  return routeBase(d,t)
 })
}
export function parseTomtomRoute(data:any):RoadRoute{
 const route=data?.routes?.[0],summary=route?.summary
 if(!summary)throw Error('O serviço de trânsito não encontrou um trajeto disponível.')
 const delay=summary.trafficDelayInSeconds
 return {...routeNumbers(summary.lengthInMeters,summary.travelTimeInSeconds),delayMinutes:Number.isFinite(delay)?delay/60:null,provider:'TomTom',traffic:'live',profile:'motorcycle',calculatedAt:new Date().toISOString(),geometry:(route.legs||[]).flatMap((leg:any)=>(leg.points||[]).map((p:any)=>[p.latitude,p.longitude])),warnings:['Trânsito, velocidades típicas e interdições conforme cobertura do provedor.','Sem garantia de inventário completo ou tempo exato de cada semáforo, radar ou ocorrência.']}
}
let queue:Promise<unknown>=Promise.resolve(),lastOsrm=0
async function osrmFetch(url:string,fetcher:typeof fetch){
 const task=queue.catch(()=>{}).then(async()=>{
  const delay=1100-(Date.now()-lastOsrm);if(delay>0)await new Promise(r=>setTimeout(r,delay))
  lastOsrm=Date.now()
  const response=await fetcher(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'LoyolasDelivery/1.0 (+https://integracao-de-canais-de-pedido.vercel.app)','Accept':'application/json'}})
  if(!response.ok)throw Error('Serviço de rotas indisponível. Tente novamente.')
  return response.json()
 });queue=task;return task
}
const cache=new Map<string,{expires:number;value:any}>()
async function cached<T>(key:string,ttl:number,run:()=>Promise<T>):Promise<T>{
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.value
 const value=await run();if(cache.size>400)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+ttl,value});return value
}
export async function roadRoute(origin:RoadPoint,destination:RoadPoint,options:{fetcher?:typeof fetch;tomtomKey?:string;traffic?:boolean}={}):Promise<RoadRoute>{
 if(!validRoadPoint(origin)||!validRoadPoint(destination))throw Error('Coordenadas fora da região de atendimento.')
 const fetcher=options.fetcher||fetch
 if(options.traffic){
  if(!options.tomtomKey)throw Error('Trânsito ao vivo não configurado. É necessária uma chave TomTom Routing no servidor.')
  const key='live:'+JSON.stringify([origin,destination])
  return cached(key,120000,async()=>{
   const q=new URLSearchParams({key:options.tomtomKey!,traffic:'true',departAt:'now',travelMode:'motorcycle',routeType:'fastest',computeTravelTimeFor:'all',routeRepresentation:'polyline'})
   const response=await fetcher(`https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?${q}`,{signal:AbortSignal.timeout(15000)})
   if(!response.ok)throw Error('A consulta de trânsito não foi autorizada ou está indisponível. Confira a integração.')
   return parseTomtomRoute(await response.json())
  })
 }
 return cached('route:'+JSON.stringify([origin,destination]),600000,async()=>parseOsrmRoute(await osrmFetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=simplified&geometries=geojson&steps=false&radiuses=500;500`,fetcher)))
}
export async function roadMatrix(origin:RoadPoint,targets:RoadPoint[],fetcher:typeof fetch=fetch):Promise<(RoadRoute|null)[]>{
 if(!validRoadPoint(origin)||!targets.length||targets.length>50||targets.some(p=>!validRoadPoint(p)))throw Error('Selecione de 1 a 50 pontos válidos da região.')
 return cached('matrix:'+JSON.stringify([origin,targets]),600000,async()=>{
  const coordinates=[origin,...targets].map(p=>`${p.lng},${p.lat}`).join(';')
  const destinations=targets.map((_,i)=>i+1).join(';')
  const data=await osrmFetch(`https://routing.openstreetmap.de/routed-car/table/v1/driving/${coordinates}?sources=0&destinations=${destinations}&annotations=distance,duration`,fetcher)
  return parseOsrmMatrix(data,targets.length)
 })
}
