import {test} from 'node:test'
import assert from 'node:assert/strict'
import {approvedLandingImages} from '../src/lib/approvedLandingImages.ts'
test('cached generated galleries adopt approved images without changing operator uploads or captions',()=>{
 const source={images:['/images/catalog/c-xtudo-montagem-v2.webp','https://storage.example.com/loja/foto-real.jpg'],caption:'X-Tudo',carousel:true}
 const upgraded=approvedLandingImages(source)
 assert.deepEqual(upgraded,{...source,images:['/images/catalog/c-xtudo-montagem-v3.webp',source.images[1]]})
 assert.equal(source.images[0],'/images/catalog/c-xtudo-montagem-v2.webp')
})
test('listing thumbnails change with their covers while unrelated images stay unchanged',()=>{
 assert.equal(approvedLandingImages('/images/catalog/c-misto-montagem-v2-thumb.webp'),'/images/catalog/c-misto-montagem-v3-thumb.webp')
 assert.equal(approvedLandingImages('/images/catalog/x-paofrances-montagem-v2.webp'),'/images/catalog/x-paofrances-montagem-v2.webp')
 assert.equal(approvedLandingImages('/images/catalog/operator-custom.webp'),'/images/catalog/operator-custom.webp')
})
