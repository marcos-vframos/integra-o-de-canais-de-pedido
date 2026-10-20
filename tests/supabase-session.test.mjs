import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const original = readFileSync(new URL('../src/lib/supabase/compat.ts', import.meta.url), 'utf8')
const source = ts.transpileModule(original.replaceAll('import.meta.env', 'ENV'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const expired = () => ({access_token:'old',refresh_token:'refresh',expires_at:1,user:{id:'operator',role:'owner'}})
function adapter(saved, handler) {
  const store = new Map(saved ? [['loyolas_supabase_auth_v1',JSON.stringify(saved)]] : [])
  const calls=[]
  const context = {exports:{}, ENV:{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    URLSearchParams, File, FormData, crypto, setInterval, clearInterval,
    fetch:async(url,opts)=>{ calls.push({url,opts}); return handler(url,opts) },
  }
  vm.runInNewContext(source,context)
  return {pb:context.exports.default,...context.exports,calls,store}
}
const json = (body,status=200) => new Response(JSON.stringify(body),{status})
const renewed = () => json({access_token:'new',refresh_token:'rotated',expires_in:3600,user:{id:'operator'}})

test('expired session survives reload and concurrent writes refresh once',async()=>{
  let refreshes=0
  const a=adapter(expired(),async(url,opts)=>{
    if(url.includes('grant_type=refresh_token')) {refreshes++; await new Promise(r=>setTimeout(r,10)); return renewed()}
    assert.equal(opts.headers.Authorization,'Bearer new')
    return json([{id:'campaign',tenant_id:'tenant'}])
  })
  assert.equal(a.pb.authStore.hasSession,true)
  await Promise.all([a.pb.collection('seasonal_campaigns').update('campaign',{active:true}),a.pb.collection('landing_content').update('gallery',{data:{images:['one']}})])
  assert.equal(refreshes,1)
  assert.equal(a.pb.authStore.isValid,true)
  assert.equal(JSON.parse(a.store.get('loyolas_supabase_auth_v1')).refresh_token,'rotated')
})

test('private table is resolved after renewing expired operator session',async()=>{
  const a=adapter(expired(),async(url)=>url.includes('refresh_token')?renewed():json([]))
  await a.pb.collection('settings').getFullList()
  assert.ok(a.calls.at(-1).url.includes('/rest/v1/settings?'))
  assert.ok(!a.calls.at(-1).url.includes('storefront_settings'))
})

test('anonymous campaign writes and image uploads remain blocked',async()=>{
  const a=adapter(null,()=>{throw Error('Unexpected network write')})
  await assert.rejects(a.pb.collection('seasonal_campaigns').create({title:'test'}),/Entre no Gestor/)
  await assert.rejects(a.uploadLandingGalleryImage(new File(['x'],'test.png',{type:'image/png'})),/Entre no Gestor/)
  assert.equal(a.calls.length,0)
})

test('revoked refresh token clears session and prevents writes',async()=>{
  const a=adapter(expired(),()=>json({message:'revoked'},400))
  await assert.rejects(a.pb.collection('landing_content').update('gallery',{data:{}}),/revoked/)
  assert.equal(a.pb.authStore.hasSession,false)
  assert.equal(a.calls.length,1)
})

test('network failure preserves refresh token for a later retry',async()=>{
  const a=adapter(expired(),()=>{throw Error('offline')})
  await assert.rejects(a.ensureOperatorSession(),/conectar/)
  assert.equal(a.pb.authStore.hasSession,true)
})

test('logout during refresh cannot restore operator session',async()=>{
  let release
  const a=adapter(expired(),()=>new Promise(r=>{release=()=>r(renewed())}))
  const pending=a.ensureOperatorSession()
  a.pb.authStore.clear()
  release()
  await assert.rejects(pending,/Entre no Gestor/)
  assert.equal(a.pb.authStore.hasSession,false)
})

test('login without active tenant membership is denied and session removed',async()=>{
  const a=adapter(null,async(url)=>url.includes('grant_type=password')?renewed():url.includes('/auth/v1/user')?json({id:'operator'}):json([]))
  await assert.rejects(a.pb.collection('users').authWithPassword('operator@example.test','test'),/sem autorização/)
  assert.equal(a.pb.authStore.hasSession,false)
})

test('nine images upload through authenticated storage with unique paths',async()=>{
  const a=adapter({...expired(),expires_at:Date.now()/1000+3600},async(url,opts)=>{
    assert.ok(url.includes('/storage/v1/object/loyolas-public-media/'))
    assert.equal(opts.headers.Authorization,'Bearer old')
    return json({Key:'uploaded'})
  })
  const urls=await Promise.all(Array.from({length:9},(_,i)=>a.uploadLandingGalleryImage(new File(['image'],`${i}.png`,{type:'image/png'}))))
  assert.equal(new Set(urls).size,9)
  assert.equal(a.calls.length,9)
})
