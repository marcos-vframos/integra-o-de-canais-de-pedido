import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { safeStoryLink, storyIsLive, type LandingStory } from '@/lib/landingCommunications'

export default function LandingStories() {
  const [items,setItems]=useState<LandingStory[]>([])
  const [now,setNow]=useState(Date.now)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [paused,setPaused]=useState(false)
  const [muted,setMuted]=useState(true)
  const [progress,setProgress]=useState(0)
  const [ready,setReady]=useState(false)
  const [failed,setFailed]=useState(false)
  const [hidden,setHidden]=useState(document.hidden)
  const trigger=useRef<HTMLButtonElement>(null)
  const video=useRef<HTMLVideoElement>(null)
  const load=useCallback(async()=>{
    try {setItems(await pb.collection('landing_stories').getFullList<LandingStory>({sort:'sort_order,created'}))}
    catch { /* Keep the last successful contents; local expiry still applies. */ }
  },[])
  useEffect(()=>{void load()},[load])
  useRealtime('landing_stories',load)
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000)
    const visibility=()=>setHidden(document.hidden)
    document.addEventListener('visibilitychange',visibility)
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility)}
  },[])
  const live=items.filter(x=>storyIsLive(x,now))
  const current=live.find(x=>x.id===selectedId)
  const index=live.findIndex(x=>x.id===selectedId)
  const advance=useCallback((offset:number)=>{
    const position=live.findIndex(x=>x.id===selectedId)+offset
    setProgress(0);setReady(false);setFailed(false)
    setSelectedId(position>=0 && position<live.length ? live[position].id : null)
  },[live,selectedId])
  useEffect(()=>{setProgress(0);setReady(false);setFailed(false);setPaused(false)},[selectedId])
  useEffect(()=>{if(selectedId && !current)setSelectedId(null)},[selectedId,current])
  useEffect(()=>{
    if(!selectedId || current?.media_kind!=='image' || paused || hidden || !ready || failed)return
    const timer=setInterval(()=>setProgress(p=>Math.min(1,p+0.02)),100)
    return ()=>clearInterval(timer)
  },[selectedId,current?.media_kind,paused,hidden,ready,failed])
  useEffect(()=>{if(current?.media_kind==='image' && progress>=1)advance(1)},[progress,current?.media_kind,advance])
  useEffect(()=>{
    if(!video.current)return
    if(paused||hidden)video.current.pause()
    else void video.current.play().catch(()=>setPaused(true))
  },[current?.id,paused,hidden])
  if(!live.length)return null
  const href=current ? safeStoryLink(current.link_url) : ''
  return <>
    <button ref={trigger} type="button" aria-label="Abrir stories do Loyola's" onClick={()=>{setMuted(true);setSelectedId(live[0].id)}}
      className="fixed left-3 top-24 z-40 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-amber-400 bg-[#121215] p-0.5 text-white shadow-xl sm:left-5" title="Stories">
      {live[0].media_kind==='image'?<img src={live[0].media_url} alt="" className="h-full w-full rounded-full object-cover"/>:<Play size={24}/>}
    </button>
    <Dialog open={!!current} onOpenChange={open=>{if(!open)setSelectedId(null)}}>
      <DialogContent onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus()}} className="z-[120] flex h-[min(90dvh,850px)] w-[min(96vw,480px)] max-w-none flex-col overflow-hidden rounded-2xl border-white/15 bg-black p-0 text-white [&>button]:z-30 [&>button]:top-12">
        <DialogTitle className="sr-only">Stories do Loyola's</DialogTitle>
        <DialogDescription className="sr-only">Fotos e vídeos publicados pelo Loyola's. Use os botões para avançar, voltar, pausar ou fechar.</DialogDescription>
        <div className="absolute left-3 right-3 top-3 z-20 flex gap-1">{live.map((story,i)=><div key={story.id} className="h-1 flex-1 overflow-hidden rounded bg-white/30"><div className="h-full bg-white" style={{width:(i<index?100:i===index?progress*100:0)+'%'}}/></div>)}</div>
        <div className="absolute left-3 top-8 z-20 flex gap-3">
          <button type="button" aria-label={paused?'Retomar story':'Pausar story'} onClick={()=>setPaused(p=>!p)} className="rounded-full bg-black/60 p-2">{paused?<Play size={18}/>:<Pause size={18}/>}</button>
          {current?.media_kind==='video' && <button type="button" aria-label={muted?'Ativar som':'Silenciar'} onClick={()=>setMuted(m=>!m)} className="rounded-full bg-black/60 p-2">{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {current && (current.media_kind==='video'
            ? <video ref={video} key={current.id} src={current.media_url} muted={muted} autoPlay playsInline onLoadedData={()=>setReady(true)}
                onTimeUpdate={e=>{const v=e.currentTarget;if(v.duration)setProgress(v.currentTime/v.duration)}} onEnded={()=>advance(1)} onError={()=>setFailed(true)} className="h-full w-full object-contain"/>
            : <img key={current.id} src={current.media_url} alt={current.caption||'Story do Loyola\'s'} onLoad={()=>setReady(true)} onError={()=>setFailed(true)} className="h-full w-full object-contain"/>)}
          {failed && <p role="status" className="absolute inset-x-10 top-1/2 text-center text-sm">Não foi possível carregar este conteúdo. Avance para o próximo.</p>}
          <button type="button" aria-label="Story anterior" disabled={index===0} onClick={()=>advance(-1)} className="absolute left-2 top-1/2 rounded-full bg-black/50 p-2 disabled:opacity-20"><ChevronLeft/></button>
          <button type="button" aria-label={index===live.length-1?'Finalizar stories':'Próximo story'} onClick={()=>advance(1)} className="absolute right-2 top-1/2 rounded-full bg-black/50 p-2"><ChevronRight/></button>
        </div>
        {current && (current.caption || href) && <div className="space-y-3 bg-black/90 p-5">
          {current.caption && <p className="whitespace-pre-line text-sm">{current.caption}</p>}
          {href && <a href={href} target={href.startsWith('https:')?'_blank':undefined} rel="noopener noreferrer"
            onClick={event=>{setSelectedId(null);if(href.startsWith('#')){event.preventDefault();document.getElementById(href.slice(1))?.scrollIntoView({behavior:'smooth'})}}} className="block rounded-lg bg-white px-4 py-3 text-center text-sm font-bold text-black">{current.link_label||'Saiba mais'}</a>}
        </div>}
      </DialogContent>
    </Dialog>
  </>
}
