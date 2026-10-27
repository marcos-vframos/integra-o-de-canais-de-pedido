import {useEffect,useRef,useState} from 'react'
import pb,{demoGestaoMode} from '@/lib/pocketbase/client'
import referenceCatalog from '@/data/pinda-neighborhoods.json'
import {pointInPolygon,polygonsOverlap,readNeighborhoodGeoJSON,zoneMeta,type Point,type Neighborhood} from '@/lib/deliveryAreas'
import {DELIVERY_ZONES,DISTANCE_BANDS,DEFAULT_DELIVERY_ORIGIN,deliveryZone,distanceBand,neighborhoodDescription,normalizeNeighborhood,validCoordinates,newDeliveryLocation,type DeliveryOrigin,type DeliveryZoneType} from '@/lib/deliveryCatalog'
import {loadRoutingCapabilities,loadRoadRoute,loadRoadMatrix,routePointKey,type RoadRoute} from '@/lib/deliveryRouting'
import {fmtBRL} from '@/lib/seeds'
type Saved=Neighborhood&{id:string;description?:string}
let leaflet:Promise<any>|undefined
function loadLeaflet(){
 if((window as any).L)return Promise.resolve((window as any).L)
 if(!leaflet)leaflet=new Promise((resolve,reject)=>{
  if(!document.getElementById('leaflet-css')){const css=document.createElement('link');css.id='leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css)}
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=()=>resolve((window as any).L);script.onerror=()=>{leaflet=undefined;script.remove();reject(Error('Mapa indisponível. Feche e abra novamente.'))};document.head.appendChild(script)
 })
 return leaflet
}
export default function DeliveryFeeZones(){
 const canEdit=pb.authStore.hasSession
 const [preview,setPreview]=useState(false)
 const [saved,setSaved]=useState<Saved[]>([]),[rows,setRows]=useState<Saved[]>([]),[open,setOpen]=useState(false),[catalog,setCatalog]=useState<Neighborhood[]>([])
 const [origin,setOrigin]=useState<DeliveryOrigin>(DEFAULT_DELIVERY_ORIGIN),[originRecord,setOriginRecord]=useState(''),[originLat,setOriginLat]=useState(String(DEFAULT_DELIVERY_ORIGIN.lat)),[originLng,setOriginLng]=useState(String(DEFAULT_DELIVERY_ORIGIN.lng))
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(0),[selected,setSelected]=useState(''),[query,setQuery]=useState(''),[typeFilter,setTypeFilter]=useState('all'),[distanceFilter,setDistanceFilter]=useState('all')
 const [draw,setDraw]=useState(false),[points,setPoints]=useState<Point[]>([]),[areaName,setAreaName]=useState(''),[areaOnly,setAreaOnly]=useState(false),[pickOrigin,setPickOrigin]=useState(false),[dirty,setDirty]=useState<string[]>([])
 const [routes,setRoutes]=useState<Record<string,RoadRoute|null>>({}),[routeBusy,setRouteBusy]=useState(false),[routeStatus,setRouteStatus]=useState(''),[liveTraffic,setLiveTraffic]=useState(false),[routeLine,setRouteLine]=useState<RoadRoute|null>(null)
 const routeRequest=useRef(0)
 const routeKm=(row:Saved)=>routes[routePointKey(row)]?.distanceKm??NaN
 const [newName,setNewName]=useState(''),[newLat,setNewLat]=useState(''),[newLng,setNewLng]=useState(''),[newFee,setNewFee]=useState(''),[newZone,setNewZone]=useState<DeliveryZoneType>('urban'),[pickNew,setPickNew]=useState(false),[newFormOpen,setNewFormOpen]=useState(false)
 const mapEl=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),markersRef=useRef<Record<string,any>>({}),modes=useRef({draw:false,pickOrigin:false,pickNew:false})
 modes.current={draw,pickOrigin,pickNew}
 const chooseNewPoint=(p:Point)=>{setNewLat(p[0].toFixed(6));setNewLng(p[1].toFixed(6));setPickNew(false);setNewFormOpen(true);setStatus('Ponto marcado. Informe o nome e a taxa; depois clique em Salvar local e taxa.')}
 const load=async()=>{
  const fees=await pb.collection('delivery_fees').getFullList<Saved>({sort:'name'})
  const referenceOnly=!fees.length&&demoGestaoMode&&!pb.authStore.hasSession
  const visible=referenceOnly?referenceCatalog.map(r=>({id:'reference-'+r.referenceId,name:r.name,fee:null,lat:r.lat,lng:r.lng,description:JSON.stringify({zoneType:r.zoneType,classificationStatus:r.classificationStatus,sources:r.sources})})):fees
  setPreview(referenceOnly);setSaved(visible);setRows(visible.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));setDirty([])
 }
 useEffect(()=>{
  void load().catch(e=>setStatus(e.message))
  void loadRoutingCapabilities().then(c=>setLiveTraffic(c.liveTraffic)).catch(()=>{})
  let alive=true
  fetch('/data/pindamonhangaba-bairros.geojson').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(alive)setCatalog(readNeighborhoodGeoJSON(data))}).catch(()=>{if(alive)setStatus('Os pontos dos bairros estão disponíveis, mas não foi possível carregar os limites municipais.')})
  pb.collection('landing_content').getFullList<{id:string;section:string;data:DeliveryOrigin}>().then(list=>{
   if(!alive)return
   const row=list.find(r=>r.section==='delivery_origin'),data=row?.data
   if(row)setOriginRecord(row.id)
   if(data&&validCoordinates(data.lat,data.lng)){setOrigin(data);setOriginLat(String(data.lat));setOriginLng(String(data.lng))}
  }).catch(()=>{})
  return()=>{alive=false}
 },[])
 useEffect(()=>{
  if(!open)return
  let alive=true
  loadLeaflet().then(L=>{
   if(!alive||!mapEl.current)return
   const m=L.map(mapEl.current).setView([origin.lat,origin.lng],12)
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:19}).addTo(m)
   m.on('click',(event:any)=>{
    const p:Point=[event.latlng.lat,event.latlng.lng]
    if(modes.current.pickOrigin){setOriginLat(p[0].toFixed(6));setOriginLng(p[1].toFixed(6));setPickOrigin(false);setStatus('Ponto escolhido. Salve a origem para atualizar as distâncias.');return}
    if(modes.current.pickNew){chooseNewPoint(p);return}
    if(modes.current.draw)setPoints(prev=>[...prev,p])
   })
   mapRef.current=m;setReady(v=>v+1)
  }).catch(e=>setStatus(e.message))
  return()=>{alive=false;mapRef.current?.remove();mapRef.current=null;markersRef.current={}}
 },[open])
 useEffect(()=>{
  const L=(window as any).L,m=mapRef.current;if(!L||!m||!open)return
  const layer=L.layerGroup().addTo(m)
  for(const n of catalog)if(n.polygon?.length)L.polygon(n.polygon,{color:'#94a3b8',weight:1,fillOpacity:.015,interactive:false}).addTo(layer)
  L.circleMarker([origin.lat,origin.lng],{radius:8,color:'#ffffff',weight:3,fillColor:'#18181b',fillOpacity:1}).bindTooltip('Origem: '+origin.name).addTo(layer)
  markersRef.current={}
  for(const row of rows){
   if(!validCoordinates(row.lat,row.lng))continue
   const band=distanceBand(routeKm(row)),zone=DELIVERY_ZONES[deliveryZone(row)]
   const marker=L.circleMarker([row.lat,row.lng],{radius:row.id===selected?9:6,color:zone.color,weight:row.id===selected?4:2,fillColor:band.color,fillOpacity:.9,bubblingMouseEvents:false}).addTo(layer)
   const tip=document.createElement('div');tip.textContent=`${row.name} · ${zone.label} · ${Number.isFinite(routeKm(row))?routeKm(row).toFixed(1)+' km pelas vias':'trajeto não calculado'} · ${row.fee===null?'Valor pendente':fmtBRL(row.fee)}`
   marker.bindTooltip(tip);marker.on('click',()=>{if(modes.current.pickNew){chooseNewPoint([row.lat,row.lng]);return}setSelected(row.id);setQuery(row.name);setAreaOnly(false);setTypeFilter('all');setDistanceFilter('all')});markersRef.current[row.id]=marker;if(row.id===selected)marker.openTooltip()
  }
  return()=>layer.remove()
 },[open,ready,rows,catalog,origin,selected,routes])
 useEffect(()=>{
  const L=(window as any).L,m=mapRef.current;if(!L||!m||!open||!points.length)return
  const layer=L.polygon(points,{color:'#e10600',weight:2,fillOpacity:.08}).addTo(m);return()=>layer.remove()
 },[open,ready,points])
 useEffect(()=>{
  const L=(window as any).L,m=mapRef.current,lat=Number(newLat),lng=Number(newLng)
  if(!L||!m||!open||!newLat.trim()||!newLng.trim()||!validCoordinates(lat,lng))return
  const marker=L.marker([lat,lng],{draggable:!busy,bubblingMouseEvents:false,icon:L.divIcon({className:'',html:'<span style="display:block;width:24px;height:24px;border:3px solid white;border-radius:50%;background:#e10600;box-shadow:0 0 0 2px #18181b"></span>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(m)
  marker.bindTooltip('Novo local · arraste para ajustar')
  marker.on('dragend',()=>{const p=marker.getLatLng();setNewLat(p.lat.toFixed(6));setNewLng(p.lng.toFixed(6))})
  return()=>marker.remove()
 },[open,ready,newLat,newLng,busy])
 const calculateOne=async(row:Saved,traffic=false)=>{
  const token=++routeRequest.current
  setRouteBusy(true);setRouteStatus('Calculando trajeto pelas vias…');setRouteLine(null)
  try{
   const result=await loadRoadRoute(row,traffic)
   if(token!==routeRequest.current)return
   setRoutes(prev=>({...prev,[routePointKey(row)]:result.route}));setRouteLine(result.route)
   setRouteStatus(`${row.name}: ${result.route.distanceKm.toFixed(1)} km pelas vias · ${Math.ceil(result.route.durationMinutes)} min estimados · ${result.route.traffic==='live'?'trânsito consultado':'sem trânsito ao vivo'}`)
  }catch(e:any){if(token===routeRequest.current){setRoutes(prev=>({...prev,[routePointKey(row)]:null}));setRouteStatus(e.message)}}
  finally{if(token===routeRequest.current)setRouteBusy(false)}
 }
 const focus=(row:Saved)=>{
  setSelected(row.id)
  if(mapRef.current&&validCoordinates(row.lat,row.lng)){mapRef.current.setView([row.lat,row.lng],15);markersRef.current[row.id]?.openTooltip();mapEl.current?.scrollIntoView({behavior:'smooth',block:'center'})}
  void calculateOne(row)
 }
 const calculateAll=async()=>{
  const token=++routeRequest.current
  setRouteBusy(true);setRouteLine(null)
  try{
   const targets=rows.filter(r=>validCoordinates(r.lat,r.lng))
   for(let i=0;i<targets.length;i+=50){
    setRouteStatus(`Calculando trajetos ${i+1} a ${Math.min(i+50,targets.length)} de ${targets.length}…`)
    const batch=targets.slice(i,i+50),result=await loadRoadMatrix(batch.map(({id,lat,lng})=>({id,lat,lng})))
    if(token!==routeRequest.current)return
    setRoutes(prev=>({...prev,...Object.fromEntries(result.routes.map(r=>[routePointKey(batch.find(b=>b.id===r.id)!),r.route]))}))
   }
   setRouteStatus('Trajetos atualizados pelas vias. Pontos sem acesso identificado ficam sem distância; ajuste suas coordenadas. Tempos sem trânsito ao vivo.')
  }catch(e:any){if(token===routeRequest.current)setRouteStatus(e.message)}finally{if(token===routeRequest.current)setRouteBusy(false)}
 }
 useEffect(()=>{
  const L=(window as any).L,m=mapRef.current;if(!L||!m||!routeLine?.geometry?.length||!open)return
  const line=L.polyline(routeLine.geometry,{color:distanceBand(routeLine.distanceKm).color,weight:5,opacity:.9}).addTo(m)
  m.fitBounds(line.getBounds(),{padding:[28,28]})
  return()=>line.remove()
 },[routeLine,open,ready])
 const change=(id:string,patch:Partial<Saved>)=>{setRows(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));setDirty(prev=>prev.includes(id)?prev:[...prev,id])}
 const inArea=(row:Saved)=>{
  const polygon=zoneMeta(row.description).polygon||catalog.find(c=>normalizeNeighborhood(c.name)===normalizeNeighborhood(row.name))?.polygon
  return polygon?.length?polygonsOverlap(points,polygon):pointInPolygon([row.lat,row.lng],points)
 }
 const filtered=rows.filter(row=>(!query||normalizeNeighborhood(row.name).includes(normalizeNeighborhood(query)))&&(typeFilter==='all'||deliveryZone(row)===typeFilter)&&(distanceFilter==='all'||distanceBand(routeKm(row)).label===distanceFilter)&&(!areaOnly||inArea(row)))
 const saveRows=async(list:Saved[],asArea=false)=>{
  if(!canEdit||preview){setStatus('Entre com uma conta de operador para salvar as taxas reais.');return}
  if(!list.length)return
  if(list.some(r=>r.fee!==null&&(!Number.isFinite(r.fee)||r.fee<0)||!validCoordinates(r.lat,r.lng))){setStatus('Confira os valores e coordenadas. Deixe o valor vazio para cadastrar depois.');return}
  if(asArea&&(!areaName.trim()||points.length<3)){setStatus('Dê um nome à área e marque ao menos três pontos.');return}
  setBusy(true);setStatus('Salvando…')
  try{
   const zoneId=crypto.randomUUID()
   const payload=list.map(r=>({...r,description:asArea?neighborhoodDescription(r,{zoneId,zoneName:areaName.trim(),zonePolygon:points,fixedFee:true,neighborhood:true}):r.description}))
   const result=await pb.send<Saved[]>('/backend/v1/delivery/neighborhoods',{body:{p_rows:payload.map(({id,name,fee,lat,lng,description})=>({id,name,fee,lat,lng,description}))}})
   if(result.length!==list.length)throw Error('O banco não confirmou todos os bairros.')
   const updated=new Map(result.map(r=>[r.id,r]))
   setRows(prev=>prev.map(r=>updated.get(r.id)||r));setSaved(prev=>prev.map(r=>updated.get(r.id)||r));setDirty(prev=>prev.filter(id=>!updated.has(id)))
   setStatus(`${result.length} bairro(s) salvo(s). Valores vazios continuam pendentes, sem liberar entrega gratuita.`)
  }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const saveOrigin=async()=>{
  if(!canEdit){setStatus('Entre com uma conta de operador para salvar a origem.');return}
  const lat=Number(originLat),lng=Number(originLng)
  if(!originLat.trim()||!originLng.trim()||!validCoordinates(lat,lng)){setStatus('Informe coordenadas válidas para a origem.');return}
  setBusy(true)
  try{
   const data={...origin,lat,lng,confirmed:true}
   const result=originRecord?await pb.collection('landing_content').update(originRecord,{section:'delivery_origin',data}):await pb.collection('landing_content').create({section:'delivery_origin',data})
   const check=await pb.collection('landing_content').getOne<{data:DeliveryOrigin}>(result.id)
   if(check.data?.lat!==lat||check.data?.lng!==lng)throw Error('A origem não foi confirmada pelo banco.')
   routeRequest.current++;setRouteBusy(false);setRoutes({});setRouteLine(null);setOriginRecord(result.id);setOrigin(data);mapRef.current?.setView([lat,lng],12);setStatus('Origem salva. Faixas e distâncias atualizadas para todos os bairros.')
  }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const addNeighborhood=async()=>{
  if(!canEdit||preview){setStatus('Entre com uma conta de operador para adicionar locais e taxas.');return}
  let payload:ReturnType<typeof newDeliveryLocation>
  try{payload=newDeliveryLocation({name:newName,lat:newLat,lng:newLng,fee:newFee,zone:newZone},rows)}catch(e:any){setStatus(e.message);return}
  setBusy(true)
  try{
   const result=await pb.send<Saved[]>('/backend/v1/delivery/neighborhoods',{body:{p_rows:[payload]}})
   if(result.length!==1||!result[0].id||result[0].name!==payload.name||result[0].lat!==payload.lat||result[0].lng!==payload.lng||result[0].fee!==payload.fee)throw Error('O banco não confirmou o local e a taxa. Confira o cadastro antes de tentar novamente.')
   const row=result[0]
   setRows(prev=>[...prev,row].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));setSaved(prev=>[...prev,row]);setNewName('');setNewLat('');setNewLng('');setNewFee('');setNewZone('urban');setPickNew(false);setNewFormOpen(false);setSelected(row.id);setQuery(row.name);setAreaOnly(false);setTypeFilter('all');setDistanceFilter('all');mapRef.current?.setView([row.lat,row.lng],15);setStatus(payload.fee===null?'Local salvo com taxa pendente.':'Local e taxa salvos. O valor pode ser editado na lista.')
  }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const field='w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs text-white'
 return <section className="rounded-xl border border-zinc-800 bg-[#121215] p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">Cadastro de taxas por bairro</h3><p className="mt-1 text-xs text-zinc-400">{saved.length} localidades · {saved.filter(r=>r.fee===null).length} valores pendentes. Clique nas coordenadas para localizar no mapa.</p></div><button type="button" className="sc-btn-primary" onClick={()=>setOpen(true)}>Abrir mapa e cadastro de taxas</button></div>
  {preview&&<p className="mt-2 text-xs text-zinc-400">Prévia da lista de referência, sem preços. <a href="/login?returnTo=/gestao" className="underline">Entre como operador</a> para consultar as taxas reais e editar o cadastro.</p>}
  {status&&!open&&<p role="status" className="mt-2 text-sm text-zinc-300">{status}</p>}
  {open&&<div className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 p-3" role="dialog" aria-modal="true" aria-label="Taxas de entrega por bairro"><div className="mx-auto my-3 max-w-7xl rounded-2xl border border-zinc-700 bg-[#121215] p-4">
   <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">Mapa e taxas de entrega</h3><p className="text-xs text-zinc-400">Pontos da lista enviada e limites municipais dos bairros. Valor em branco significa taxa pendente.</p></div><button type="button" aria-label="Fechar mapa" onClick={()=>{routeRequest.current++;setRouteBusy(false);setOpen(false);setPickNew(false);setPickOrigin(false);setDraw(false)}} className="px-2 text-zinc-400">×</button></div>
   {preview&&<p className="mb-3 text-xs text-amber-200">Prévia dos 130 pontos do documento. Preços reais protegidos: entre no Gestor como operador para consultar e salvar.</p>}
   <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
    <div className="space-y-3 lg:sticky lg:top-3"><div className="flex flex-wrap items-center gap-2"><button type="button" aria-pressed={pickNew} disabled={busy} className="sc-btn-primary" onClick={()=>{setPickNew(v=>!v);setDraw(false);setPickOrigin(false);setNewFormOpen(true)}}>{pickNew?'Cancelar marcação':'Marcar novo local no mapa'}</button><span role="status" className="text-xs text-zinc-300">{pickNew?'Clique no mapa para posicionar o novo local.':''}</span></div>
     <div ref={mapEl} aria-label="Mapa de cadastro de taxas" className="h-[420px] rounded-xl bg-zinc-900" style={{cursor:pickNew||pickOrigin||draw?'crosshair':undefined}}/>
     <details open={newFormOpen} onToggle={e=>setNewFormOpen(e.currentTarget.open)} className="rounded-lg border border-zinc-700 p-3"><summary className="cursor-pointer text-xs font-semibold text-zinc-200">Cadastrar novo local e taxa</summary><div className="mt-3 space-y-3">
      <label className="block text-xs text-zinc-300">Nome do local<input aria-label="Nome do novo local" placeholder="Bairro, condomínio ou ponto de entrega" value={newName} disabled={busy} onChange={e=>setNewName(e.target.value)} className={field}/></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-zinc-300">Taxa (R$)<input aria-label="Taxa do novo local" type="number" min="0" step=".01" placeholder="A definir" value={newFee} disabled={busy} onChange={e=>setNewFee(e.target.value)} className={field}/></label><label className="text-xs text-zinc-300">Zona<select aria-label="Zona do novo local" value={newZone} disabled={busy} onChange={e=>setNewZone(e.target.value as DeliveryZoneType)} className={field}>{Object.entries(DELIVERY_ZONES).map(([key,z])=><option key={key} value={key}>{z.label}</option>)}</select></label></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-zinc-300">Latitude<input aria-label="Latitude do novo local" type="number" step="any" value={newLat} disabled={busy} onChange={e=>setNewLat(e.target.value)} className={field}/></label><label className="text-xs text-zinc-300">Longitude<input aria-label="Longitude do novo local" type="number" step="any" value={newLng} disabled={busy} onChange={e=>setNewLng(e.target.value)} className={field}/></label></div>
      <p className="text-xs text-zinc-400">Clique no mapa ou arraste o marcador vermelho para ajustar. O cadastro só será gravado ao salvar. Taxa em branco fica pendente; zero significa entrega gratuita.</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||!canEdit||preview} className="sc-btn-primary" onClick={()=>void addNeighborhood()}>{busy?'Salvando…':'Salvar local e taxa'}</button><button type="button" disabled={busy} className="sc-btn-ghost" onClick={()=>{setPickNew(false);setNewFormOpen(false);setNewName('');setNewLat('');setNewLng('');setNewFee('');setNewZone('urban')}}>Cancelar cadastro</button></div>
      {(!canEdit||preview)&&<p className="text-xs text-amber-200">Entre como operador para salvar o local e a taxa.</p>}
     </div></details>
     <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-zinc-400" aria-label="Legenda de zonas">{Object.entries(DELIVERY_ZONES).map(([key,z])=><span key={key} className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{background:z.color}}/>{z.label}</span>)}</div>
     <div className="flex flex-wrap gap-2 text-[10px] text-zinc-300" aria-label="Legenda de distâncias">{[...DISTANCE_BANDS.map((b,i)=>({...b,label:i===0?'Até 3 km':`>${DISTANCE_BANDS[i-1].max}–${b.max} km`})),{color:'#d4d4d8',label:'>21 km'}].map(b=><span key={b.label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{background:b.color}}/>{b.label}</span>)}</div>
     <p className="text-[10px] text-zinc-500">Borda do ponto = zona; preenchimento = faixa de distância. Distância do trajeto pelas vias até o ponto de referência do bairro. O tempo é uma estimativa; trânsito ao vivo depende da integração ativa. Não há retorno para distância em linha reta quando a rota falha.</p>
     <div className="space-y-2 rounded-lg border border-zinc-800 p-3"><div className="flex flex-wrap gap-2"><button type="button" disabled={routeBusy} onClick={()=>void calculateAll()} className="sc-btn-primary">{routeBusy?'Calculando…':'Calcular trajetos dos bairros'}</button><button type="button" disabled={routeBusy||!selected||!liveTraffic||!canEdit} onClick={()=>{const row=rows.find(r=>r.id===selected);if(row)void calculateOne(row,true)}} className="sc-btn-ghost">Consultar trânsito da rota selecionada</button></div><p className="text-xs text-zinc-400">{liveTraffic?'Trânsito disponível para operadores autenticados.':'Trânsito ao vivo não configurado. Ative TomTom Routing no servidor para incluir velocidades históricas, congestionamentos e ocorrências disponíveis.'}</p><p role="status" className="text-xs text-zinc-300">{routeStatus||'Pontos cinza ainda não possuem trajeto calculado.'}</p><p className="text-[10px] text-zinc-500">{routeLine?.provider==='TomTom'?'Rota: © TomTom. Sem garantia de cobertura completa de semáforos, radares ou bloqueios.':'Rotas: OSRM / © OpenStreetMap contributors. Perfil de automóvel como aproximação conservadora para moto, sem trânsito ao vivo.'} <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer" className="underline">Corrigir mapa</a></p></div>
     <details className="rounded-lg border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-300">Origem das distâncias: {origin.name} {!origin.confirmed&&'· confirmar ponto'}</summary><div className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Latitude da origem<input aria-label="Latitude da origem" value={originLat} onChange={e=>setOriginLat(e.target.value)} className={field}/></label><label className="text-xs">Longitude da origem<input aria-label="Longitude da origem" value={originLng} onChange={e=>setOriginLng(e.target.value)} className={field}/></label></div><div className="flex flex-wrap gap-2"><button type="button" className="sc-btn-ghost" onClick={()=>{setPickOrigin(v=>!v);setDraw(false);setPickNew(false)}}>{pickOrigin?'Clique no mapa para definir a origem':'Escolher origem no mapa'}</button><button type="button" disabled={busy||!canEdit||preview} onClick={()=>void saveOrigin()} className="sc-btn-primary">Salvar origem</button></div><p className="text-[10px] text-zinc-500">O ponto inicial reaproveita a referência existente. Confirme o local exato do estabelecimento antes de usar as distâncias no planejamento.</p></div></details>
     <details className="rounded-lg border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-300">Delimitar área e cadastrar taxas dos bairros abrangidos</summary><div className="mt-3 space-y-2"><input aria-label="Nome da área" placeholder="Nome da área" value={areaName} onChange={e=>setAreaName(e.target.value)} className={field}/><div className="flex flex-wrap gap-2"><button type="button" className="sc-btn-ghost" aria-pressed={draw} onClick={()=>{setDraw(v=>!v);setPickOrigin(false);setPickNew(false)}}>{draw?'Concluir desenho':'Desenhar área'}</button><button type="button" className="sc-btn-ghost" onClick={()=>{setPoints([]);setAreaOnly(false)}}>Limpar desenho</button><button type="button" disabled={points.length<3} className="sc-btn-ghost" onClick={()=>{setAreaOnly(true);setDraw(false);setQuery('');setTypeFilter('all');setDistanceFilter('all')}}>Listar bairros abrangidos</button></div><p className="text-xs text-zinc-400">{points.length} pontos · {points.length>=3?rows.filter(inArea).length:0} bairros abrangidos. Clique no mapa para marcar o contorno.</p><button type="button" disabled={busy||!canEdit||preview||points.length<3||!areaName.trim()} className="sc-btn-primary" onClick={()=>void saveRows(rows.filter(inArea),true)}>Salvar área e valores individuais</button></div></details>

     <details className="text-[10px] text-zinc-500"><summary className="cursor-pointer">Fontes e revisão do cadastro</summary><p className="mt-2">130 pontos transcritos do PDF fornecido. Os nomes e coordenadas são referências do documento, sem certificação cadastral. Limites urbanos: GeoPixel/ForestGIS (42 bairros maiores). A classificação operacional combina referências municipais e CATI; marcações provisórias devem ser revisadas pelo gestor. Distrito pode conter áreas urbanas e rurais.</p><a href="https://pindamonhangaba.geopixel.com.br/geopixelcidades/login.html" target="_blank" rel="noopener noreferrer" className="mr-3 underline">Mapa municipal</a><a href="https://www.cati.sp.gov.br/portal/projetos-e-programas/conselho-municipal-de-desenvolvimento-rural?cod=422" target="_blank" rel="noopener noreferrer" className="underline">Referências rurais CATI</a></details>
    </div>
    <div className="space-y-3"><input aria-label="Buscar bairro no cadastro de taxas" placeholder="Buscar bairro…" value={query} onChange={e=>setQuery(e.target.value)} className={field}/><div className="grid grid-cols-2 gap-2"><select aria-label="Filtrar por zona" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className={field}><option value="all">Todas as zonas</option>{Object.entries(DELIVERY_ZONES).map(([k,z])=><option key={k} value={k}>{z.label}</option>)}</select><select aria-label="Filtrar por distância" value={distanceFilter} onChange={e=>setDistanceFilter(e.target.value)} className={field}><option value="all">Todas as distâncias</option>{DISTANCE_BANDS.map(b=>distanceBand(b.max).label).concat('Acima de 21 km','Trajeto não calculado').map(label=><option key={label}>{label}</option>)}</select></div>
     <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><span>{filtered.length} localidades{areaOnly?' na área selecionada':''}</span>{areaOnly&&<button type="button" onClick={()=>setAreaOnly(false)} className="underline">Mostrar todas</button>}<button type="button" disabled={busy||!canEdit||preview||!dirty.length} onClick={()=>void saveRows(rows.filter(r=>dirty.includes(r.id)))} className="sc-btn-primary">Salvar alterações ({dirty.length})</button></div>
     <p role="status" className="text-xs text-zinc-300">{status}</p>
     <div className="space-y-2">{filtered.map(row=>{const zone=DELIVERY_ZONES[deliveryZone(row)],km=routeKm(row),band=distanceBand(km),meta=zoneMeta(row.description);return <article key={row.id} aria-label={'Taxa do bairro '+row.name} className={'rounded-xl border p-3 '+(row.id===selected?'border-zinc-400 bg-white/5':'border-zinc-800')}>
      <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-white">{row.name}</h4><span className="shrink-0 text-[10px]" style={{color:band.color}}>{Number.isFinite(km)?km.toFixed(1)+' km · '+Math.ceil(routes[routePointKey(row)]!.durationMinutes)+' min':'Trajeto pendente'}</span></div>
      <button type="button" aria-label={'Localizar '+row.name+' no mapa'} onClick={()=>focus(row)} className="mt-1 text-left text-[10px] text-zinc-400 underline decoration-zinc-700">⌖ {row.lat?.toFixed(4)}, {row.lng?.toFixed(4)} · Ver no mapa</button>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2"><label className="min-w-0 text-[10px] text-zinc-400"><span className="flex items-center gap-1"><i className="inline-block h-1 w-1 rounded-full" style={{background:zone.color}}/>Zona{meta.classificationStatus==='provisional'?' · revisar':''}</span><select aria-label={'Zona de '+row.name} value={deliveryZone(row)} onChange={e=>change(row.id,{description:neighborhoodDescription(row,{zoneType:e.target.value as DeliveryZoneType,classificationStatus:'manager'})})} className={field}>{Object.entries(DELIVERY_ZONES).map(([k,z])=><option key={k} value={k}>{z.label}</option>)}</select></label><label className="min-w-0 text-[10px] text-zinc-400">Taxa (R$)<input aria-label={'Taxa de '+row.name} type="number" min="0" step=".01" placeholder="A definir" value={row.fee??''} onChange={e=>change(row.id,{fee:e.target.value===''?null:Number(e.target.value)})} className={field}/></label><button type="button" aria-label={'Salvar taxa de '+row.name} disabled={busy||!canEdit||preview||!dirty.includes(row.id)} onClick={()=>void saveRows([row])} className="sc-btn-ghost text-xs disabled:opacity-30">Salvar</button></div>
      <details className="mt-2 text-[10px] text-zinc-500"><summary className="cursor-pointer">Editar ponto de referência</summary><div className="mt-2 grid grid-cols-2 gap-2"><label>Latitude<input aria-label={'Latitude de '+row.name} type="number" step="any" value={Number.isFinite(row.lat)?row.lat:''} onChange={e=>change(row.id,{lat:e.target.value===''?NaN:Number(e.target.value)})} className={field}/></label><label>Longitude<input aria-label={'Longitude de '+row.name} type="number" step="any" value={Number.isFinite(row.lng)?row.lng:''} onChange={e=>change(row.id,{lng:e.target.value===''?NaN:Number(e.target.value)})} className={field}/></label></div><p className="mt-1">Use Salvar para registrar o ajuste.</p></details>
      {row.fee===null&&<p className="mt-1 text-[10px] text-zinc-500">Valor pendente</p>}
     </article>})}</div>
    </div>
   </div>
  </div></div>}
 </section>
}
