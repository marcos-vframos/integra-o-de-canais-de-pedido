import {createClient} from 'npm:@supabase/supabase-js@2.95.0'
import {templateMessage,validConnection} from './messages.ts'
const origins=new Set(['https://loyolaslanchespinda.vercel.app','https://loyolasgestao.vercel.app','https://integracao-de-canais-de-pedido.vercel.app','https://integracao-de-canais-de-pedido-git-feat-su-4e4eaa-sync-squad-hq.vercel.app','https://loyolas-gestao-independente.vercel.app','https://loyolas-gestao-independente-git-feat-supab-9fd0ee-sync-squad-hq.vercel.app'])
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('')
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer)
const digest=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||''
 const cors={'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Vary':'Origin'}
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
 if(origin&&!origins.has(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))return reply(403,{error:'Origem não autorizada'})
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors})
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
 let tenant=''
 const rpc=async(action:string,data:unknown={},token='',operator:string|null=null)=>{
  const {data:result,error}=await db.rpc('customer_whatsapp_api',{p_tenant:tenant,p_action:action,p_data:data,p_token:token,p_operator:operator})
  if(error)throw Error(error.message)
  if(result?.error)throw Error(result.error)
  return result
 }
 const sendQueue=async(cfg:any,dedupe?:string)=>{
  const jobs=await rpc('claim',dedupe?{dedupe}:{})
  for(const job of jobs){
   let response:Response
   try{response=await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`,{method:'POST',headers:{Authorization:'Bearer '+cfg.accessToken,'Content-Type':'application/json'},body:JSON.stringify(templateMessage(cfg,job)),signal:AbortSignal.timeout(12000),redirect:'error'})}
   catch{await rpc('failure',{id:job.id,state:'uncertain',error:'Envio sem confirmação da Meta. Não reenviar automaticamente.'});continue}
   let body:any;try{body=await response.json()}catch{body={}}
   if(response.ok&&typeof body.messages?.[0]?.id==='string'){
    try{await rpc('ack',{id:job.id,providerId:body.messages[0].id})}catch{/* Processing lease becomes uncertain; never automatically repeat an accepted message. */}
   }else await rpc('failure',{id:job.id,state:response.status===429?'pending':response.status>=500?'uncertain':'failed',error:'Meta HTTP '+response.status+' / código '+String(body.error?.code||'sem confirmação')})
  }
 }
 try{
  const url=new URL(req.url)
  let raw='',input:any={}
  if(req.method==='POST'){raw=await req.text();if(raw.length>16384)return reply(413,{error:'Solicitação muito grande'});try{input=JSON.parse(raw)}catch{return reply(400,{error:'JSON inválido'})}}
  tenant=String(input.tenantId||url.searchParams.get('tenant')||'')
  if(!/^[0-9a-f-]{36}$/i.test(tenant))return reply(400,{error:'Loja inválida'})
  if(req.method==='GET'||input.object==='whatsapp_business_account'){
   const cfg=await rpc('webhook_config')
   if(req.method==='GET')return cfg.verifyToken&&url.searchParams.get('hub.verify_token')===cfg.verifyToken?new Response(url.searchParams.get('hub.challenge'),{headers:{'Cache-Control':'no-store'}}):reply(403,{error:'Verificação inválida'})
   if(!cfg.appSecret)return reply(403,{error:'Webhook não configurado'})
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(cfg.appSecret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
   const signature=(req.headers.get('x-hub-signature-256')||'').replace(/^sha256=/,'')
   if(!/^[a-f0-9]{64}$/.test(signature)||!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!.map(v=>parseInt(v,16))),new TextEncoder().encode(raw)))return reply(403,{error:'Assinatura inválida'})
   for(const entry of input.entry||[])for(const change of entry.changes||[]){const value=change.value;if(value?.metadata?.phone_number_id!==cfg.phoneNumberId)continue;for(const s of value.statuses||[])await rpc('delivery',{providerId:s.id,state:s.status});for(const m of value.messages||[])if(/^(sair|parar|stop)$/i.test(m.text?.body?.trim()||''))await rpc('unsubscribe',{phone:m.from})}
   return reply(200,{ok:true})
  }
  if(req.method!=='POST')return reply(405,{error:'Método inválido'})
  const action=String(input.action||''),data=input.data&&typeof input.data==='object'&&!Array.isArray(input.data)?input.data:{},token=String(input.token||'')
  if(action==='dispatch'){const cfg=await rpc('worker_config',{},req.headers.get('x-worker-secret')||'');if(!validConnection(cfg))throw Error('Configuração incompleta');await sendQueue(cfg);return reply(200,{ok:true})}
  if(action==='status')return reply(200,await rpc('status'))
  if(action==='adminStatus'||action==='configure'){
   const auth=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');const {data:{user},error}=await db.auth.getUser(auth)
   if(error||!user)return reply(401,{error:'Entre no gestor como proprietário'})
   await rpc('admin_status',{},'',user.id)
   if(action==='adminStatus')return reply(200,await rpc('admin_status',{},'',user.id))
   const old=await rpc('webhook_config')
   const cfg:any={...old}
   for(const field of ['accessToken','appSecret','phoneNumberId','wabaId','apiVersion','otpTemplate','orderTemplate','birthdayTemplate'])if(typeof data[field]==='string'&&data[field].trim())cfg[field]=data[field].trim()
   cfg.verifyToken=old.verifyToken||random();cfg.language='pt_BR'
   if(data.enabled===true){
    if(!validConnection(cfg)||!cfg.appSecret||!/^\d+$/.test(cfg.wabaId||''))throw Error('Preencha as credenciais e os três modelos aprovados.')
    const options={headers:{Authorization:'Bearer '+cfg.accessToken},signal:AbortSignal.timeout(10000),redirect:'error' as const}
    const number=await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}?fields=id`,options)
    if(!number.ok)throw Error('A Meta não confirmou o número e o token informados.')
    const templates=await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.wabaId}/message_templates?fields=name,status,category,language&limit=100`,options)
    const list=await templates.json()
    for(const [field,category] of [['otpTemplate','AUTHENTICATION'],['orderTemplate','UTILITY'],['birthdayTemplate','MARKETING']])if(!templates.ok||!list.data?.some((t:any)=>t.name===cfg[field]&&t.language==='pt_BR'&&t.status==='APPROVED'&&t.category===category))throw Error('Modelo não aprovado em pt_BR: '+cfg[field])
   }
   return reply(200,await rpc('configure',{...cfg,enabled:data.enabled===true},'',user.id))
  }
  if(action==='requestOtp'){
   if(typeof data.phone!=='string')throw Error('Informe o WhatsApp com DDD')
   // Rejection sampling avoids a modulo bias in the six-digit OTP.
   let value:number;do{value=crypto.getRandomValues(new Uint32Array(1))[0]}while(value>=4294000000)
   const code=String(value%1000000).padStart(6,'0')
   const result=await rpc('request_otp',{phone:data.phone,code,ipHash:await digest((Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'')+'|'+(req.headers.get('x-forwarded-for')||'unknown'))})
   const cfg=await rpc('webhook_config');await sendQueue(cfg,'otp:'+result.challengeId)
   return reply(200,result)
  }
  if(action==='verifyOtp'){
   if(!/^\d{6}$/.test(data.code||'')||!/^[-0-9a-f]{36}$/i.test(data.challengeId||'')||typeof data.name!=='string'||data.name.trim().length<2)throw Error('Informe seu nome e os seis dígitos do código')
   return reply(200,await rpc('verify_otp',{challengeId:data.challengeId,code:data.code,name:data.name}))
  }
  const actions:Record<string,string>={account:'account',profile:'profile',logout:'logout',delete:'delete',track:'track'}
  if(!actions[action])return reply(400,{error:'Ação inválida'})
  return reply(200,await rpc(actions[action],data,token))
 }catch(error){
  const message=error instanceof Error?error.message:'Falha na solicitação'
  const safe=/^(Conecte |Informe |Limite |Aguarde |Código |Sessão |Data |Confirme |Apenas |Preencha |A Meta |Modelo |Pedido indisponível|Acesso inválido)/.test(message)?message:'Não foi possível concluir. Tente novamente.'
  return reply(422,{error:safe})
 }
})
