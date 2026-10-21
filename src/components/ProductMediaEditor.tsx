import {useEffect,useRef,useState} from 'react'
import {useLandingContent} from '@/context/LandingContentContext'
import {uploadLandingGalleryImage} from '@/lib/supabase/compat'
export default function ProductMediaEditor({productId}:{productId:string}) {
 const {content,loading,saveSection}=useLandingContent()
 const saved=content.productMedia?.[productId]
 const [images,setImages]=useState<string[]>(saved?.images||[])
 const [carousel,setCarousel]=useState(saved?.carousel||false)
 const initialized=useRef(false)
 useEffect(()=>{if(!loading&&!initialized.current){setImages(saved?.images||[]);setCarousel(saved?.carousel||false);initialized.current=true}},[loading,saved])
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('')
 const publish=async(next:string[],enabled:boolean)=>{await saveSection('product_media_'+productId,{images:next.slice(0,3),carousel:enabled});setImages(next.slice(0,3));setCarousel(enabled);setStatus('Imagens publicadas no produto.')}
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setStatus('');try{await action()}catch(e:any){setStatus(e.message||'Não foi possível salvar as imagens.')}finally{setBusy(false)}}
 return <fieldset className="my-4 rounded-lg border border-zinc-700 p-3"><legend className="px-1 text-xs font-bold">Imagens do produto — até 3</legend>
 <div className="grid grid-cols-3 gap-2">{images.map((url,i)=><div key={url} className="min-w-0"><img src={url} alt={'Imagem '+(i+1)} className="h-24 w-full rounded bg-white object-contain"/><div className="mt-1 flex flex-wrap gap-2"><button type="button" disabled={busy||loading} className="text-xs text-zinc-400" onClick={()=>void run(()=>publish(images.filter((_,j)=>j!==i),carousel))}>Remover</button>{i>0&&<button type="button" disabled={busy||loading} className="text-xs text-zinc-400" onClick={()=>void run(()=>publish([url,...images.filter((_,j)=>j!==i)],carousel))}>Capa</button>}</div></div>)}</div>
 <label className="mt-3 block text-xs">Carregar imagens<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy||loading||images.length>=3} className="mt-2 block w-full text-xs" onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void run(async()=>{if(files.length+images.length>3)throw Error('Selecione no máximo '+(3-images.length)+' imagem(ns).');if(files.some(f=>f.size>6*1024*1024))throw Error('Cada imagem deve ter até 6 MB.');const uploaded:string[]=[];for(const f of files)uploaded.push(await uploadLandingGalleryImage(f));await publish([...images,...uploaded],carousel)})}}/></label>
 <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={carousel} disabled={busy||loading} onChange={e=>void run(()=>publish(images,e.target.checked))}/> Ativar carrossel na landing</label><p className="mt-2 text-xs text-zinc-400">Sem carrossel, apenas a capa aparece. Alterações de imagens são salvas automaticamente.</p><p role="status" className="text-xs">{busy?'Salvando…':status}</p>
 </fieldset>
}
