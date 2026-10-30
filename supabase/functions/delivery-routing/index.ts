import {createClient} from 'npm:@supabase/supabase-js@2'
import {roadRoute,roadMatrix,validRoadPoint} from '../_shared/roadRouting.ts'
import {selectFeeReference,feeForRoadRoute} from '../_shared/deliveryQuote.ts'
const tenant='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'
const allowed=new Set(['https://integracao-de-canais-de-pedido-git-feat-su-4e4eaa-sync-squad-hq.vercel.app','https://loyolas-gestao-independente-git-feat-supab-9fd0ee-sync-squad-hq.vercel.app','https://loyolaslanchespinda.vercel.app','https://integracao-de-canais-de-pedido.vercel.app','https://loyolas-gestao-independente.vercel.app'])
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||''
 const cors={'Access-Control-Allow-Origin':allowed.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
 if(origin&&!allowed.has(origin))return reply(403,{error:'Origem não autorizada'})
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors})
 if(req.method!=='POST')return reply(405,{error:'Método não permitido'})
 try{
  const raw=await req.text();if(raw.length>16384)return reply(413,{error:'Consulta muito grande'})
  const body=JSON.parse(raw),url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const apikey=req.headers.get('apikey')||''
  if(!apikey)return reply(401,{error:'Identificação do aplicativo obrigatória'})
  // Validate the caller's public API key with the project's Data API; no service credential is returned.
  const check=await fetch(url+'/rest/v1/menu?select=id&limit=0',{headers:{apikey,Authorization:req.headers.get('authorization')||'Bearer '+apikey},signal:AbortSignal.timeout(8000)})
  if(!check.ok)return reply(401,{error:'Sessão ou identificação do aplicativo inválida'})
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const configured=!!Deno.env.get('TOMTOM_ROUTING_API_KEY')
  if(body.action==='capabilities')return reply(200,{roadRouting:true,liveTraffic:configured,liveTrafficRequiresOperator:true})
  const {data:record,error}=await admin.from('landing_content').select('data').eq('tenant_id',tenant).eq('section','delivery_origin').maybeSingle()
  if(error)return reply(503,{error:'Não foi possível consultar a origem das entregas'})
  const start=record?.data||{lat:-22.9238,lng:-45.474,confirmed:false}
  if(!validRoadPoint(start))return reply(422,{error:'Defina uma origem válida no cadastro de taxas'})
  if(body.action==='quote'){
   if(!validRoadPoint(body.destination))return reply(422,{error:'Destino inválido'})
   const {data:company}=await admin.from('tenants').select('status').eq('id',tenant).single()
   if(!['ACTIVE','TRIAL'].includes(company?.status))return reply(422,{error:'Loja ainda não liberada para pedidos'})
   if(!start.confirmed)return reply(422,{error:'Confirme a origem das entregas no cadastro de taxas antes de calcular o frete.'})
   const {data:fees,error:feeError}=await admin.from('delivery_fees').select('id,name,fee,lat,lng,description').eq('tenant_id',tenant).eq('active',true)
   if(feeError)return reply(503,{error:'Não foi possível consultar as taxas'})
   const reference=selectFeeReference(fees||[],body.destination)
   const route=await roadRoute(start,body.destination)
   return reply(200,{route,fee:feeForRoadRoute(reference,route),nearestName:reference.name,origin:start})
  }
  if(body.action==='matrix'){
   if(!Array.isArray(body.targets)||body.targets.length<1||body.targets.length>50||body.targets.some((p:any)=>typeof p.id!=='string'||p.id.length>80||!validRoadPoint(p)))return reply(422,{error:'Lista de destinos inválida'})
   const result=await roadMatrix(start,body.targets)
   return reply(200,{origin:start,routes:body.targets.map((p:any,i:number)=>({id:p.id,route:result[i]}))})
  }
  if(body.action!=='route'||!validRoadPoint(body.destination))return reply(422,{error:'Destino inválido'})
  if(body.traffic===true){
   const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
   const {data:{user}}=await admin.auth.getUser(token)
   if(!user)return reply(401,{error:'Entre como operador para consultar trânsito ao vivo'})
   const {data:membership}=await admin.from('tenant_memberships').select('id').eq('tenant_id',tenant).eq('user_id',user.id).eq('active',true).in('role',['owner','manager','cashier']).maybeSingle()
   if(!membership)return reply(403,{error:'Operador sem permissão para consultar rotas'})
  }
  const route=await roadRoute(start,body.destination,{traffic:body.traffic===true,tomtomKey:Deno.env.get('TOMTOM_ROUTING_API_KEY')})
  return reply(200,{origin:start,route})
 }catch(error){return reply(503,{error:error instanceof Error?error.message:'Serviço de rotas indisponível'})}
})
