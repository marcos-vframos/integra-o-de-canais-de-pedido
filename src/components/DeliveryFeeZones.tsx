import {useEffect,useRef,useState} from 'react'
import pb from '@/lib/pocketbase/client'
import {pointInPolygon,polygonsOverlap,readNeighborhoodGeoJSON,zoneMeta,type Point,type Neighborhood} from '@/lib/deliveryAreas'
import {DELIVERY_ZONES,DISTANCE_BANDS,DEFAULT_DELIVERY_ORIGIN,deliveryZone,distanceBand,distanceFromOrigin,neighborhoodDescription,normalizeNeighborhood,validCoordinates,type DeliveryOrigin,type DeliveryZoneType} from '@/lib/deliveryCatalog'
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
 const [saved,setSaved]=useState<Saved[]>([]),[rows,setRows]=useState<Saved[]>([]),[open,setOpen]=useState(false),[catalog,setCatalog]=useState<Neighborhood[]>([])
 const [origin,setOrigin]=useState<DeliveryOrigin>(DEFAULT_DELIVERY_ORIGIN),[originRecord,setOriginRecord]=useState(''),[originLat,setOriginLat]=useState(String(DEFAULT_DELIVERY_ORIGIN.lat)),[originLng,setOriginLng]=useState(String(DEFAULT_DELIVERY_ORIGIN.lng))
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(0),[selected,setSelected]=useState(''),[query,setQuery]=useState(''),[typeFilter,setTypeFilter]=useState('all'),[distanceFilter,setDistanceFilter]=useState('all')
 const [draw,setDraw]=useState(false),[points,setPoints]=useState<Point[]>([]),[areaName,setAreaName]=useState(''),[areaOnly,setAreaOnly]=useState(false),[pickOrigin,setPickOrigin]=useState(false),[dirty,setDirty]=useState<string[]>([])
 const [newName,setNewName]=useState(''),[newLat,setNewLat]=useState(''),[newLng,setNewLng]=useState('')
 const mapEl=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),markersRef=useRef<Record<string,any>>({}),modes=useRef({draw:false,pickOrigin:false})
 modes.current={draw,pickOrigin}
 const load=async()=>{
  const fees=await pb.collection('delivery_fees').getFullList<Saved>({sort:'name'})
  setSaved(fees);setRows(fees);setDirty([])
 }
 useEffect(()=>{
  void load().catch(e=>setStatus(e.message))
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
  for(const band of DISTANCE_BANDS)L.circle([origin.lat,origin.lng],{radius:band.max*1000,color:band.color,weight:1,opacity:.18,fill:false,interactive:false}).addTo(layer)
  L.circleMarker([origin.lat,origin.lng],{radius:8,color:'#ffffff',weight:3,fillColor:'#18181b',fillOpacity:1}).bindTooltip('Origem: '+origin.name).addTo(layer)
  markersRef.current={}
  for(const row of rows){
   if(!validCoordinates(row.lat,row.lng))continue
   const band=distanceBand(distanceFromOrigin(row,origin)),zone=DELIVERY_ZONES[deliveryZone(row)]
   const marker=L.circleMarker([row.lat,row.lng],{radius:row.id===selected?9:6,color:zone.color,weight:row.id===selected?4:2,fillColor:band.color,fillOpacity:.9,bubblingMouseEvents:false}).addTo(layer)
   const tip=document.createElement('div');tip.textContent=`${row.name} · ${zone.label} · ${distanceFromOrigin(row,origin).toFixed(1)} km · ${row.fee===null?'Valor pendente':fmtBRL(row.fee)}`
   marker.bindTooltip(tip);marker.on('click',()=>{setSelected(row.id);setQuery(row.name);setAreaOnly(false);setTypeFilter('all');setDistanceFilter('all')});markersRef.current[row.id]=marker;if(row.id===selected)marker.openTooltip()
  }
  return()=>layer.remove()
 },[open,ready,rows,catalog,origin,selected])
 useEffect(()=>{
  const L=(window as any).L,m=mapRef.current;if(!L||!m||!open||!points.length)return
  const layer=L.polygon(points,{color:'#e10600',weight:2,fillOpacity:.08}).addTo(m);return()=>layer.remove()
 },[open,ready,points])
 const focus=(row:Saved)=>{
  setSelected(row.id)
  if(mapRef.current&&validCoordinates(row.lat,row.lng)){mapRef.current.setView([row.lat,row.lng],15);markersRef.current[row.id]?.openTooltip()}
 }
 const change=(id:string,patch:Partial<Saved>)=>{setRows(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));setDirty(prev=>prev.includes(id)?prev:[...prev,id])}
 const inArea=(row:Saved)=>{
  const polygon=zoneMeta(row.description).polygon||catalog.find(c=>normalizeNeighborhood(c.name)===normalizeNeighborhood(row.name))?.polygon
  return polygon?.length?polygonsOverlap(points,polygon):pointInPolygon([row.lat,row.lng],points)
 }
 const filtered=rows.filter(row=>(!query||normalizeNeighborhood(row.name).includes(normalizeNeighborhood(query)))&&(typeFilter==='all'||deliveryZone(row)===typeFilter)&&(distanceFilter==='all'||distanceBand(distanceFromOrigin(row,origin)).label===distanceFilter)&&(!areaOnly||inArea(row)))
 const saveRows=async(list:Saved[],asArea=false)=>{
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
  const lat=Number(originLat),lng=Number(originLng)
  if(!originLat.trim()||!originLng.trim()||!validCoordinates(lat,lng)){setStatus('Informe coordenadas válidas para a origem.');return}
  setBusy(true)
  try{
   const data={...origin,lat,lng,confirmed:true}
   const result=originRecord?await pb.collection('landing_content').update(originRecord,{section:'delivery_origin',data}):await pb.collection('landing_content').create({section:'delivery_origin',data})
   const check=await pb.collection('landing_content').getOne<{data:DeliveryOrigin}>(result.id)
   if(check.data?.lat!==lat||check.data?.lng!==lng)throw Error('A origem não foi confirmada pelo banco.')
   setOriginRecord(result.id);setOrigin(data);mapRef.current?.setView([lat,lng],12);setStatus('Origem salva. Faixas e distâncias atualizadas para todos os bairros.')
  }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const addNeighborhood=async()=>{
  const lat=Number(newLat),lng=Number(newLng),name=newName.trim()
  if(name.length<2||!newLat.trim()||!newLng.trim()||!validCoordinates(lat,lng)){setStatus('Informe nome e coordenadas válidas para o novo bairro.');return}
  if(rows.some(r=>normalizeNeighborhood(r.name)===normalizeNeighborhood(name))){setStatus('Este bairro já está cadastrado. Use a busca para editá-lo.');return}
  setBusy(true)
  try{
   const result=await pb.send<Saved[]>('/backend/v1/delivery/neighborhoods',{body:{p_rows:[{name,lat,lng,fee:null,description:JSON.stringify({zoneType:'urban',classificationStatus:'provisional',neighborhood:true,fixedFee:true})}]}})
   if(result.length!==1)throw Error('O banco não confirmou o novo bairro.')
   setRows(prev=>[...prev,...result].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));setSaved(prev=>[...prev,...result]);setNewName('');setNewLat('');setNewLng('');setQuery(name);setAreaOnly(false);setTypeFilter('all');setDistanceFilter('all');setStatus('Bairro adicionado com valor pendente.')
  }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const field='w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs text-white'
 return <section className="rounded-xl border border-zinc-800 bg-[#121215] p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">Cadastro de taxas por bairro</h3><p className="mt-1 text-xs text-zinc-400">{saved.length} localidades · {saved.filter(r=>r.fee===null).length} valores pendentes. Clique nas coordenadas para localizar no mapa.</p></div><button type="button" className="sc-btn-primary" onClick={()=>setOpen(true)}>Abrir mapa e cadastro de taxas</button></div>
  {status&&!open&&<p role="status" className="mt-2 text-sm text-zinc-300">{status}</p>}
  {open&&<div className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 p-3" role="dialog" aria-modal="true" aria-label="Taxas de entrega por bairro"><div className="mx-auto my-3 max-w-7xl rounded-2xl border border-zinc-700 bg-[#121215] p-4">
   <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">Mapa e taxas de entrega</h3><p className="text-xs text-zinc-400">Pontos da lista enviada e limites municipais dos bairros. Valor em branco significa taxa pendente.</p></div><button type="button" aria-label="Fechar mapa" onClick={()=>setOpen(false)} className="px-2 text-zinc-400">×</button></div>
   <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
    <div className="space-y-3 lg:sticky lg:top-3"><div ref={mapEl} aria-label="Mapa de cadastro de taxas" className="h-[420px] rounded-xl bg-zinc-900"/>
     <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-zinc-400" aria-label="Legenda de zonas">{Object.entries(DELIVERY_ZONES).map(([key,z])=><span key={key} className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{background:z.color}}/>{z.label}</span>)}</div>
     <div className="flex flex-wrap gap-2 text-[10px] text-zinc-300" aria-label="Legenda de distâncias">{[...DISTANCE_BANDS.map((b,i)=>({...b,label:i===0?'Até 3 km':`>${DISTANCE_BANDS[i-1].max}–${b.max} km`})),{color:'#d4d4d8',label:'>21 km'}].map(b=><span key={b.label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{background:b.color}}/>{b.label}</span>)}</div>
     <p className="text-[10px] text-zinc-500">Borda do ponto = zona; preenchimento = faixa de distância. Distância aproximada em linha reta até o ponto de referência do bairro, sem estimativa de percurso por ruas.</p>
     <details className="rounded-lg border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-300">Origem das distâncias: {origin.name} {!origin.confirmed&&'· confirmar ponto'}</summary><div className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Latitude da origem<input aria-label="Latitude da origem" value={originLat} onChange={e=>setOriginLat(e.target.value)} className={field}/></label><label className="text-xs">Longitude da origem<input aria-label="Longitude da origem" value={originLng} onChange={e=>setOriginLng(e.target.value)} className={field}/></label></div><div className="flex flex-wrap gap-2"><button type="button" className="sc-btn-ghost" onClick={()=>{setPickOrigin(v=>!v);setDraw(false)}}>{pickOrigin?'Clique no mapa para definir a origem':'Escolher origem no mapa'}</button><button type="button" disabled={busy} onClick={()=>void saveOrigin()} className="sc-btn-primary">Salvar origem</button></div><p className="text-[10px] text-zinc-500">O ponto inicial reaproveita a referência existente. Confirme o local exato do estabelecimento antes de usar as distâncias no planejamento.</p></div></details>
     <details className="rounded-lg border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-300">Delimitar área e cadastrar taxas dos bairros abrangidos</summary><div className="mt-3 space-y-2"><input aria-label="Nome da área" placeholder="Nome da área" value={areaName} onChange={e=>setAreaName(e.target.value)} className={field}/><div className="flex flex-wrap gap-2"><button type="button" className="sc-btn-ghost" aria-pressed={draw} onClick={()=>{setDraw(v=>!v);setPickOrigin(false)}}>{draw?'Concluir desenho':'Desenhar área'}</button><button type="button" className="sc-btn-ghost" onClick={()=>{setPoints([]);setAreaOnly(false)}}>Limpar desenho</button><button type="button" disabled={points.length<3} className="sc-btn-ghost" onClick={()=>{setAreaOnly(true);setDraw(false);setQuery('');setTypeFilter('all');setDistanceFilter('all')}}>Listar bairros abrangidos</button></div><p className="text-xs text-zinc-400">{points.length} pontos · {points.length>=3?rows.filter(inArea).length:0} bairros abrangidos. Clique no mapa para marcar o contorno.</p><button type="button" disabled={busy||points.length<3||!areaName.trim()} className="sc-btn-primary" onClick={()=>void saveRows(rows.filter(inArea),true)}>Salvar área e valores individuais</button></div></details>
     <details className="rounded-lg border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-300">Adicionar bairro / localidade</summary><div className="mt-3 space-y-2"><input aria-label="Nome do novo bairro" placeholder="Nome do bairro" value={newName} onChange={e=>setNewName(e.target.value)} className={field}/><div className="grid grid-cols-2 gap-2"><input aria-label="Latitude do novo bairro" placeholder="Latitude" value={newLat} onChange={e=>setNewLat(e.target.value)} className={field}/><input aria-label="Longitude do novo bairro" placeholder="Longitude" value={newLng} onChange={e=>setNewLng(e.target.value)} className={field}/></div><button type="button" disabled={busy} className="sc-btn-primary" onClick={()=>void addNeighborhood()}>Adicionar com valor pendente</button></div></details>
     <details className="text-[10px] text-zinc-500"><summary className="cursor-pointer">Fontes e revisão do cadastro</summary><p className="mt-2">130 pontos transcritos do PDF fornecido. Os nomes e coordenadas são referências do documento, sem certificação cadastral. Limites urbanos: GeoPixel/ForestGIS (42 bairros maiores). A classificação operacional combina referências municipais e CATI; marcações provisórias devem ser revisadas pelo gestor. Distrito pode conter áreas urbanas e rurais.</p><a href="https://pindamonhangaba.geopixel.com.br/geopixelcidades/login.html" target="_blank" rel="noopener noreferrer" className="mr-3 underline">Mapa municipal</a><a href="https://www.cati.sp.gov.br/portal/projetos-e-programas/conselho-municipal-de-desenvolvimento-rural?cod=422" target="_blank" rel="noopener noreferrer" className="underline">Referências rurais CATI</a></details>
    </div>
    <div className="space-y-3"><input aria-label="Buscar bairro no cadastro de taxas" placeholder="Buscar bairro…" value={query} onChange={e=>setQuery(e.target.value)} className={field}/><div className="grid grid-cols-2 gap-2"><select aria-label="Filtrar por zona" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className={field}><option value="all">Todas as zonas</option>{Object.entries(DELIVERY_ZONES).map(([k,z])=><option key={k} value={k}>{z.label}</option>)}</select><select aria-label="Filtrar por distância" value={distanceFilter} onChange={e=>setDistanceFilter(e.target.value)} className={field}><option value="all">Todas as distâncias</option>{DISTANCE_BANDS.map(b=>distanceBand(b.max).label).concat('Acima de 21 km').map(label=><option key={label}>{label}</option>)}</select></div>
     <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><span>{filtered.length} localidades{areaOnly?' na área selecionada':''}</span>{areaOnly&&<button type="button" onClick={()=>setAreaOnly(false)} className="underline">Mostrar todas</button>}<button type="button" disabled={busy||!dirty.length} onClick={()=>void saveRows(rows.filter(r=>dirty.includes(r.id)))} className="sc-btn-primary">Salvar alterações ({dirty.length})</button></div>
     <p role="status" className="text-xs text-zinc-300">{status}</p>
     <div className="space-y-2">{filtered.map(row=>{const zone=DELIVERY_ZONES[deliveryZone(row)],km=distanceFromOrigin(row,origin),band=distanceBand(km),meta=zoneMeta(row.description);return <article key={row.id} aria-label={'Taxa do bairro '+row.name} className={'rounded-xl border p-3 '+(row.id===selected?'border-zinc-400 bg-white/5':'border-zinc-800')}>
      <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-white">{row.name}</h4><span className="shrink-0 text-[10px]" style={{color:band.color}}>{Number.isFinite(km)?km.toFixed(1)+' km':'Sem ponto'}</span></div>
      <button type="button" aria-label={'Localizar '+row.name+' no mapa'} onClick={()=>focus(row)} className="mt-1 text-left text-[10px] text-zinc-400 underline decoration-zinc-700">⌖ {row.lat?.toFixed(4)}, {row.lng?.toFixed(4)} · Ver no mapa</button>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2"><label className="min-w-0 text-[10px] text-zinc-400"><span className="flex items-center gap-1"><i className="inline-block h-1 w-1 rounded-full" style={{background:zone.color}}/>Zona{meta.classificationStatus==='provisional'?' · revisar':''}</span><select aria-label={'Zona de '+row.name} value={deliveryZone(row)} onChange={e=>change(row.id,{description:neighborhoodDescription(row,{zoneType:e.target.value as DeliveryZoneType,classificationStatus:'manager'})})} className={field}>{Object.entries(DELIVERY_ZONES).map(([k,z])=><option key={k} value={k}>{z.label}</option>)}</select></label><label className="min-w-0 text-[10px] text-zinc-400">Taxa (R$)<input aria-label={'Taxa de '+row.name} type="number" min="0" step=".01" placeholder="A definir" value={row.fee??''} onChange={e=>change(row.id,{fee:e.target.value===''?null:Number(e.target.value)})} className={field}/></label><button type="button" aria-label={'Salvar taxa de '+row.name} disabled={busy||!dirty.includes(row.id)} onClick={()=>void saveRows([row])} className="sc-btn-ghost text-xs disabled:opacity-30">Salvar</button></div>
      <details className="mt-2 text-[10px] text-zinc-500"><summary className="cursor-pointer">Editar ponto de referência</summary><div className="mt-2 grid grid-cols-2 gap-2"><label>Latitude<input aria-label={'Latitude de '+row.name} type="number" step="any" value={Number.isFinite(row.lat)?row.lat:''} onChange={e=>change(row.id,{lat:e.target.value===''?NaN:Number(e.target.value)})} className={field}/></label><label>Longitude<input aria-label={'Longitude de '+row.name} type="number" step="any" value={Number.isFinite(row.lng)?row.lng:''} onChange={e=>change(row.id,{lng:e.target.value===''?NaN:Number(e.target.value)})} className={field}/></label></div><p className="mt-1">Use Salvar para registrar o ajuste.</p></details>
      {row.fee===null&&<p className="mt-1 text-[10px] text-zinc-500">Valor pendente</p>}
     </article>})}</div>
    </div>
   </div>
  </div></div>}
 </section>
}
