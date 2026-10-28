import pb from '@/lib/pocketbase/client'
import {tenantId} from '@/lib/supabase/compat'
import {validateControlDraft,type ControlKind,type ControlRecord} from './controlPanel'
export const controlAccess=()=>pb.send<boolean>('/backend/v1/control/access',{body:{p_tenant:tenantId}})
export const saveControlRecord=(kind:ControlKind,data:Record<string,any>,record?:ControlRecord)=>pb.send<ControlRecord>('/backend/v1/control/save',{body:{p_tenant:tenantId,p_id:record?.id||crypto.randomUUID(),p_kind:kind,p_data:validateControlDraft(kind,data),p_expected_revision:record?.revision||0}})
export async function downloadCompleteSource(){
 const manifestResponse=await fetch('/downloads/source-code.json',{cache:'no-store'})
 if(!manifestResponse.ok)throw Error('O pacote de código desta publicação ainda não está disponível.')
 const manifest=await manifestResponse.json()
 if(manifest.available===false)throw Error('O pacote de código ainda não foi preparado nesta publicação.')
 if(manifest.format!=='aes-256-gcm'||!/^[a-f0-9]{64}$/.test(manifest.keyId))throw Error('Manifesto do pacote inválido.')
 const keyHex=await pb.send<string>('/backend/v1/control/source-key',{body:{p_tenant:tenantId,p_key_id:manifest.keyId}})
 if(!/^[a-f0-9]{64}$/.test(keyHex))throw Error('Chave de exportação inválida.')
 const response=await fetch('/downloads/source-code.enc',{cache:'no-store'})
 if(!response.ok)throw Error('Falha ao obter o pacote de código.')
 const bytes=await response.arrayBuffer(),hex=(s:string)=>Uint8Array.from(s.match(/.{2}/g)!.map(x=>parseInt(x,16)))
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')
 if(digest!==manifest.sha256)throw Error('O pacote não corresponde a esta publicação. Atualize a página.')
 const key=await crypto.subtle.importKey('raw',hex(keyHex),'AES-GCM',false,['decrypt'])
 const zip=await crypto.subtle.decrypt({name:'AES-GCM',iv:hex(manifest.iv)},key,bytes)
 const url=URL.createObjectURL(new Blob([zip],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='loyola-sistema-completo-'+manifest.version+'.zip';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
}
