import {useRef,useState} from 'react'
import {useAuth} from '@/context/AuthContext'
import {usePilotRuntime} from '@/context/PilotRuntimeContext'
import {activatePilot} from '@/lib/pilotRuntime'
import {CalendarClock,Power,ShieldCheck} from 'lucide-react'

const localTime=(value?:string|null)=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'Ainda não definido'

export default function PilotActivationCard() {
 const {user}=useAuth()
 const {status,loading,error,expired,refresh,receive}=usePilotRuntime()
 const [confirmed,setConfirmed]=useState([false,false,false])
 const [busy,setBusy]=useState(false)
 const [failure,setFailure]=useState('')
 const submitting=useRef(false)
 const owner=user?.role==='owner'
 const prepared=status?.managed && status.state==='PREPARED'
 const activate=async()=>{
  if(submitting.current || !prepared || !owner || !confirmed.every(Boolean))return
  submitting.current=true;setBusy(true);setFailure('')
  try {receive(await activatePilot());await refresh()}
  catch(e:unknown){setFailure(e instanceof Error?e.message:'Não foi possível confirmar a ativação. Verifique o status antes de tentar novamente.');await refresh()}
  finally {submitting.current=false;setBusy(false)}
 }
 return <section id="ativar-piloto" className="sc-card my-5 space-y-4" aria-labelledby="pilot-title">
  <div className="flex items-center gap-2"><CalendarClock size={20}/><h2 id="pilot-title" className="text-lg font-semibold">Piloto na internet · 7 dias</h2></div>
  <p className="text-sm"><strong>{loading?'Verificando…':expired?'ENCERRADO':status?.mode==='READY'?'READY · operação real':prepared?'TRIAL · aguardando sua ativação':'Indisponível'}</strong></p>
  {prepared && <p className="text-sm text-[var(--muted)]">A contagem ainda não começou. Somente a confirmação abaixo inicia 168 horas corridas e libera pedidos reais. Abrir esta página não ativa o piloto.</p>}
  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
   <div><dt className="text-[var(--muted)]">Início</dt><dd>{localTime(status?.startedAt)}</dd></div>
   <div><dt className="text-[var(--muted)]">Desligamento automático</dt><dd>{localTime(status?.expiresAt)}</dd></div>
  </dl>
  <p className="text-xs text-[var(--muted)]">Horário de Brasília. Ao vencer o prazo, a landing fica indisponível e o servidor bloqueia novos pedidos. O Gestor permanece acessível para consultar pedidos, concluir atendimento e fechar o caixa. Dados preservados.</p>
  {prepared && <>
   <fieldset className="space-y-3 rounded-xl border border-[var(--line)] p-4" disabled={busy || !owner}>
    <legend className="px-2 text-sm">Conferência antes de ativar</legend>
    {['Conferi cardápio, preços, adicionais e estoque físico.','Conferi horários, formas de pagamento e taxas dos bairros atendidos.','Estou pronto para receber pedidos reais e testar impressão, entrega e fechamento de caixa.'].map((label,index)=><label key={label} className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed[index]} onChange={e=>setConfirmed(previous=>previous.map((v,i)=>i===index?e.target.checked:v))}/><span>{label}</span></label>)}
   </fieldset>
   <button type="button" disabled={busy || !owner || !confirmed.every(Boolean) || !!error}
    onClick={()=>void activate()} className="sc-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-40">
    <Power size={18}/>{busy?'Confirmando no servidor…':'Ativar READY e iniciar meus 7 dias'}
   </button>
   {!owner && <p className="text-sm">Entre com a conta de proprietário para ativar.</p>}
   <p className="text-xs text-[var(--muted)]">A ativação encerra o modo de simulação. Um novo clique não reinicia nem estende o prazo. Ela não configura automaticamente contas de pagamento, taxas ou equipamentos.</p>
  </>}
  {status?.state==='RUNNING' && !expired && <p role="status" className="flex gap-2 text-sm"><ShieldCheck size={18}/>Piloto ativo. As datas estão gravadas no servidor.</p>}
  {expired && <p role="status" className="text-sm">Os sete dias terminaram. Não é possível reiniciar o prazo por este botão.</p>}
  {(error||failure) && <p role="alert" className="text-sm text-red-400">{failure||error}</p>}
  {!loading && <button type="button" className="sc-btn-ghost text-sm" onClick={()=>void refresh()} disabled={busy}>Atualizar status</button>}
 </section>
}
