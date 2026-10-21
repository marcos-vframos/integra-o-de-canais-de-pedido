// Loyola's Lanches — anonymous checkout / authenticated cashier.
// All monetary validation and stock updates are done in one PostgreSQL RPC transaction.
import { createClient } from 'npm:@supabase/supabase-js@2'

const tenantId = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'
const allowed = new Set([
  'https://integracao-de-canais-de-pedido.vercel.app',
  'https://integracao-de-canais-de-pedido-git-feat-su-4e4eaa-sync-squad-hq.vercel.app',
  'https://loyolas-gestao-independente-git-feat-supab-9fd0ee-sync-squad-hq.vercel.app',
  'https://loyolas-gestao-independente.vercel.app',
  'https://integracao-de-canais-de-pedido-git-fix-pal-cf6777-sync-squad-hq.vercel.app',
  'https://loyolas-gestao-independente-git-fix-paleta-d5e642-sync-squad-hq.vercel.app',
])
function cors(request: Request) {
  const origin = request.headers.get('origin') || ''
  if (origin && !allowed.has(origin) && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
function reply(request: Request, status: number, content: object) {
  const headers = cors(request)
  return new Response(JSON.stringify(content), {
    status,
    headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',...(headers||{}) },
  })
}
Deno.serve(async(request: Request) => {
  const headers = cors(request)
  if (!headers) return reply(request,403,{error:'Origem não autorizada'})
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers})
  if (request.method!=='POST') return reply(request,405,{error:'Método não permitido'})
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength>65536) return reply(request,413,{error:'Pedido muito grande'})
  let payload: Record<string,unknown>
  try {
    const raw=await request.text()
    if (raw.length>65536) return reply(request,413,{error:'Pedido muito grande'})
    payload=JSON.parse(raw)
    if (!payload || typeof payload!=='object' || Array.isArray(payload)) throw Error('Invalid JSON')
  } catch { return reply(request,400,{error:'JSON inválido'}) }

  const url=Deno.env.get('SUPABASE_URL')
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !secret) return reply(request,503,{error:'Servidor de pedidos ainda não configurado'})
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  if(payload.action==='lookupNeighborhoods') {
    const points=payload.points
    if(!Array.isArray(points)||points.length<3||points.length>100||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<-23.2||p[0]>-22.6||p[1]<-45.9||p[1]>-45.1))
      return reply(request,422,{error:'Delimite uma área válida em Pindamonhangaba (3 a 100 pontos).'})
    const poly=points.map(p=>p.join(' ')).join(' ')
    const query='[out:json][timeout:10];nwr["place"~"suburb|neighbourhood|quarter"](poly:"'+poly+'");out center;'
    for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']) {
      try {
        const response=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}})
        if(!response.ok)continue
        const data=await response.json()
        const neighborhoods=(data.elements||[]).flatMap((e:any)=>{
          const lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon
          return typeof e.tags?.name==='string'&&Number.isFinite(lat)&&Number.isFinite(lng)?[{name:e.tags.name,lat,lng,fee:0}]:[]
        })
        return reply(request,200,{neighborhoods,source:'OpenStreetMap',coverage:'mapped'})
      }catch{ /* Read-only fallback to the second public map endpoint. */ }
    }
    return reply(request,503,{error:'Consulta aos bairros indisponível. Importe limites oficiais ou inclua os bairros manualmente.'})
  }
  if(payload.action==='lookupVoucher') {
    const code=String(payload.code||'').trim().toUpperCase()
    if(!/^LOY-[A-F0-9]{6,10}$/.test(code))return reply(request,422,{error:'Código inválido'})
    const {data:v,error}=await admin.from('campaigns').select('id,title,description,type,discount_percent,discount_amount,target_product_id,target_product_name,customer_phone,expires_at').eq('tenant_id',tenantId).eq('voucher_code',code).eq('active',true).eq('used',false).maybeSingle()
    const phone=String(payload.customerPhone||'').replace(/\D/g,'')
    if(error||!v||(v.expires_at&&new Date(v.expires_at).getTime()<=Date.now())||(v.customer_phone&&v.customer_phone.replace(/\D/g,'')!==phone))return reply(request,422,{error:'Código inválido, expirado ou indisponível para este telefone'})
    return reply(request,200,{id:v.id,title:v.title,description:v.description,type:v.type,discountPercent:Number(v.discount_percent),discountAmount:Number(v.discount_amount),targetProductId:v.target_product_id,targetProductName:v.target_product_name,expiresAt:v.expires_at,active:true,used:false})
  }
  const origin=payload.origin==='balcao'?'balcao':'online'
  let operatorId: string|null=null
  if (origin==='balcao') {
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim()
    if (!token) return reply(request,401,{error:'Entre no Gestor para finalizar pedidos de balcão'})
    const {data:{user},error:authError}=await admin.auth.getUser(token)
    if (authError || !user) return reply(request,401,{error:'Sessão inválida'})
    const {data:membership,error:membershipError}=await admin.from('tenant_memberships')
      .select('id').eq('tenant_id',tenantId).eq('user_id',user.id).eq('active',true)
      .in('role',['owner','manager','cashier']).maybeSingle()
    if (membershipError || !membership) return reply(request,403,{error:'Sem permissão para operar o caixa'})
    operatorId=user.id
  } else {
    if (typeof payload.customerName!=='string' || typeof payload.customerPhone!=='string')
      return reply(request,422,{error:'Informe nome e telefone'})
  }
  // A stable idempotency key is essential, especially when a mobile connection retries.
  if (!payload.clientRequestId && origin==='balcao') payload.clientRequestId='ord-'+crypto.randomUUID()
  if (!payload.clientRequestId || typeof payload.clientRequestId!=='string'
      || !/^ord-[A-Za-z0-9-]{18,76}$/.test(payload.clientRequestId))
    return reply(request,422,{error:'Identificador seguro do pedido obrigatório'})
  if (!Array.isArray(payload.items) || payload.items.length<1 || payload.items.length>40)
    return reply(request,422,{error:'Carrinho vazio ou inválido'})
  try {
    const { data, error } = await admin.rpc('checkout_finalize_order',{
      p_tenant:tenantId,
      p_payload:payload,
      p_operator:operatorId,
    })
    if (error) {
      // Do not return database diagnostics. Surface controlled business validation errors.
      const message=error.message||'Falha na validação do pedido'
      const safe=/^(Loja |Pedido |Carrinho |Produto |Quantidade |Origem |Identificador |Informe |Endereço |Tipo |Remoções |Adicionais |Receita |Ingrediente |Pão |Troca |Porção |Adicional |Cortesia |Selecione |Coordenadas |Cupom |Forma |Estoque |Sabor |Bebidas |Acesso )/.test(message)
        ? message : 'O servidor não conseguiu finalizar o pedido. Confira os dados.'
      console.error('Checkout validation failed',error.code||'unknown')
      return reply(request,422,{error:safe})
    }
    if (!data?.success) return reply(request,500,{error:'Pedido não confirmado'})
    return reply(request,200,data)
  } catch(e) {
    console.error('Checkout failed:',e instanceof Error?e.name:'unknown')
    return reply(request,503,{error:'Serviço temporariamente indisponível'})
  }
})
