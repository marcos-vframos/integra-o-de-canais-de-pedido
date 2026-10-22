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
function adapter(saved, handler, overrides = {}) {
  const store = new Map(saved ? [['loyolas_supabase_auth_v1',JSON.stringify(saved)]] : [])
  const calls=[]
  const context = {exports:{}, ENV:{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    URLSearchParams, File, FormData, crypto, setInterval, clearInterval,
    fetch:async(url,opts)=>{ calls.push({url,opts}); return handler(url,opts) },
    ...overrides,
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


test('campaign creation sends null for optional empty FormData dates',async()=>{
  const a=adapter({...expired(),expires_at:Date.now()/1000+3600},async(_url,opts)=>{
    const body=JSON.parse(opts.body)
    assert.equal(body.start_date,null)
    assert.equal(body.end_date,null)
    return json([{id:'new-campaign',...body}])
  })
  const data=new FormData()
  data.append('title','Campanha sem prazo')
  data.append('startDate','')
  data.append('endDate','   ')
  await a.pb.collection('seasonal_campaigns').create(data)
  assert.equal(a.calls.length,1)
})

test('campaign update can remove dates and preserves a valid UTC timestamp',async()=>{
  const a=adapter({...expired(),expires_at:Date.now()/1000+3600},async(_url,opts)=>{
    const body=JSON.parse(opts.body)
    assert.equal(body.start_date,'2026-10-31T22:30:00.000Z')
    assert.equal(body.end_date,null)
    return json([{id:'campaign',...body}])
  })
  await a.pb.collection('seasonal_campaigns').update('campaign',{startDate:'2026-10-31T19:30:00-03:00',endDate:''})
})

test('invalid campaign dates are rejected before contacting the database',async()=>{
  const a=adapter({...expired(),expires_at:Date.now()/1000+3600},()=>{throw Error('Unexpected write')})
  await assert.rejects(a.pb.collection('seasonal_campaigns').create({title:'Invalid',startDate:'invalid'}),/data válida/)
  assert.equal(a.calls.length,0)
})


test('campaign activation and deactivation survive independent reads without changing its content',async()=>{
  let stored={id:'campaign',title:'Black do Loyola',active:false,start_date:null,end_date:null,offer:{},description:'Original'}
  const server=async(_url,opts)=>{
    if(opts.method==='PATCH') {
      const body=JSON.parse(opts.body)
      assert.deepEqual(Object.keys(body).sort(),['active','tenant_id'])
      stored={...stored,...body}
    }
    return json([stored])
  }
  const session={...expired(),expires_at:Date.now()/1000+3600}
  const operator=adapter(session,server)
  for(const active of [true,false]) {
    await operator.pb.collection('seasonal_campaigns').update('campaign',{active})
    const reloaded=await adapter(session,server).pb.collection('seasonal_campaigns').getOne('campaign')
    assert.equal(reloaded.active,active)
    assert.equal(reloaded.description,'Original')
    assert.equal(reloaded.startDate,null)
    assert.equal(reloaded.endDate,null)
  }
})

test('campaign subscription refreshes every three seconds and on return to a visible tab',async()=>{
  const window=new EventTarget()
  const document=Object.assign(new EventTarget(),{visibilityState:'visible'})
  let timer,period,cleared=false,notifications=0
  const a=adapter(null,()=>json([]),{
    window,document,setInterval:(fn,ms)=>{timer=fn;period=ms;return 42},clearInterval:id=>{assert.equal(id,42);cleared=true},
  })
  const unsubscribe=await a.pb.collection('seasonal_campaigns').subscribe('*',()=>{notifications++})
  assert.equal(period,3000)
  timer()
  window.dispatchEvent(new Event('focus'))
  assert.equal(notifications,2)
  document.visibilityState='hidden'
  timer()
  assert.equal(notifications,2)
  document.visibilityState='visible'
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(notifications,3)
  await unsubscribe()
  timer()
  window.dispatchEvent(new Event('focus'))
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(notifications,3)
  assert.equal(cleared,true)
})

test('a server-rejected access token renews and retries a write exactly once',async()=>{
 const a=adapter({...expired(),expires_at:Date.now()/1000+3600},async(url,opts)=>{
  if(url.includes('grant_type=refresh_token'))return renewed()
  if(opts.headers.Authorization==='Bearer old')return json({message:'JWT expired'},401)
  return json([{id:'item',name:'Persistido'}])
 })
 const saved=await a.pb.collection('menu').update('item',{name:'Persistido'})
 assert.equal(saved.name,'Persistido')
 assert.equal(a.calls.filter(c=>c.opts.method==='PATCH').length,2)
 assert.equal(a.calls.filter(c=>c.url.includes('refresh_token')).length,1)
})
test('refresh adopts a token rotated by another tab and an explicit storage logout',async()=>{
 const window=new EventTarget()
 const a=adapter(expired(),async()=>{throw Error('Old refresh token must not be used')},{window})
 a.store.set('loyolas_supabase_auth_v1',JSON.stringify({...expired(),access_token:'other-tab',refresh_token:'other-refresh',expires_at:Date.now()/1000+3600}))
 await a.ensureOperatorSession()
 assert.equal(a.pb.authStore.token,'other-tab')
 assert.equal(a.calls.length,0)
 a.store.delete('loyolas_supabase_auth_v1')
 const event=new Event('storage');Object.defineProperty(event,'key',{value:'loyolas_supabase_auth_v1'});window.dispatchEvent(event)
 assert.equal(a.pb.authStore.hasSession,false)
})
test('unconfirmed creation cannot report a successful save',async()=>{
 const a=adapter({...expired(),expires_at:Date.now()/1000+3600},async()=>json([]))
 await assert.rejects(a.pb.collection('menu').create({name:'Unconfirmed'}),/não confirmou a criação/)
})
test('failed refresh response cannot erase a newer session stored by another tab',async()=>{
 let a
 a=adapter(expired(),async()=>{
  a.store.set('loyolas_supabase_auth_v1',JSON.stringify({...expired(),access_token:'replacement',refresh_token:'replacement-refresh',expires_at:Date.now()/1000+3600}))
  return json({message:'old token already used'},400)
 })
 await a.ensureOperatorSession()
 assert.equal(a.pb.authStore.token,'replacement')
 assert.equal(a.pb.authStore.hasSession,true)
})
test('Web Locks serialize renewal across independent tabs sharing browser storage',async()=>{
 const shared=new Map([['loyolas_supabase_auth_v1',JSON.stringify(expired())]])
 const localStorage={getItem:k=>shared.get(k),setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)}
 let tail=Promise.resolve(),refreshes=0
 const navigator={locks:{request:(_name,fn)=>{const task=tail.then(fn);tail=task.catch(()=>{});return task}}}
 const handler=async(url)=>{assert.ok(url.includes('refresh_token'));refreshes++;await new Promise(r=>setTimeout(r,5));return renewed()}
 const first=adapter(null,handler,{localStorage,navigator}),second=adapter(null,handler,{localStorage,navigator})
 await Promise.all([first.ensureOperatorSession(),second.ensureOperatorSession()])
 assert.equal(refreshes,1)
 assert.equal(first.pb.authStore.token,'new')
 assert.equal(second.pb.authStore.token,'new')
})
