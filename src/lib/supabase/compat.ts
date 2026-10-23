/**
 * PocketBase-shaped compatibility adapter implemented against Supabase REST, Auth,
 * Storage and Edge Functions. Allows gradual refactoring of both existing Vite apps.
 * NOT the legacy PocketBase transport: no network calls to Skip or *.goskip.dev.
 */
const serverUrl = String(import.meta.env.VITE_SUPABASE_URL || 'https://awgqpfdfsyslpqpfzoul.supabase.co').replace(/\/$/,'')
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
export const tenantId = String(import.meta.env.VITE_SUPABASE_TENANT_ID || '8c0d61b8-7cf9-44e0-9e17-96832f3848b6')
export const backendConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(serverUrl)
  && (publishableKey.startsWith('sb_publishable_') || publishableKey.startsWith('eyJ'))
  && /^[0-9a-f-]{36}$/i.test(tenantId)
export const demoGestaoMode = import.meta.env.MODE === 'gestao'
  && (import.meta.env.VITE_GESTAO_DEMO === 'true' || !backendConfigured)
export const backendConfigMessage = backendConfigured
  ? 'Supabase conectado. A conta de operador é necessária para gravar dados reais.'
  : 'Configure VITE_SUPABASE_PUBLISHABLE_KEY e VITE_SUPABASE_URL nos dois aplicativos Vercel.'

const SESSION_KEY = 'loyolas_supabase_auth_v1'
type JsonRow=Record<string,any>
type Operator = JsonRow & { id: string }
type AuthToken={access_token:string;refresh_token:string;expires_at?:number;user?:Operator}
let session:AuthToken|null=null
try {
  const raw=localStorage.getItem(SESSION_KEY)
  if(raw){const x=JSON.parse(raw) as AuthToken; if(x?.access_token && x?.refresh_token) session=x}
} catch { /* private browsing, etc */ }
const listeners=new Set<(token:string,model:any)=>void>()
const inform=()=>listeners.forEach(fn=>fn(session?.access_token||'',session?.user||null))
const setSession=(v:AuthToken|null)=>{
  session=v
  try { if(v)localStorage.setItem(SESSION_KEY,JSON.stringify(v)); else localStorage.removeItem(SESSION_KEY) } catch { /* Storage may be unavailable in private browsing. */ }
  inform()
}
const authStore={
  get record(){return session?.user||null},
  get hasSession(){return !!session?.refresh_token},
  get isValid(){return !!session?.access_token && Number(session.expires_at||0)>Date.now()/1000},
  get token(){return session?.access_token||''},
  clear(){setSession(null)},
  onChange(callback:(token:string,model:any)=>void){listeners.add(callback);return ()=>listeners.delete(callback)},
}
// Synchronize refresh-token rotations and explicit logout across tabs.
function syncStoredSession(){
 try {
  const raw=localStorage.getItem(SESSION_KEY)
  const next=raw?JSON.parse(raw):null
  if(next&&(!next.access_token||!next.refresh_token))return
  if(JSON.stringify(next)!==JSON.stringify(session)){session=next;inform()}
 }catch { /* Keep the current session when browser storage is temporarily unavailable. */ }
}
if(typeof window!=='undefined')window.addEventListener('storage',(event:StorageEvent)=>{
 if(event.key===SESSION_KEY||event.key===null)syncStoredSession()
})
// Serialize refreshes in this tab and, with Web Locks, across tabs sharing the origin.
let refreshing: Promise<void> | null = null
async function refreshSession(force = false): Promise<void> {
 if(refreshing)return refreshing
 syncStoredSession()
 if(!session?.refresh_token)return
 const failedToken=session.access_token
 const renew=async()=>{
  syncStoredSession()
  if(!session?.refresh_token)return
  if((!force||session.access_token!==failedToken)&&Number(session.expires_at||0)>Date.now()/1000+60)return
  const previous=session
  try{
   const next=await request('/auth/v1/token?grant_type=refresh_token',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:previous.refresh_token}),
   },false)
   syncStoredSession()
   if(session!==previous)return
   setSession({access_token:next.access_token,refresh_token:next.refresh_token,
    expires_at:Math.floor(Date.now()/1000)+next.expires_in,user:{...next.user,role:previous.user?.role}})
  }catch(error:any){
   syncStoredSession()
   if(session!==previous&&session?.refresh_token)return
   if(session===previous&&[400,401,403].includes(error?.status))setSession(null)
   throw error
  }
 }
 refreshing=(typeof navigator!=='undefined'&&navigator.locks?.request
  ? navigator.locks.request('loyolas-supabase-auth-refresh',renew):renew()).finally(()=>{refreshing=null})
 return refreshing
}
export async function ensureOperatorSession(): Promise<void> {
  await refreshSession()
  if (!authStore.isValid) throw new Error('Entre no Gestor antes de salvar dados reais.')
}
const fieldAliases:Record<string,Record<string,string>>={
  categories:{order:'sort_order'},
  inventory:{min:'min_qty',group:'inventory_group'},
  orders:{
    ticketNumber:'ticket_number',closureId:'closure_id',deliveryFee:'delivery_fee',deliveryFeeRegion:'delivery_fee_region',
    customerName:'customer_name',customerPhone:'customer_phone',customerAddress:'customer_address',
    deliveryType:'delivery_type',deliveryLat:'delivery_lat',deliveryLng:'delivery_lng',
    customerId:'customer_id',motoboyId:'motoboy_id',motoboyName:'motoboy_name',motoboyAssignedAt:'motoboy_assigned_at',
    campaignId:'campaign_id',paymentDetails:'payment_details',clientRequestId:'idempotency_key',
    invoiceRequested:'invoice_requested',invoiceDocument:'invoice_document',invoiceStatus:'invoice_status',
  },
  customers:{crmProfile:'crm_profile',lastOrderAt:'last_order_at',totalOrders:'total_orders',totalSpent:'total_spent',favoriteItems:'favorite_items'},
  motoboys:{feePerDelivery:'fee_per_delivery',dailyRate:'daily_rate'},
  delivery_fees:{areaGeojson:'area_geojson'},
  campaigns:{voucherCode:'voucher_code',
    customerId:'customer_id',customerPhone:'customer_phone',customerName:'customer_name',
    discountPercent:'discount_percent',discountAmount:'discount_amount',
    targetProductId:'target_product_id',targetProductName:'target_product_name',expiresAt:'expires_at',
  },
  seasonal_campaigns:{startDate:'start_date',endDate:'end_date',ctaText:'cta_text',ctaUrl:'cta_url',media:'media_path'},
  closures:{
    openedAt:'opened_at',closedAt:'closed_at',dateLabel:'date_label',
    grossTotal:'gross_total',netTotal:'net_total',byPayment:'by_payment',
    ordersCount:'orders_count',productBreakdown:'product_breakdown',
    byOriginCount:'by_origin_count',byOriginTotals:'by_origin_totals',shoppingReport:'shopping_report',
  },
  landing_content:{image:'image_path'},
}
const cols=(name:string,key:string)=>{
  if(key==='created')return 'created_at'
  if(key==='updated')return 'updated_at'
  return fieldAliases[name]?.[key] || key
}
const invert=(name:string)=>Object.fromEntries(Object.entries(fieldAliases[name]||{}).map(([a,b])=>[b,a]))
const tableOf=(name:string)=>{
  if(name==='settings'&&!authStore.isValid)return 'storefront_settings'
  if(name==='inventory'&&!authStore.isValid)return 'catalog_inventory'
  return name
}
const urlFor=(path:string)=>serverUrl+path
const request=async(path:string, options:RequestInit={},preferAuth=true,retried=false)=>{
  if(!backendConfigured)throw new Error(backendConfigMessage)
  if (preferAuth) await refreshSession()
  const headers:Record<string,string>={apikey:publishableKey,...(options.headers as Record<string,string> ||{})}
  if(!headers.Authorization){
    if(preferAuth&&authStore.isValid) headers.Authorization='Bearer '+authStore.token
    else headers.Authorization='Bearer '+publishableKey
  }
  let response:Response
  try {response=await fetch(urlFor(path),{...options,headers,cache:'no-store',signal:options.signal||AbortSignal.timeout(30000)})}
  catch {throw new Error('Não foi possível conectar ao Supabase. Verifique sua internet.')}
  if(response.status===401&&preferAuth&&session?.refresh_token&&!retried){
    await refreshSession(true)
    if(!authStore.isValid)throw new Error('Sua sessão expirou. Entre novamente nas configurações do Gestor.')
    return request(path,options,true,true)
  }
  if(response.status===204)return null
  const text=await response.text()
  let body:any
  try{body=text?JSON.parse(text):null}catch{body=text}
  if(!response.ok){
    const e=new Error(body?.message||body?.msg||body?.error||'Erro Supabase HTTP '+response.status) as Error & {status:number;response:any}
    e.status=response.status===406?404:response.status
    e.response=body
    throw e
  }
  return body
}
const extractWhere=(name:string,filter?:string,query=new URLSearchParams())=>{
  if(!filter)return
  // Covers the existing PocketBase UI filters: '=' and chained '&&'.
  for(const part of filter.split(/\s*&&\s*/)){
    const match=part.trim().match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*(=|!=|>=|<=|>|<)\s*(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9._-]+))$/)
    if(!match)throw new Error('Filtro não suportado na migração Supabase: '+part)
    const [,key,operator,dquote,squote,bare]=match
    const raw=dquote??squote??bare
    const op=operator==='='?'eq':operator==='!='?'neq':operator==='>'?'gt':operator==='<'?'lt':operator==='>='?'gte':'lte'
    query.append(cols(name,key),op+'.'+raw)
  }
}
const toRow=(name:string,item:JsonRow)=>{
  const aliases=invert(name)
  const result:JsonRow={...item}
  if(name==='orders'&&item.payment_details?.deliveryRoute)result.deliveryRoute=item.payment_details.deliveryRoute
  for(const [key,val] of Object.entries(item)){
    const converted=aliases[key]|| (key==='created_at'?'created':key==='updated_at'?'updated':null)
    if(converted)result[converted]=val
  }
  if(name==='landing_content'&&item.image_path){
    result.image=publicUrl(item.image_path)
  }
  if(name==='seasonal_campaigns'&&item.media_path){
    result.media=publicUrl(item.media_path)
  }
  return result
}
const fromRow=(name:string,data:JsonRow)=>{
  const payload:JsonRow={tenant_id:tenantId}
  for(const [key,value] of Object.entries(data)){
    if(['id','legacy_id','created','updated','tenant_id'].includes(key))continue
    if(key==='image'||key==='media')continue // Uploaded through Storage independently
    const mapped=cols(name,key)
    if (name === 'seasonal_campaigns' && ['start_date','end_date'].includes(mapped)) {
      if (value == null || (typeof value === 'string' && !value.trim())) {
        payload[mapped] = null
      } else {
        const date = new Date(value as string)
        if (!Number.isFinite(date.getTime())) throw new Error('Informe uma data válida para a campanha.')
        payload[mapped] = date.toISOString()
      }
      continue
    }
    payload[mapped] = value
  }
  return payload
}
const publicUrl=(path:string)=>/^https?:\/\//.test(path)?path:
  urlFor('/storage/v1/object/public/loyolas-public-media/'+path.split('/').map(encodeURIComponent).join('/'))
async function upload(collection:string, file:File, _section:string){
  await ensureOperatorSession()
  if(!file || file.size>15*1024*1024)throw new Error('Imagem/vídeo deve ter no máximo 15 MB.')
  if(!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|application\/pdf)$/.test(file.type))
    throw new Error('Formato de arquivo não permitido.')
  const folder=collection==='landing_content'?'landing':'campaigns'
  const safeName=(file.name||'arquivo').replace(/[^A-Za-z0-9._-]/g,'_').slice(-120)
  const path=tenantId+'/'+folder+'/'+crypto.randomUUID()+'/'+safeName
  await request('/storage/v1/object/loyolas-public-media/'+path.split('/').map(encodeURIComponent).join('/'),{
    method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file,
  })
  return path
}
/** Upload a single gallery asset. Server Storage RLS requires an authenticated owner/manager. */
export async function uploadLandingStoryMedia(file: File): Promise<string> {
  if (!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm))$/.test(file.type)) throw new Error('Use JPG, PNG, WebP, GIF, MP4 ou WebM.')
  return publicUrl(await upload('landing_content',file,'stories'))
}
export async function uploadLandingGalleryImage(file: File): Promise<string> {
  await ensureOperatorSession()
  if (!file.type.startsWith('image/')) throw new Error('Selecione somente imagens JPG, PNG, WebP ou GIF.')
  const path=await upload('landing_content',file,'landing')
  return publicUrl(path)
}

async function confirmEmailToken(token:string,type:'email'|'email_change'){
 const fragment=new URLSearchParams(window.location.hash.slice(1))
 const access=fragment.get('access_token')
 if(access){await request('/auth/v1/user',{headers:{Authorization:'Bearer '+access}},false)}
 else if(token){await request('/auth/v1/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type})},false)}
 else throw new Error('Link de confirmação ausente ou inválido. Solicite um novo e-mail.')
 window.history.replaceState(null,'',window.location.pathname)
}
const pendingReads=new Map<string,Promise<any>>()
async function sharedRead(path:string){
 await refreshSession()
 const key=authStore.token+'|'+path
 let pending=pendingReads.get(key)
 if(!pending){pending=request(path).finally(()=>pendingReads.delete(key));pendingReads.set(key,pending)}
 return pending
}
async function storeOperation(action:string,id:string|null,payload:unknown={}){
 await ensureOperatorSession()
 return request('/rest/v1/rpc/manage_store_operation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_tenant:tenantId,p_action:action,p_id:id,p_payload:payload})})
}
const collection=(name:string)=>{
  const apiPath=async()=>{ await refreshSession(); return '/rest/v1/'+tableOf(name) }
  return {
    async getFullList<T=any>(opts?:{filter?:string;sort?:string;expand?:string;fields?:string}):Promise<T[]>{
      if(name==='users')throw new Error('A coleção users foi substituída pelo Supabase Auth.')
      const q=new URLSearchParams({select:'*',tenant_id:'eq.'+tenantId})
      extractWhere(name,opts?.filter,q)
      const order=(opts?.sort||'id').split(',').map(s=>(s.startsWith('-')?cols(name,s.slice(1))+'.desc':cols(name,s)+'.asc'))
      if(!order.some(s=>s.startsWith('id.')))order.push('id.asc')
      q.set('order',order.join(','))
      const path=await apiPath(),result:JsonRow[]=[]
      // PostgREST caps responses. Read every page instead of silently truncating reports at 1,000 rows.
      for(let offset=0;;offset+=500){
        q.set('limit','500');q.set('offset',String(offset))
        const page=await sharedRead(path+'?'+q)
        if(!Array.isArray(page))throw new Error('Resposta inválida ao consultar '+name)
        result.push(...page)
        if(page.length<500)break
      }
      return result.map(x=>toRow(name,x)) as T[]
    },
    async getFirstListItem<T=any>(filter:string,opts?:{sort?:string}):Promise<T>{
      const q=new URLSearchParams({select:'*',tenant_id:'eq.'+tenantId,limit:'1'})
      extractWhere(name,filter,q)
      if(opts?.sort)q.set('order',opts.sort.split(',').map(s=>(s.startsWith('-')?cols(name,s.slice(1))+'.desc':cols(name,s)+'.asc')).join(','))
      const res=await request((await apiPath())+'?'+q)
      if(!Array.isArray(res)||!res.length){
        const e=new Error('Registro não encontrado') as Error & {status:number}
        e.status=404
        throw e
      }
      return toRow(name,res[0]) as T
    },
    async getOne<T=any>(id:string):Promise<T>{
      const q=new URLSearchParams({select:'*',tenant_id:'eq.'+tenantId,id:'eq.'+id,limit:'1'})
      const rows=await request((await apiPath())+'?'+q)
      if(!rows?.[0]){const e=new Error('Registro não encontrado') as Error & {status:number};e.status=404;throw e}
      return toRow(name,rows[0]) as T
    },
    async create<T=any>(data:FormData|Record<string,any>):Promise<T>{
      await ensureOperatorSession()
      if(name==='closures')return toRow(name,await storeOperation('close_register',null, data instanceof FormData?Object.fromEntries(data.entries()):data)) as T
      if(['orders','users'].includes(name))
        throw new Error('Esta operação exige uma API segura dedicada; gravação direta bloqueada.')
      const raw:JsonRow=data instanceof FormData?Object.fromEntries(data.entries()):{...data}
      if(name==='landing_content'&&raw.image instanceof File)raw.image_path=await upload(name,raw.image,String(raw.section||'landing'))
      if(name==='seasonal_campaigns'&&raw.media instanceof File)raw.media_path=await upload(name,raw.media,'campaigns')
      for(const key of ['data','palette','images','recipe','items','offer','schedule']){
        if(typeof raw[key]==='string')try{raw[key]=JSON.parse(raw[key])}catch { /* Preserve non-JSON legacy values. */ }
      }
      const payload=fromRow(name,raw)
      if(raw.image_path)payload.image_path=raw.image_path
      if(raw.media_path)payload.media_path=raw.media_path
      const q=new URLSearchParams({select:'*'})
      const rows=await request((await apiPath())+'?'+q,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)})
      if(!Array.isArray(rows)||rows.length!==1)throw new Error('Supabase não confirmou a criação.')
      return toRow(name,Array.isArray(rows)?rows[0]:rows) as T
    },
    async update<T=any>(id:string,data:FormData|Record<string,any>):Promise<T>{
      await ensureOperatorSession()
      if(name==='orders')return toRow(name,await storeOperation('order_status',id,data instanceof FormData?Object.fromEntries(data.entries()):data)) as T
      if(['closures','users'].includes(name))
        throw new Error('Esta operação exige permissão específica do servidor; alteração direta bloqueada.')
      const raw:JsonRow=data instanceof FormData?Object.fromEntries(data.entries()):{...data}
      if(name==='landing_content'&&raw.image instanceof File)raw.image_path=await upload(name,raw.image,String(raw.section||'landing'))
      if(name==='seasonal_campaigns'&&raw.media instanceof File)raw.media_path=await upload(name,raw.media,'campaigns')
      for(const key of ['data','palette','images','recipe','items','offer','schedule']){
        if(typeof raw[key]==='string')try{raw[key]=JSON.parse(raw[key])}catch { /* Preserve non-JSON legacy values. */ }
      }
      const payload=fromRow(name,raw)
      if(raw.image_path)payload.image_path=raw.image_path
      if(raw.media_path)payload.media_path=raw.media_path
      const q=new URLSearchParams({tenant_id:'eq.'+tenantId,id:'eq.'+id,select:'*'})
      const rows=await request((await apiPath())+'?'+q,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)})
      if(!Array.isArray(rows)||rows.length!==1)throw new Error('Supabase não confirmou a alteração.')
      return toRow(name,rows[0]) as T
    },
    async delete(id:string):Promise<boolean>{
      await ensureOperatorSession()
      if(['orders','customers','closures','users'].includes(name))
        throw new Error('Exclusão sensível bloqueada; requer procedimento administrativo.')
      const q=new URLSearchParams({tenant_id:'eq.'+tenantId,id:'eq.'+id})
      await request((await apiPath())+'?'+q,{method:'DELETE',headers:{'Prefer':'return=minimal'}})
      return true
    },
    async subscribe(_topic:string, callback:(event:any)=>void):Promise<()=>Promise<void>>{
      // HTTP polling fallback while Realtime replication/publication is not configured.
      // Always refetch through RLS rather than trusting a browser-supplied record.
      let alive=true
      const notify = () => { if(alive && document.visibilityState === 'visible') callback({action:'update',record:{}}) }
      const interval=setInterval(notify,(name === 'seasonal_campaigns' || name === 'landing_stories') ? 3000 : 12000)
      window.addEventListener('focus', notify)
      document.addEventListener('visibilitychange', notify)
      return async()=>{
        alive=false;clearInterval(interval)
        window.removeEventListener('focus', notify)
        document.removeEventListener('visibilitychange', notify)
      }
    },
    async authWithPassword(email:string,password:string){
      if(name!=='users')throw new Error('Autenticação não disponível nesta coleção')
      const body=await request('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})},false)
      const next:AuthToken={access_token:body.access_token,refresh_token:body.refresh_token,expires_at:Math.floor(Date.now()/1000)+body.expires_in,user:body.user}
      setSession(next)
      try{await this.authRefresh()}catch(error){setSession(null);throw error}
      return {record:session?.user,token:session?.access_token}
    },
    async authRefresh(){
      if(name!=='users'||!session?.refresh_token)throw new Error('Sessão inexistente')
      await ensureOperatorSession()
      const user:Operator=await request('/auth/v1/user',{},true)
      const q=new URLSearchParams({select:'role',tenant_id:'eq.'+tenantId,user_id:'eq.'+user.id,active:'eq.true',limit:'1'})
      const membership=await request('/rest/v1/tenant_memberships?'+q)
      if(!Array.isArray(membership)||!membership.length)throw new Error('Conta sem autorização no Loyola’s Lanches.')
      setSession({...session!,user:{...user,role:membership[0].role}})
      return {record:session?.user,token:session?.access_token}
    },
    async requestPasswordReset(email:string){
      if(name!=='users')throw new Error('Recurso disponível somente para operadores')
      await request('/auth/v1/recover?redirect_to='+encodeURIComponent(window.location.origin+'/reset-password'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})},false)
      return true
    },
    async confirmPasswordReset(token:string,password:string,passwordConfirm:string){
      if(name!=='users')throw new Error('Recurso disponível somente para operadores')
      if(password.length<8||password!==passwordConfirm)throw new Error('Informe senhas iguais com no mínimo 8 caracteres.')
      const fragment=new URLSearchParams(window.location.hash.slice(1))
      let access=fragment.get('type')==='recovery'?fragment.get('access_token'):null
      if(!access&&token){
        const verified=await request('/auth/v1/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type:'recovery'})},false)
        access=verified?.access_token
      }
      if(!access)throw new Error('Link de recuperação ausente ou inválido. Solicite um novo e-mail.')
      await request('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+access},body:JSON.stringify({password})},false)
      setSession(null)
      window.history.replaceState(null,'',window.location.pathname)
    },
    async confirmVerification(token:string){return confirmEmailToken(token,'email')},
    async confirmEmailChange(token:string,_password:string){return confirmEmailToken(token,'email_change')},
  }
}
const pb={
  authStore,
  collection,
  files:{getURL(record:any,filename:string){
    if(!filename)return ''
    if(/^https?:\/\//.test(filename)||/^data:/.test(filename))return filename
    if(record?.image_path)return publicUrl(record.image_path)
    if(record?.media_path)return publicUrl(record.media_path)
    return ''
  }},
  async send<T=any>(path:string,opts:{method?:string;body?:unknown}={}):Promise<T>{
    if(path==='/backend/v1/delivery/routes'){
      return request('/functions/v1/delivery-routing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(opts.body||{})},true) as Promise<T>
    }
    if(path==='/backend/v1/vouchers/issue' || path==='/backend/v1/delivery/neighborhoods'){
      await ensureOperatorSession()
      return request('/rest/v1/rpc/'+(path.includes('vouchers')?'issue_voucher_batch':'save_delivery_neighborhoods'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...opts.body as object,p_tenant:tenantId})},true) as Promise<T>
    }
    if(path==='/backend/v1/delivery/lookup') opts={...opts,body:{...opts.body as object,action:'lookupNeighborhoods'}}
    if(path==='/backend/v1/vouchers/lookup') opts={...opts,body:{...opts.body as object,action:'lookupVoucher'}}
    if(path==='/backend/v1/orders/assign-courier'){
      const body=opts.body as any
      return toRow('orders',await storeOperation('assign_courier',String(body?.orderId||''),{motoboyId:body?.motoboyId||null,expectedMotoboyId:body?.expectedMotoboyId||null})) as T
    }
    if(path==='/backend/v1/orders/reject'||path==='/backend/v1/orders/delete'){
      return storeOperation('cancel_order',String((opts.body as any)?.orderId||''),{reason:path.endsWith('/reject')?'recusado pelo operador':'cancelado pelo operador'}) as Promise<T>
    }
    if(path!=='/backend/v1/orders/finalize' && path!=='/backend/v1/vouchers/lookup' && path!=='/backend/v1/delivery/lookup')throw new Error('Endpoint não migrado: '+path)
    try{
      return await request('/functions/v1/finalize-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(opts.body||{})},true) as T
    }catch(error:any){error.data=error.response||{error:error.message};throw error}
  },
  autoCancellation(_flag:boolean){/* PocketBase compatibility no-op */},
}
export default pb
