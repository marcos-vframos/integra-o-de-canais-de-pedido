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
