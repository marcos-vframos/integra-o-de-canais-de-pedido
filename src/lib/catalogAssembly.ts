/** Exact recipe identity for generated defaults. A changed recipe must not reuse old artwork. */
export function recipeSignature(recipe?:{ingredientId:string;qty:number}[]):string {
 return [...(recipe||[])].map(r=>r.ingredientId+':'+Number(r.qty)).sort().join('|')
}
