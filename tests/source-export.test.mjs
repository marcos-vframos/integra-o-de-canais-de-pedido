import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {randomBytes,createDecipheriv,createHash} from 'node:crypto'
import {unzipSync,strFromU8} from 'fflate'
import {exportable,exportSource,allowedRoots} from '../scripts/export-source.mjs'
test('complete source export excludes credentials and builds and decrypts only with the matching key',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'loyola-export-'))
 try{
  for(const folder of allowedRoots)await mkdir(path.join(root,folder),{recursive:true})
  await writeFile(path.join(root,'src','main.ts'),'export const version=1')
  await writeFile(path.join(root,'.env'),'PRIVATE_TOKEN=not-for-export')
  await mkdir(path.join(root,'public','downloads'));await writeFile(path.join(root,'public','downloads','old.zip'),'old')
  const key=randomBytes(32),out=path.join(root,'output');await exportSource({root,out,key:key.toString('hex')})
  const manifest=JSON.parse(await readFile(path.join(out,'source-code.json'),'utf8')),encrypted=await readFile(path.join(out,'source-code.enc'))
  assert.equal(manifest.sha256,createHash('sha256').update(encrypted).digest('hex'))
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(manifest.iv,'hex'));decipher.setAuthTag(encrypted.subarray(-16));const zip=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);const files=unzipSync(zip)
  assert.equal(strFromU8(files['loyola-sistema-completo/src/main.ts']),'export const version=1');assert.equal(Object.keys(files).some(p=>p.includes('.env')||p.includes('old.zip')),false)
  const wrong=createDecipheriv('aes-256-gcm',randomBytes(32),Buffer.from(manifest.iv,'hex'));wrong.setAuthTag(encrypted.subarray(-16));wrong.update(encrypted.subarray(0,-16));assert.throws(()=>wrong.final())
  for(const file of ['.git/config','.env.local','supabase/.temp/token','public/downloads/code.zip','data.sqlite','secrets.json'])assert.equal(exportable(file),false,file)
 }finally{await rm(root,{recursive:true,force:true})}
})
