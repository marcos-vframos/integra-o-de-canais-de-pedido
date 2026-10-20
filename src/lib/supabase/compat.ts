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
// Serialize refreshes: gallery uploads and polling can request a token concurrently.
let refreshing: Promise<void> | null = null
async function refreshSession(force = false): Promise<void> {
  if (!session?.refresh_token) return
  if (!force && Number(session.expires_at || 0) > Date.now()/1000 + 60) return
  if (refreshing) return refreshing
  const previous = session
  refreshing = (async () => {
    try {
      const next = await request('/auth/v1/token?grant_type=refresh_token', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:previous.refresh_token}),
      }, false)
      // A response arriving after logout must never restore the previous session.
      if (session !== previous) return
      setSession({access_token:next.access_token,refresh_token:next.refresh_token,
        expires_at:Math.floor(Date.now()/1000)+next.expires_in,
        user:{...next.user,role:previous.user?.role}})
    } catch (error: any) {
      if (session === previous && [400,401,403].includes(error?.status)) setSession(null)
      throw error
    }
  })().finally(() => { refreshing = null })
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
    ticketNumber:'ticket_number',deliveryFee:'delivery_fee',deliveryFeeRegion:'delivery_fee_region',
    customerName:'customer_name',customerPhone:'customer_phone',customerAddress:'customer_address',
    deliveryType:'delivery_type',deliveryLat:'delivery_lat',deliveryLng:'delivery_lng',
    customerId:'customer_id',motoboyId:'motoboy_id',motoboyName:'motoboy_name',
    campaignId:'campaign_id',paymentDetails:'payment_details',clientRequestId:'idempotency_key',
    invoiceRequested:'invoice_requested',invoiceDocument:'invoice_document',invoiceStatus:'invoice_status',
  },
  customers:{lastOrderAt:'last_order_at',totalOrders:'total_orders',totalSpent:'total_spent',favoriteItems:'favorite_items'},
  motoboys:{feePerDelivery:'fee_per_delivery'},
  delivery_fees:{areaGeojson:'area_geojson'},
  campaigns:{
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
const publicSettings=new Set(['store_name','is_open','force_open','force_closed','pix_key'])
const tableOf=(name:string)=>{
  if(name==='settings'&&!authStore.isValid)return 'storefront_settings'
  if(name==='inventory'&&!authStore.isValid)return 'catalog_inventory'
  return name
}
const urlFor=(path:string)=>serverUrl+path
const request=async(path:string, options:RequestInit={},preferAuth=true)=>{
  if(!backendConfigured)throw new Error(backendConfigMessage)
  if (preferAuth) await refreshSession()
  const headers:Record<string,string>={apikey:publishableKey,...(options.headers as Record<string,string> ||{})}
  if(preferAuth&&authStore.isValid) headers.Authorization='Bearer '+authStore.token
  else headers.Authorization='Bearer '+publishableKey
  let response:Response
  try {response=await fetch(urlFor(path),{...options,headers,cache:'no-store'})}
  catch {throw new Error('Não foi possível conectar ao Supabase. Verifique sua internet.')}
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
    payload[mapped] = value
  }
  return payload
}
const publicUrl=(path:string)=>/^https?:\/\//.test(path)?path:
  urlFor('/storage/v1/object/public/loyolas-public-media/'+path.split('/').map(encodeURIComponent).join('/'))
async function upload(collection:string, file:File, section:string){
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
export async function uploadLandingGalleryImage(file: File): Promise<string> {
  await ensureOperatorSession()
  if (!file.type.startsWith('image/')) throw new Error('Selecione somente imagens JPG, PNG, WebP ou GIF.')
  const path=await upload('landing_content',file,'landing')
  return publicUrl(path)
}

const collection=(name:string)=>{
  const apiPath=async()=>{ await refreshSession(); return '/rest/v1/'+tableOf(name) }
  return {
    async getFullList<T=any>(opts?:{filter?:string;sort?:string;expand?:string;fields?:string}):Promise<T[]>{
      if(name==='users')throw new Error('A coleção users foi substituída pelo Supabase Auth.')
      const q=new URLSearchParams({select:'*',tenant_id:'eq.'+tenantId})
      extractWhere(name,opts?.filter,q)
      if(opts?.sort){
        q.set('order',opts.sort.split(',').map(s=>(s.startsWith('-')?cols(name,s.slice(1))+'.desc':cols(name,s)+'.asc')).join(','))
      }
      const result=await request((await apiPath())+'?'+q)
      return (Array.isArray(result)?result:[]).map(x=>toRow(name,x)) as T[]
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
      if(['orders','customers','closures','users'].includes(name))
        throw new Error('Esta operação exige uma API segura dedicada; gravação direta bloqueada.')
      const raw:JsonRow=data instanceof FormData?Object.fromEntries(data.entries()):{...data}
      if(name==='landing_content'&&raw.image instanceof File)raw.image_path=await upload(name,raw.image,String(raw.section||'landing'))
      if(name==='seasonal_campaigns'&&raw.media instanceof File)raw.media_path=await upload(name,raw.media,'campaigns')
      for(const key of ['data','palette','images','recipe','items','offer']){
        if(typeof raw[key]==='string')try{raw[key]=JSON.parse(raw[key])}catch { /* Preserve non-JSON legacy values. */ }
      }
      const payload=fromRow(name,raw)
      if(raw.image_path)payload.image_path=raw.image_path
      if(raw.media_path)payload.media_path=raw.media_path
      const q=new URLSearchParams({select:'*'})
      const rows=await request((await apiPath())+'?'+q,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)})
      return toRow(name,Array.isArray(rows)?rows[0]:rows) as T
    },
    async update<T=any>(id:string,data:FormData|Record<string,any>):Promise<T>{
      await ensureOperatorSession()
      if(['orders','customers','closures','users'].includes(name))
        throw new Error('Esta operação exige permissão específica do servidor; alteração direta bloqueada.')
      const raw:JsonRow=data instanceof FormData?Object.fromEntries(data.entries()):{...data}
      if(name==='landing_content'&&raw.image instanceof File)raw.image_path=await upload(name,raw.image,String(raw.section||'landing'))
      if(name==='seasonal_campaigns'&&raw.media instanceof File)raw.media_path=await upload(name,raw.media,'campaigns')
      for(const key of ['data','palette','images','recipe','items','offer']){
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
      const interval=setInterval(()=>{if(alive&&document.visibilityState==='visible')callback({action:'update',record:{}})},12000)
      return async()=>{alive=false;clearInterval(interval)}
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
      let user:Operator
      try {user=await request('/auth/v1/user',{},true)}
      catch(error: any){
        if (error?.status !== 401) throw error
        await refreshSession(true)
        user=await request('/auth/v1/user',{},true)
      }
      const q=new URLSearchParams({select:'role',tenant_id:'eq.'+tenantId,user_id:'eq.'+user.id,active:'eq.true',limit:'1'})
      const membership=await request('/rest/v1/tenant_memberships?'+q)
      if(!Array.isArray(membership)||!membership.length)throw new Error('Conta sem autorização no Loyola’s Lanches.')
      setSession({...session!,user:{...user,role:membership[0].role}})
      return {record:session?.user,token:session?.access_token}
    },
    async requestPasswordReset(email:string){
      if(name!=='users')throw new Error('Recurso disponível somente para operadores')
      await request('/auth/v1/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})},false)
      return true
    },
    async confirmPasswordReset(_token?:string, _password?:string, _passwordConfirm?:string){
      throw new Error('Use o link de recuperação enviado pelo Supabase Auth; o token antigo do PocketBase não é compatível.')
    },
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
    if(path!=='/backend/v1/orders/finalize')throw new Error('Endpoint não migrado: '+path)
    if(!backendConfigured)throw new Error(backendConfigMessage)
    const headers:Record<string,string>={'Content-Type':'application/json',apikey:publishableKey}
    if(authStore.isValid)headers.Authorization='Bearer '+authStore.token
    const res=await fetch(urlFor('/functions/v1/finalize-order'),{
      method:'POST',headers,body:JSON.stringify(opts.body||{}),cache:'no-store',
    })
    const data=await res.json().catch(()=>({error:'Resposta inválida do servidor de pedidos'}))
    if(!res.ok)throw Object.assign(new Error(data.error||'Não foi possível finalizar o pedido'),{status:res.status,data})
    return data as T
  },
  autoCancellation(_flag:boolean){/* PocketBase compatibility no-op */},
}
export default pb
