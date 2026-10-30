import {normalizeGoogleProfile} from '../_shared/googleBusinessProfile.ts'
const origins=new Set(['https://integracao-de-canais-de-pedido-git-feat-su-4e4eaa-sync-squad-hq.vercel.app','https://loyolas-gestao-independente-git-feat-supab-9fd0ee-sync-squad-hq.vercel.app','https://loyolaslanchespinda.vercel.app','https://integracao-de-canais-de-pedido.vercel.app','https://loyolas-gestao-independente.vercel.app'])
const snapshots=new Map<string,{profile:ReturnType<typeof normalizeGoogleProfile>;until:number}>()
const pending=new Map<string,Promise<ReturnType<typeof normalizeGoogleProfile>>>()
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'apikey, authorization, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Vary':'Origin'}
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
 if(origin&&!origins.has(origin))return reply(403,{error:'Origem não autorizada'})
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors})
 if(req.method!=='GET')return reply(405,{error:'Método não permitido'})
 const tenant=new URL(req.url).searchParams.get('tenant')||''
 if(!/^[0-9a-f-]{36}$/i.test(tenant))return reply(400,{error:'Empresa inválida'})
 const url=Deno.env.get('SUPABASE_URL')!,key=req.headers.get('apikey')||''
 if(!key)return reply(401,{error:'Identificação do aplicativo obrigatória'})
 try {
  const authorized=await fetch(url+'/rest/v1/menu?select=id&limit=0',{headers:{apikey:key},signal:AbortSignal.timeout(8000)})
  if(!authorized.ok)return reply(401,{error:'Identificação do aplicativo inválida'})
  // These credentials never live in tenant-readable tables or frontend environment variables.
  const config=JSON.parse(Deno.env.get('GOOGLE_BUSINESS_PROFILES_JSON')||'{}')[tenant]
  const clientId=Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID'),clientSecret=Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET')
  if(!config?.refreshToken||!/^locations\/\d+$/.test(config.locationName||'')||!config.timeZone||!clientId||!clientSecret)return reply(200,{configured:false,profile:null})
  for(const [id,value] of snapshots)if(value.until<=Date.now())snapshots.delete(id)
  const cached=snapshots.get(tenant)?.profile
  if(cached)return reply(200,{configured:true,profile:cached})
  try {
   const load=async()=>{
   const oauth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:config.refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(12000)})
   if(!oauth.ok)throw new Error('Google authorization failed')
   const token=await oauth.json();if(!token.access_token)throw new Error('Missing access token')
   const mask='name,title,storefrontAddress,regularHours,specialHours,phoneNumbers,metadata,openInfo'
   const response=await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/'+config.locationName+'?readMask='+mask,{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000)})
   if(!response.ok)throw new Error('Google read failed')
   const profile=normalizeGoogleProfile(await response.json(),config.timeZone)
   if(snapshots.size>=100)snapshots.delete(snapshots.keys().next().value!)
   snapshots.set(tenant,{profile,until:Date.now()+15*60*1000})
   // No Google content is persisted to the database or browser storage.
   const expiry=setTimeout(()=>{if(snapshots.get(tenant)?.profile===profile)snapshots.delete(tenant)},15*60*1000)
   ;(expiry as unknown as {unref?:()=>void}).unref?.()
   return profile
   }
   let request=pending.get(tenant)
   if(!request){request=load();pending.set(tenant,request)}
   try {return reply(200,{configured:true,profile:await request})}finally{if(pending.get(tenant)===request)pending.delete(tenant)}
  } catch {return reply(200,{configured:true,stale:true,profile:null,error:'Não foi possível atualizar as informações do Google'})}
 } catch {return reply(503,{configured:false,profile:null,error:'Integração Google indisponível'})}
})
