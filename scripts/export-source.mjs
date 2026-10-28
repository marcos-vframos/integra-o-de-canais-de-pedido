import {readFile,readdir,writeFile,mkdir,lstat} from 'node:fs/promises'
import {createCipheriv,randomBytes,createHash} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
import path from 'node:path'
export const allowedRoots=['src','public','supabase','pocketbase','scripts','docs','deploy','tests']
export function exportable(file){return !file.split('/').some(p=>p.startsWith('.')||['node_modules','dist','dist-gestao','dev-dist','downloads','backups','dumps','credentials'].includes(p))&&!/\.(pem|key|p12|pfx|sqlite|db|zip|enc|log)$/i.test(file)&&!/(^|\/)(secrets?|service[_-]?role|credentials?)(\.|\/|$)/i.test(file)}
export async function exportSource({root=process.cwd(),out=path.join(root,'dist-gestao/downloads'),key=process.env.SOURCE_EXPORT_KEY}={}){
 if(!key){await mkdir(out,{recursive:true});await writeFile(path.join(out,'source-code.json'),JSON.stringify({available:false}));console.log('Source export: build key not configured.');return}
 if(!/^[0-9a-f]{64}$/.test(key))throw Error('Invalid source export build key')
 const files={}
 async function collect(relative){if(!exportable(relative))return;const full=path.join(root,relative),info=await lstat(full);if(info.isSymbolicLink())return;if(info.isDirectory()){for(const name of (await readdir(full)).sort())await collect(relative+'/'+name)}else if(info.isFile())files['loyola-sistema-completo/'+relative]=new Uint8Array(await readFile(full))}
 for(const folder of allowedRoots)await collect(folder)
 for(const file of ['README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','bun.lockb','index.html','components.json','postcss.config.js','tailwind.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vite.config.ts','vercel.json','railway.toml','netlify.toml']){try{await collect(file)}catch(e){if(e.code!=='ENOENT')throw e}}
 // Deliberately omit credentials, .env files, git history, cached builds and database contents.
 files['loyola-sistema-completo/LEIA-PRIMEIRO.txt']=strToU8('Código completo da versão publicada. Sem credenciais e sem dados operacionais. Instale com pnpm install --frozen-lockfile. Configure as variáveis do seu ambiente e siga README.md e docs/PAINEL_DE_CONTROLE.md. Os arquivos SQL são estrutura/migrações; não representam backup dos clientes.\n')
 const zip=zipSync(files,{level:6}),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv),encrypted=Buffer.concat([cipher.update(zip),cipher.final(),cipher.getAuthTag()])
 const version=(process.env.VERCEL_GIT_COMMIT_SHA||'local').slice(0,12),keyId=createHash('sha256').update(Buffer.from(key,'hex')).digest('hex')
 await mkdir(out,{recursive:true});await writeFile(path.join(out,'source-code.enc'),encrypted);await writeFile(path.join(out,'source-code.json'),JSON.stringify({format:'aes-256-gcm',iv:iv.toString('hex'),keyId,sha256:createHash('sha256').update(encrypted).digest('hex'),version,files:Object.keys(files).length,createdAt:new Date().toISOString()}))
 console.log('Encrypted complete-source package generated:',Object.keys(files).length,'files')
}
if(process.argv[1]===new URL(import.meta.url).pathname)await exportSource()
