import {backendConfigured} from '@/lib/pocketbase/client'
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {readPilotStatus,type PilotStatus} from '@/lib/pilotRuntime'

type Runtime = {
 status: PilotStatus | null
 loading: boolean
 error: string
 expired: boolean
 integrationTest: boolean
 refresh: () => Promise<void>
 receive: (next:PilotStatus) => void
}
const PilotContext=createContext<Runtime | null>(null)

export function PilotRuntimeProvider({children}:{children:ReactNode}) {
 const [status,setStatus]=useState<PilotStatus | null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [expired,setExpired]=useState(false)
 const alive=useRef(true)
 const pending=useRef<Promise<void>|null>(null)
 const anchor=useRef<{expiresIn:number;at:number}|null>(null)
 const newest=useRef(0)
 const receive=useCallback((next:PilotStatus)=>{
  const serverMs=Date.parse(next?.serverNow)
  if(!next || typeof next.acceptsOrders!=='boolean' || !Number.isFinite(serverMs))throw new Error('Resposta inválida do servidor')
  if(!alive.current || serverMs<newest.current)return
  newest.current=serverMs
  anchor.current=next.expiresAt?{expiresIn:Date.parse(next.expiresAt)-serverMs,at:performance.now()}:null
  setStatus(next);setExpired(next.state==='EXPIRED');setError('');setLoading(false)
 },[])
 const refresh=useCallback(async()=>{
  if(!backendConfigured){setLoading(false);return}
  if(pending.current)return pending.current
  pending.current=(async()=>{
   try {
    const next=await readPilotStatus()
    receive(next)
   } catch(e:unknown) {
    if(alive.current)setError(e instanceof Error?e.message:'Não foi possível verificar a disponibilidade.')
   } finally {if(alive.current)setLoading(false)}
  })().finally(()=>{pending.current=null})
  return pending.current
 },[receive])
 useEffect(()=>{
  alive.current=true
  void refresh()
  const timer=window.setInterval(()=>{void refresh()},30000)
  const focus=()=>{void refresh()}
  window.addEventListener('focus',focus)
  const visibility=()=>{if(document.visibilityState==='visible')void refresh()}
  document.addEventListener('visibilitychange',visibility)
  return ()=>{alive.current=false;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility)}
 },[refresh])
 useEffect(()=>{
  const tick=()=>{
   const current=anchor.current
   if(current && performance.now()-current.at>=current.expiresIn)setExpired(true)
  }
  tick()
  const timer=window.setInterval(tick,1000)
  return ()=>clearInterval(timer)
 },[status])
 return <PilotContext.Provider value={{status,loading,error,expired,integrationTest:status?.integrationTest ?? true,refresh,receive}}>{children}</PilotContext.Provider>
}
export function usePilotRuntime() {
 const runtime=useContext(PilotContext)
 if(!runtime)throw new Error('PilotRuntimeProvider ausente')
 return runtime
}
export function PublicPilotGate({children}:{children:ReactNode}) {
 const {status,loading,error,expired,refresh}=usePilotRuntime()
 if(!backendConfigured)return <>{children}</>
 if(!loading && !error && !expired && status?.acceptsOrders)return <>{children}</>
 const ended=expired || status?.state==='EXPIRED'
 return <main className="min-h-screen grid place-items-center p-6 text-center" style={{background:'var(--landing-bg-primary, #140b0b)',color:'var(--landing-accent-silver, #f5eeee)'}}>
  <section className="max-w-md space-y-5">
   <p className="text-sm tracking-widest uppercase">Loyolas Lanches</p>
   <h1 className="text-3xl font-semibold">{loading?'Verificando disponibilidade…':ended?'Período de teste encerrado':'Loja temporariamente indisponível'}</h1>
   <p>{loading?'Aguarde um instante.':ended?'Os sete dias foram concluídos. A loja está fora do ar para novos pedidos.':'Não foi possível liberar o atendimento neste momento. Tente novamente em instantes.'}</p>
   {!loading && <button type="button" onClick={()=>void refresh()} className="rounded-xl border px-5 py-3">Verificar novamente</button>}
  </section>
 </main>
}
