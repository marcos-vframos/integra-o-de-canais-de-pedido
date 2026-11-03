import {GENERATED_CATALOG} from './generatedCatalogImages.ts'

const replacements:Record<string,string>={
 'https://img.usecurling.com/p/800/850?q=juicy+cheeseburger+bacon':'/images/catalog/c-xtudo-montagem-v3.webp',
 'https://img.usecurling.com/p/800/850?q=gourmet+burger+bacon':'/images/catalog/c-xcontrafiletudo-montagem-v3.webp',
 'https://img.usecurling.com/p/800/850?q=hot+dog+gourmet':'/images/catalog/h-xhotdogtudo-montagem-v3.webp',
 'https://img.usecurling.com/p/800/850?q=cheeseburger+melted+cheese':'/images/catalog/c-xbacon-montagem-v3.webp',
 'https://img.usecurling.com/p/600/600?q=gourmet+burger+bacon':'/images/catalog/c-xtudo-montagem-v3.webp',
 'https://img.usecurling.com/p/600/600?q=cheeseburger+melted+cheese':'/images/catalog/g-xburguergourmet-montagem-v3.webp',
 'https://img.usecurling.com/p/600/600?q=hot+dog+gourmet':'/images/catalog/h-xhotdogtudo-montagem-v3.webp',
 'https://img.usecurling.com/p/600/600?q=bacon+cheeseburger':'/images/catalog/c-xbacon-montagem-v3.webp',
 'https://img.usecurling.com/p/600/600?q=grilled+cheese+sandwich':'/images/catalog/c-misto-montagem-v3.webp',
 'https://img.usecurling.com/p/800/600?q=juicy+cheeseburger+bacon':'/images/catalog/c-xtudo-montagem-v3.webp',
}
for(const entry of Object.values(GENERATED_CATALOG))if(entry.src.includes('-montagem-v3')){
 replacements[entry.src.replace('-montagem-v3','-montagem-v2')]=entry.src
 replacements[entry.src.replace('-montagem-v3.webp','-montagem-v2-thumb.webp')]=entry.src.replace('.webp','-thumb.webp')
}
/** Upgrade known generated defaults, preserving all operator uploads and unrelated content. */
export function approvedLandingImages<T>(value:T):T{
 if(typeof value==='string')return (replacements[value]||value) as T
 if(Array.isArray(value))return value.map(approvedLandingImages) as T
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,approvedLandingImages(item)])) as T
 return value
}
