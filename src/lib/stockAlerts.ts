export type StockRow = { id?: string; name: string; qty: number; min: number; unit: string }
export function lowStockRows(stock: StockRow[]) {
 return stock.filter(s=>Number(s.qty)<Number(s.min) || Number(s.qty)<=0).map(s=>({
 ingredientName:s.name,consumedQty:0,unit:s.unit,currentStock:Number(s.qty),minStock:Number(s.min),
 suggestedBuy:Math.max(0,Number(s.min)-Number(s.qty))
 })).sort((a,b)=>a.currentStock-b.currentStock || a.ingredientName.localeCompare(b.ingredientName,'pt-BR'))
}
export function escapeHtml(value: unknown) {
 return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
}
export function printShoppingList(rows: ReturnType<typeof lowStockRows>, dateLabel=new Date().toLocaleString('pt-BR')) {
 const win=window.open('','_blank')
 if(!win) return
 win.document.write('<!doctype html><html lang="pt-BR"><head><title>Lista de compras — Loyola</title><style>body{font:14px Arial;color:#111;margin:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px;text-align:left}@media print{button{display:none}}</style></head><body><h1>Loyola — Lista de compras</h1><p>'+escapeHtml(dateLabel)+'</p><table><thead><tr><th>Item / sabor</th><th>Atual</th><th>Mínimo</th><th>Repor até o mínimo</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>☐ '+escapeHtml(r.ingredientName)+'</td><td>'+r.currentStock+' '+escapeHtml(r.unit)+'</td><td>'+r.minStock+'</td><td>'+r.suggestedBuy+' '+escapeHtml(r.unit)+'</td></tr>').join('')+'</tbody></table>'+(rows.length?'':'<p>Nenhum item em falta ou abaixo do mínimo.</p>')+'<p>Reposição sugerida até o mínimo; ajuste conforme a previsão de vendas.</p><button onclick="window.print()">Imprimir</button></body></html>')
 win.document.close()
 win.focus()
 win.print()
}
