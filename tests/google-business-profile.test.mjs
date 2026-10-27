import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGoogleProfile,googleOpenStatus,googleWeeklyHours,profileUsable} from '../supabase/functions/_shared/googleBusinessProfile.ts'
const raw={title:'Loja teste',storefrontAddress:{addressLines:['Rua A, 10'],locality:'Pinda'},regularHours:{periods:[{openDay:'SATURDAY',closeDay:'SUNDAY',openTime:{hours:20},closeTime:{hours:2}}]}}
test('Google hours respect the business timezone and carry overnight into Sunday',()=>{
 const p=normalizeGoogleProfile(raw,'America/Sao_Paulo',new Date('2026-10-24T23:00:00Z'))
 assert.equal(googleOpenStatus(p,new Date('2026-10-25T04:30:00Z')).isOpen,true)
 assert.equal(googleOpenStatus(p,new Date('2026-10-25T05:00:00Z')).isOpen,false)
 assert.match(googleWeeklyHours(p).find(d=>d.dayIndex===6).hours,/20:00.*02:00/)
 assert.equal(p.address,'Rua A, 10, Pinda')
 assert.equal(profileUsable(p,Date.parse('2026-10-25T23:00:00Z')),false)
})
test('holiday closure cancels weekly opening and temporary closure overrides all periods',()=>{
 const p=normalizeGoogleProfile({...raw,specialHours:{specialHourPeriods:[{startDate:{year:2026,month:10,day:24},closed:true}]}},'America/Sao_Paulo')
 assert.equal(googleOpenStatus(p,new Date('2026-10-25T01:00:00Z')).isOpen,false)
 assert.equal(googleOpenStatus(p,new Date('2026-10-25T04:00:00Z')).isOpen,false)
 const closed={...p,businessStatus:'CLOSED_TEMPORARILY'}
 assert.equal(googleOpenStatus(closed,new Date('2026-10-25T01:00:00Z')).isOpen,false)
})
test('Google sync is read-only, rejects unrecognized callers and never exposes OAuth secrets',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;let handler,googleCalls=0
 const tenant='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'
 const env={SUPABASE_URL:'https://example.supabase.co',GOOGLE_BUSINESS_CLIENT_ID:'private-id',GOOGLE_BUSINESS_CLIENT_SECRET:'private-secret',GOOGLE_BUSINESS_PROFILES_JSON:JSON.stringify({[tenant]:{refreshToken:'private-refresh',locationName:'locations/123',timeZone:'America/Sao_Paulo'}})}
 globalThis.Deno={env:{get:key=>env[key]},serve:fn=>{handler=fn}}
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/rest/'))return new Response('[]',{status:init.headers.apikey==='valid'?200:401})
  googleCalls++
  if(String(url).includes('oauth2'))return Response.json({access_token:'private-access'})
  assert.equal(init.method,undefined)
  return Response.json(raw)
 }
 try {
  await import('../supabase/functions/google-business-profile/index.ts')
  const req=key=>new Request('https://edge.test?tenant='+tenant,{headers:{apikey:key}})
  assert.equal((await handler(req('bad'))).status,401)
  assert.equal((await handler(new Request('https://edge.test?tenant='+tenant,{headers:{origin:'https://evil.test',apikey:'valid'}}))).status,403)
  const response=await handler(req('valid')),body=await response.text()
  assert.equal(response.status,200);assert.match(body,/Loja teste/);assert.equal(body.includes('private-'),false)
  await handler(req('valid'));assert.equal(googleCalls,2,'Google calls coalesced through the short-lived cache')
  env.GOOGLE_BUSINESS_PROFILES_JSON='{}'
  const disconnected=await (await handler(req('valid'))).json();assert.equal(disconnected.configured,false);assert.equal(disconnected.profile,null)
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch}
})
