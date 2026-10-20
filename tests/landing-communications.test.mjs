import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const { outputText } = ts.transpileModule(readFileSync(new URL('../src/lib/landingCommunications.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}})
const context={exports:{},URL}
vm.runInNewContext(outputText,context)
const {marqueeBlocks,selectedMessages,storyIsLive,safeStoryLink}=context.exports
test('all saved messages survive migration while at most twelve appear',()=>{
  const saved=Array.from({length:15},(_,i)=>'Mensagem '+i)
  const blocks=marqueeBlocks(undefined,saved)
  assert.equal(blocks.length,15)
  assert.equal(selectedMessages(blocks).length,12)
  blocks[0].selected=false;blocks[14].selected=true
  assert.equal(selectedMessages(blocks).includes('Mensagem 14'),true)
  assert.equal(selectedMessages(blocks).includes('Mensagem 0'),false)
  assert.equal(marqueeBlocks([],saved).length,0)
})
test('explicit deselection is preserved and does not restore fallback messages',()=>{
  const blocks=marqueeBlocks([{id:'a',text:'Atualizada',selected:false}],['Antiga'])
  assert.equal(selectedMessages(blocks).length,0)
  assert.equal(blocks[0].text,'Atualizada')
})
test('stories publish at their scheduled start and expire exactly 24 hours later',()=>{
  const start=Date.parse('2026-10-20T20:00:00Z'),row={active:true,starts_at:new Date(start).toISOString()}
  assert.equal(storyIsLive(row,start-1),false)
  assert.equal(storyIsLive(row,start),true)
  assert.equal(storyIsLive(row,start+86400000-1),true)
  assert.equal(storyIsLive(row,start+86400000),false)
  assert.equal(storyIsLive({...row,active:false},start),false)
  assert.equal(storyIsLive({...row,starts_at:null},start),false)
})
test('story links allow HTTPS and internal destinations but reject script and protocol-relative URLs',()=>{
  for(const link of ['javascript:alert(1)','//evil.com','data:text/html,test','http://example.com']) assert.equal(safeStoryLink(link),'')
  assert.equal(safeStoryLink('#cardapio'),'#cardapio')
  assert.equal(safeStoryLink('https://wa.me/5512991591915'),'https://wa.me/5512991591915')
})
