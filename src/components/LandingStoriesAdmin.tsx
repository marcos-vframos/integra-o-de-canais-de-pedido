import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CirclePlay, Plus, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { uploadLandingStoryMedia } from '@/lib/supabase/compat'
import { safeStoryLink, storyIsLive, type LandingStory } from '@/lib/landingCommunications'

const blank = () => ({ caption:'', link_url:'', link_label:'', starts_at:'' })
const inputClass = 'w-full rounded-lg border border-white/15 bg-zinc-950 p-3 text-sm text-white'
export default function LandingStoriesAdmin() {
  const [items,setItems] = useState<LandingStory[]>([])
  const [editing,setEditing] = useState<LandingStory | null>(null)
  const [draft,setDraft] = useState(blank)
  const [file,setFile] = useState<File | null>(null)
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [message,setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  async function load() {
    const rows=await pb.collection('landing_stories').getFullList<LandingStory>({sort:'sort_order,created'})
    setItems(rows); return rows
  }
  useEffect(() => { void load().catch(e=>setMessage(e.message)) },[])
  const edit = (row: LandingStory | null) => {
    setEditing(row); setFile(null)
    if(fileRef.current) fileRef.current.value=''
    const date=row?.starts_at ? new Date(row.starts_at) : null
    const local=date ? new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
    setDraft(row ? {caption:row.caption,link_url:row.link_url,link_label:row.link_label,starts_at:local} : blank())
  }
  async function run(action:()=>Promise<void>) {
    if(lock.current) return
    lock.current=true;setBusy(true);setMessage('')
    try { await action() } catch(e) { setMessage(e instanceof Error ? e.message : 'Não foi possível salvar.') }
    finally {lock.current=false;setBusy(false)}
  }
  async function save(mode:'draft'|'publish'|'schedule') {
    if (!file && !editing?.media_url) throw new Error('Selecione uma foto ou vídeo.')
    if (draft.link_url && !safeStoryLink(draft.link_url)) throw new Error('Use um link HTTPS ou um destino interno da Landing.')
    if (mode==='schedule' && (!draft.starts_at || Date.parse(draft.starts_at) <= Date.now())) throw new Error('Escolha uma data futura para agendar.')
    const media_url=file ? await uploadLandingStoryMedia(file) : editing!.media_url
    const starts_at=mode==='publish' ? new Date().toISOString() : mode==='schedule' ? new Date(draft.starts_at).toISOString() : editing?.starts_at || null
    const payload={caption:draft.caption.trim(),link_url:safeStoryLink(draft.link_url),link_label:draft.link_label.trim(),
      media_url,media_kind:file ? file.type.startsWith('video/')?'video':'image' : editing!.media_kind,
      active:mode!=='draft',starts_at,sort_order:editing?.sort_order ?? (items.length ? Math.max(...items.map(x=>x.sort_order))+1 : 0)}
    const row=editing ? await pb.collection('landing_stories').update<LandingStory>(editing.id,payload) : await pb.collection('landing_stories').create<LandingStory>(payload)
    const confirmed=await pb.collection('landing_stories').getOne<LandingStory>(row.id)
    if(confirmed.media_url!==media_url || confirmed.active!==payload.active || confirmed.caption!==payload.caption) throw new Error('O banco não confirmou o story.')
    await load();edit(null)
    setMessage(mode==='draft'?'Rascunho salvo.':mode==='schedule'?'Story agendado. Expira 24 horas após o início.':'Story publicado por 24 horas.')
  }
  async function move(index:number,offset:number) {
    const next=[...items], other=index+offset
    if(other<0 || other>=next.length) return
    ;[next[index],next[other]]=[next[other],next[index]]
    // Persist the complete order; on partial failures reload the actual server order.
    try {
      for(let i=0;i<next.length;i++) if(next[i].sort_order!==i) await pb.collection('landing_stories').update(next[i].id,{sort_order:i})
      const confirmed=await load()
      if(confirmed.map(x=>x.id).join()!==next.map(x=>x.id).join()) throw new Error('Confira a ordem e tente novamente.')
      setMessage('Ordem salva na Landing.')
    } catch(e) { await load();throw e }
  }
  return <section aria-label="Stories da Landing" className="space-y-5 rounded-2xl border border-white/10 bg-[#12141c] p-5 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><CirclePlay size={20}/>Stories da Landing</h2>
      <p className="mt-1 text-xs text-zinc-400">Fotos e vídeos até 15 MB. Publicação manual ou agendada, por 24 horas. Conteúdos expirados ficam disponíveis para republicação.</p></div>
      <button disabled={busy} onClick={()=>edit(null)} className="flex items-center gap-1 text-xs"><Plus size={15}/>Novo story</button></div>
    {!pb.authStore.hasSession && <p className="text-sm text-amber-200">Para carregar e publicar, <Link className="underline" to="/login?returnTo=/adm-landing">entre no Gestor</Link>.</p>}
    <fieldset disabled={busy} className="grid gap-3 md:grid-cols-2">
      <label className="text-xs">Foto ou vídeo<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)} className={inputClass}/></label>
      <label className="text-xs">Agendar início (horário deste aparelho)<input type="datetime-local" value={draft.starts_at} onChange={e=>setDraft({...draft,starts_at:e.target.value})} className={inputClass}/></label>
      <label className="text-xs md:col-span-2">Legenda opcional<textarea value={draft.caption} onChange={e=>setDraft({...draft,caption:e.target.value})} className={inputClass}/></label>
      <label className="text-xs">Link opcional: campanha, #cardapio ou https://wa.me/...<input value={draft.link_url} onChange={e=>setDraft({...draft,link_url:e.target.value})} className={inputClass}/></label>
      <label className="text-xs">Texto do botão opcional<input value={draft.link_label} onChange={e=>setDraft({...draft,link_label:e.target.value})} className={inputClass}/></label>
    </fieldset>
    {editing && <p className="text-xs text-amber-200">Editando: {editing.caption || 'Story sem legenda'}. Publicar agora reinicia as 24 horas.</p>}
    <div className="flex flex-wrap gap-3">{(['draft','publish','schedule'] as const).map(mode=><button key={mode} disabled={busy} onClick={()=>void run(()=>save(mode))} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-xs disabled:opacity-40"><Save size={14}/>{mode==='draft'?'Salvar rascunho':mode==='publish'?'Publicar agora':'Agendar'}</button>)}</div>
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((row,index)=><article key={row.id} className="rounded-xl border border-white/10 p-3">
      {row.media_kind==='video'?<video src={row.media_url} controls muted playsInline preload="metadata" className="h-40 w-full rounded-lg object-contain"/>:<img src={row.media_url} alt={row.caption||'Story'} loading="lazy" className="h-40 w-full rounded-lg object-contain"/>}
      <p className="my-2 text-sm">{row.caption||'Sem legenda'}</p>
      <p className="text-xs text-zinc-400">{!row.active?'Rascunho / retirado':storyIsLive(row)?'Publicado':Date.parse(row.starts_at||'')>Date.now()?'Agendado':'Expirado'}{row.starts_at && ' • Até '+new Date(Date.parse(row.starts_at)+86400000).toLocaleString('pt-BR')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button disabled={busy} onClick={()=>edit(row)}>Editar / republicar</button>
        {row.active && <button disabled={busy} onClick={()=>void run(async()=>{await pb.collection('landing_stories').update(row.id,{active:false});const result=await pb.collection('landing_stories').getOne<LandingStory>(row.id);if(result.active)throw new Error('Retirada não confirmada.');await load();setMessage('Story retirado da Landing.')})}>Retirar da Landing</button>}
        <button aria-label={'Mover story '+(index+1)+' para cima'} disabled={busy||index===0} onClick={()=>void run(()=>move(index,-1))}><ArrowUp size={15}/></button>
        <button aria-label={'Mover story '+(index+1)+' para baixo'} disabled={busy||index===items.length-1} onClick={()=>void run(()=>move(index,1))}><ArrowDown size={15}/></button>
      </div>
    </article>)}</div>
  </section>
}
