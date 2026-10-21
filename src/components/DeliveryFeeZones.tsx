import { useEffect,useRef,useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {pointInPolygon,polygonsOverlap,readNeighborhoodGeoJSON,zoneMeta,type Point,type Neighborhood} from '@/lib/deliveryAreas'
type Saved=Neighborhood&{id:string;description?:string}
export default function DeliveryFeeZones(){
 const [zones,setZones]=useState<Saved[]>([]),[open,setOpen]=useState(false),[name,setName]=useState(''),[zoneId,setZoneId]=useState(''),[points,setPoints]=useState<Point[]>([]),[rows,setRows]=useState<Neighborhood[]>([]),[catalog,setCatalog]=useState<Neighborhood[]>([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[mapReady,setMapReady]=useState(0)
 const mapEl=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),layerRef=useRef<any>(null),requestRef=useRef(0),autoRef=useRef(true)
 const load=async()=>{try{setZones(await pb.collection('delivery_fees').getFullList<Saved>({sort:'name'}))}catch(e:any){setStatus(e.message)}}
 useEffect(()=>{void load();let active=true;fetch('/data/pindamonhangaba-bairros.geojson').then(r=>{if(!r.ok)throw Error('Base de bairros indisponível');return r.json()}).then(data=>{if(active)setCatalog(readNeighborhoodGeoJSON(data))}).catch(()=>{if(active)setStatus('Falha ao carregar os limites dos bairros. Reabra o mapa para tentar novamente.')});return()=>{active=false}},[])
 useEffect(()=>{if(!open)return;let alive=true;const boot=async()=>{try{
 if(!(window as any).L){if(!document.getElementById('leaflet-css')){const l=document.createElement('link');l.id='leaflet-css';l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l)}await new Promise<void>((res,rej)=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>res();s.onerror=rej;document.body.appendChild(s)})}
 if(!alive||!mapEl.current)return
 const L=(window as any).L,m=L.map(mapEl.current).setView([-22.92,-45.46],13)
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(m)
 m.on('click',(e:any)=>{requestRef.current++;autoRef.current=true;setBusy(false);setPoints(p=>[...p,[e.latlng.lat,e.latlng.lng]]);setRows([])})
 mapRef.current=m;setMapReady(v=>v+1)
 }catch{setStatus('Não foi possível carregar o mapa. Tente abrir novamente.')}};void boot()
 return()=>{alive=false;requestRef.current++;mapRef.current?.remove();mapRef.current=null}
 },[open])
 useEffect(()=>{const L=(window as any).L,m=mapRef.current;if(!L||!m)return;if(layerRef.current)m.removeLayer(layerRef.current);layerRef.current=null;if(points.length){layerRef.current=L.polygon(points,{color:'#E10600'}).addTo(m)}},[points,mapReady])
 useEffect(()=>{const L=(window as any).L,m=mapRef.current;if(!L||!m||!catalog.length)return;const layers=L.layerGroup(catalog.filter(n=>n.polygon?.length).map(n=>L.polygon(n.polygon,{color:'#8b9aab',weight:1,fillOpacity:0.03,interactive:false})));layers.addTo(m);return()=>{layers.remove()}},[catalog,mapReady,open])
 const list=async()=>{
 if(points.length<3){setStatus('Marque ao menos três pontos para delimitar a área.');return}
 const token=++requestRef.current;setBusy(true);setStatus('Buscando bairros da área…')
 const normalize=(name:string)=>name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
 const found=[...zones.map(z=>({...z,polygon:catalog.find(n=>normalize(n.name)===normalize(z.name))?.polygon||zoneMeta(z.description).polygon})),...catalog].filter(n=>n.polygon?.length?polygonsOverlap(points,n.polygon):pointInPolygon([n.lat,n.lng],points))
 if(token!==requestRef.current)return
 const unique=new Map<string,Neighborhood>()
 for(const n of found){const key=n.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');if(!unique.has(key))unique.set(key,n)}
 setRows([...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))
 setStatus(catalog.length?'Bairros que intersectam a área listados a partir dos limites municipais. Revise as taxas antes de salvar.':'A base de bairros ainda não carregou. Aguarde e atualize a lista.')
 setBusy(false)
 }
 // Atualiza a lista após concluir/alterar o desenho.
 useEffect(()=>{if(!open||points.length<3||!autoRef.current)return;const t=setTimeout(()=>{void list()},900);return()=>clearTimeout(t)},[points,catalog,open])
 const edit=(z:Saved)=>{requestRef.current++;autoRef.current=false;setBusy(false);const meta=zoneMeta(z.description),id=meta.zoneId||z.id;setZoneId(id);setName(meta.zoneName||z.name);setPoints(meta.zonePolygon||meta.polygon||[]);setRows(zones.filter(x=>(zoneMeta(x.description).zoneId||x.id)===id).map(x=>({...x,polygon:zoneMeta(x.description).polygon})));setStatus('Ajuste os valores individuais e salve.');setOpen(true)}
 const save=async()=>{
 if(!name.trim()||points.length<3||!rows.length){setStatus('Informe o nome da área, delimite o mapa e inclua os bairros.');return}
 if(rows.some(r=>r.name.trim().length<2||!Number.isFinite(r.fee)||r.fee<0)){setStatus('Preencha o nome e uma taxa válida para cada bairro.');return}
 if(new Set(rows.map(r=>r.name.trim().toLocaleLowerCase('pt-BR'))).size!==rows.length){setStatus('Há bairros com nomes repetidos. Revise a lista.');return}
 setBusy(true)
 try{const id=zoneId||crypto.randomUUID();const saved=await pb.send<Saved[]>('/backend/v1/delivery/neighborhoods',{body:{p_rows:rows.map(r=>({id:r.id||null,name:r.name.trim(),fee:r.fee,lat:r.lat,lng:r.lng,description:JSON.stringify({zoneId:id,zoneName:name.trim(),zonePolygon:points,polygon:r.polygon,fixedFee:true,neighborhood:true})}))}})
 if(saved.length!==rows.length)throw Error('O servidor não confirmou todos os bairros.')
 setZoneId(id);setRows(saved.map(x=>({...x,polygon:zoneMeta(x.description).polygon})));await load();setStatus('Taxas de todos os bairros salvas. Você pode voltar e editar a qualquer momento.')
 }catch(e:any){setStatus(e.message)}finally{setBusy(false)}
 }
 const field='w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-white'
 return <><div className="rounded-xl border border-zinc-800 bg-[#121215] p-4"><h3 className="font-bold text-white">Taxas por área e bairro</h3><button className="sc-btn-primary mt-2" onClick={()=>{autoRef.current=true;setBusy(false);setName('');setZoneId('');setPoints([]);setRows([]);setStatus('');setOpen(true)}}>Abrir mapa / Nova área</button><div className="mt-3 space-y-2">{zones.map(z=><div key={z.id} className="flex items-center justify-between gap-2 text-sm"><span>{z.name} — {Number(z.fee).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span><button className="sc-btn-ghost" onClick={()=>edit(z)}>Editar</button></div>)}</div></div>
 {open&&<div className="fixed inset-0 z-[70] overflow-y-auto bg-black/85 p-3" role="dialog" aria-modal="true" aria-label="Taxas de entrega por bairro"><div className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-zinc-700 bg-[#121215] p-4"><div className="mb-3 flex justify-between gap-3"><div><h3 className="font-bold text-white">Área de entrega e taxas por bairro</h3><p className="text-xs text-zinc-400">Clique no mapa para contornar a área. Revise os bairros e informe o valor de cada um.</p></div><button aria-label="Fechar mapa" onClick={()=>setOpen(false)}>✕</button></div>
 <div className="grid gap-4 md:grid-cols-[1fr_350px]"><div><div ref={mapEl} className="h-[380px] rounded-xl"/><div className="mt-3 flex flex-wrap gap-2"><button className="sc-btn-ghost" onClick={()=>{requestRef.current++;setPoints([]);setRows([]);setBusy(false)}}>Limpar desenho</button><button className="sc-btn-ghost" disabled={busy||points.length<3} onClick={()=>void list()}>Atualizar bairros da área</button></div><label className="mt-3 block text-xs text-zinc-400">Importar limites oficiais de bairros (GeoJSON)<input type="file" accept=".geojson,.json,application/geo+json,application/json" className="mt-2 block max-w-full" onChange={async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024)throw Error('Arquivo deve ter até 10 MB.');const data=readNeighborhoodGeoJSON(JSON.parse(await file.text()));if(!data.length)throw Error('Nenhum bairro válido encontrado.');autoRef.current=true;setCatalog(data);setStatus(data.length+' limites importados; confira os bairros da área.')}catch(e:any){setStatus(e.message)}e.target.value=''}}/></label></div>
 <div className="space-y-3"><p className="text-xs text-zinc-400">Limites municipais GeoPixel, camada Bairros (42 bairros urbanos), distribuídos pelo ForestGIS em 18/10/2026. Loteamentos podem pertencer a um bairro maior.</p><a className="text-xs underline" href="https://pindamonhangaba.geopixel.com.br/geopixelcidades/login.html" target="_blank" rel="noopener noreferrer">Consultar mapa municipal</a><label className="block text-sm">Nome da área<input className={field} value={name} onChange={e=>setName(e.target.value)}/></label><p className="text-xs text-zinc-400">{points.length} pontos · {rows.length} bairros. Base carregada: {catalog.length} limites de bairros. Bairros que cruzam a área também são incluídos.</p>
 <div className="space-y-3">{rows.map((r,i)=><div key={r.id||i} className="rounded-lg border border-zinc-700 p-3"><label className="block text-xs">Bairro<input aria-label={'Nome do bairro '+(i+1)} className={field} value={r.name} onChange={e=>setRows(rs=>rs.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label><label className="mt-2 block text-xs">Taxa de entrega (R$)<input aria-label={'Taxa de '+r.name} type="number" min="0" step=".01" className={field} value={Number.isFinite(r.fee)?r.fee:''} onChange={e=>setRows(rs=>rs.map((x,j)=>j===i?{...x,fee:e.target.value===''?NaN:Number(e.target.value)}:x))}/></label></div>)}</div>
 <button className="sc-btn-ghost w-full" disabled={busy||points.length<3} onClick={()=>setRows(rs=>[...rs,{name:'',fee:0,lat:points.reduce((n,p)=>n+p[0],0)/points.length,lng:points.reduce((n,p)=>n+p[1],0)/points.length}])}>Incluir bairro ausente</button>
 <button disabled={busy||!rows.length} onClick={()=>void save()} className="sc-btn-primary w-full">{busy?'Aguarde…':'Salvar taxas por bairro'}</button><p role="status" className="text-sm text-zinc-300">{status}</p>
 </div></div></div></div>}</>
}
