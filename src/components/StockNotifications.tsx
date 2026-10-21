import { useEffect, useRef } from 'react'
import type { InventoryItem } from '@/types/loyolas'
import { lowStockRows, printShoppingList } from '@/lib/stockAlerts'
export default function StockNotifications({stock}:{stock:InventoryItem[]}) {
 const rows=lowStockRows(stock)
 return <section className="space-y-4"><h2 className="sc-title">Notificações de estoque</h2>
 <p className="text-sm text-zinc-400">Alertas ativos: itens esgotados ou abaixo do mínimo. A lista acompanha o estoque e é atualizada após vendas e reposições.</p>
 <button type="button" className="sc-btn-primary" onClick={()=>printShoppingList(rows)}>Imprimir lista de compras ({rows.length})</button>
 {!rows.length?<p>Nenhum item abaixo do mínimo.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Item / sabor</th><th>Saldo</th><th>Mínimo</th><th>Repor</th></tr></thead><tbody>
 {rows.map(r=><tr key={r.ingredientName} className="border-b border-zinc-700"><td className="py-3">{r.ingredientName}{r.currentStock<=0?' — Esgotado':' — Estoque baixo'}</td><td>{r.currentStock} {r.unit}</td><td>{r.minStock}</td><td>{r.suggestedBuy} {r.unit}</td></tr>)}
 </tbody></table></div>}
 </section>
}
