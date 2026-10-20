import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const context={exports:{}}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/persistence.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
const {savedFieldsMatch}=context.exports
test('gallery confirmation detects dropped photos and reordered galleries of nine or more images',()=>{
  const images=Array.from({length:12},(_,i)=>'photo-'+i)
  assert.equal(savedFieldsMatch({storyImages:images},{storyImages:[...images],storyP1:'Preserved'}),true)
  assert.equal(savedFieldsMatch({storyImages:images},{storyImages:images.slice(0,8)}),false)
  assert.equal(savedFieldsMatch({storyImages:images},{storyImages:[...images].reverse()}),false)
})
test('confirmation tolerates JSONB object key order but detects changed nested settings',()=>{
  const expected={heroSlides:[{title:'Lanche',image:'photo'}]}
  assert.equal(savedFieldsMatch(expected,{heroSlides:[{image:'photo',title:'Lanche'}]}),true)
  assert.equal(savedFieldsMatch(expected,{heroSlides:[{image:'old',title:'Lanche'}]}),false)
  assert.equal(savedFieldsMatch({storyImages:[]},{storyImages:[]}),true)
})
