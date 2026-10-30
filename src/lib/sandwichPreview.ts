import type { InventoryItem, MenuItem } from '@/types/loyolas'
import { breadKind, type BreadChoice } from './orderCustomization.ts'
export type SandwichLayer = {code:string;name:string;qty:number;unit?:string}
// Screen order is TOP to BOTTOM, the inverse of the approved kitchen assembly.
const order=['ing-batata-palha','ing-alface','ing-tomate','ing-cebola','ing-milho','ing-vinagrete','ing-queijo','ing-bacon','ing-calabresa','ing-apresuntado','ing-catupiry','ing-cheddar','ing-ovo','ing-hamburguer','ing-carne-gourmet','ing-carne-max','ing-contrafile','ing-file-frango','ing-frango-desfiado','ing-linguica','ing-salsicha','ing-brocolis','ing-maionese','ing-maionese-casa','ing-molho','ing-ketchup','ing-mostarda']
export const isBreadSauce=(code:string)=>['ing-maionese','ing-maionese-casa','ing-molho','ing-ketchup','ing-mostarda'].includes(code)
const mainIngredients=new Set(['ing-hamburguer','ing-carne-gourmet','ing-carne-max','ing-contrafile','ing-file-frango','ing-frango-desfiado','ing-linguica','ing-salsicha','ing-brocolis'])
export function sandwichPreviewLayers(item:MenuItem, removed:Record<string,boolean>, added:Record<string,number>, resolve:(id:string)=>InventoryItem|undefined, freeChoice='none'):SandwichLayer[] {
 const rows=new Map<string,SandwichLayer>()
 const add=(id:string,qty:number)=>{const stock=resolve(id);if(!stock||stock.group!=='Ingrediente'||breadKind(id,resolve)||/^ing-(refri|agua|suco)/.test(stock.code||id))return
 const code=stock.code||stock.id,existing=rows.get(code);rows.set(code,{code,name:stock.name,unit:stock.unit,qty:(existing?.qty||0)+Math.max(0,Number(qty)||0)})}
 for(const r of item.recipe||[]){const stock=resolve(r.ingredientId),key=stock?.code||stock?.id||r.ingredientId;if(!removed[key]&&!removed[r.ingredientId])add(r.ingredientId,r.qty)}
 for(const [id,qty] of Object.entries(added))add(id,qty)
 if(freeChoice==='catupiry'||freeChoice==='cheddar')add('ing-'+freeChoice,1)
 const primary=new Set((item.recipe||[]).map(r=>resolve(r.ingredientId)?.code||r.ingredientId).filter(code=>mainIngredients.has(code)))
 const rank=(code:string)=>primary.has(code)?order.length+1:order.includes(code)?order.indexOf(code):order.length
 return [...rows.values()].filter(row=>row.qty>0).sort((a,b)=>rank(a.code)-rank(b.code))
}
export const previewBreadLabel=(choice:BreadChoice)=>choice==='frances'?'Pão Francês':'Pão de Hambúrguer'
