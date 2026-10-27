import type { InventoryItem, MenuItem } from '@/types/loyolas'
import { breadKind, type BreadChoice } from './orderCustomization.ts'
export type SandwichLayer = {code:string;name:string;qty:number}
const order=['ing-alface','ing-tomate','ing-cebola','ing-milho','ing-batata-palha','ing-ovo','ing-queijo','ing-cheddar','ing-catupiry','ing-bacon','ing-calabresa','ing-apresuntado','ing-hamburguer','ing-carne-gourmet','ing-contrafile','ing-file-frango','ing-frango-desfiado','ing-salsicha','ing-maionese','ing-ketchup','ing-mostarda']
export function sandwichPreviewLayers(item:MenuItem, removed:Record<string,boolean>, added:Record<string,number>, resolve:(id:string)=>InventoryItem|undefined, freeChoice='none'):SandwichLayer[] {
 const rows=new Map<string,SandwichLayer>()
 const add=(id:string,qty:number)=>{const stock=resolve(id);if(!stock||stock.group!=='Ingrediente'||breadKind(id,resolve)||/^ing-(refri|agua|suco)/.test(stock.code||id))return
 const code=stock.code||stock.id,existing=rows.get(code);rows.set(code,{code,name:stock.name,qty:(existing?.qty||0)+Math.max(0,Math.floor(Number(qty)||0))})}
 for(const r of item.recipe||[]){const stock=resolve(r.ingredientId),key=stock?.code||stock?.id||r.ingredientId;if(!removed[key]&&!removed[r.ingredientId])add(r.ingredientId,r.qty)}
 for(const [id,qty] of Object.entries(added))add(id,qty)
 if(freeChoice==='catupiry'||freeChoice==='cheddar')add('ing-'+freeChoice,1)
 return [...rows.values()].filter(row=>row.qty>0).sort((a,b)=>{const rank=(code:string)=>order.includes(code)?order.indexOf(code):order.length;return rank(a.code)-rank(b.code)})
}
export const previewBreadLabel=(choice:BreadChoice)=>choice==='frances'?'Pão Francês':'Pão de Hambúrguer'
