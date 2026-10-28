import {useEffect,useState} from 'react'
import {Download} from 'lucide-react'
import {useAuth} from '@/context/AuthContext'
import {controlAccess,downloadCompleteSource} from '@/lib/controlApi'
export default function SourceCodeDownload(){
 const {user}=useAuth()
 const userId=user?.id
 const [allowed,setAllowed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let active=true;setAllowed(false);if(userId)void controlAccess().then(value=>{if(active)setAllowed(value)}).catch(()=>{});return()=>{active=false}},[userId])
 async function download(){setBusy(true);setMessage('');try{await downloadCompleteSource();setMessage('Download iniciado.')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 return <section className="sc-card">
  <h3 className="sc-title">Código completo do sistema</h3>
  <p className="sc-sub">Landing, loja, gestor, Painel de Controle, banco, testes e instruções de instalação. O pacote corresponde à versão publicada, sem credenciais nem dados de clientes.</p>
  <button type="button" disabled={!allowed||busy} className="sc-btn-primary inline-flex items-center gap-2" onClick={()=>void download()}><Download size={16}/>{busy?'Preparando download…':'Baixar código completo'}</button>
  <p role="status" className="mt-3 text-xs text-[var(--muted)]">{message||(!allowed?'Acesso exclusivo à conta proprietária do estabelecimento.':'Arquivo ZIP protegido; não é um backup dos dados operacionais.')}</p>
 </section>
}
