import React from 'react'
import { X, Download, Printer } from 'lucide-react'
import type { ClosureRecord } from '@/types/loyolas'
import { fmtBRL, PAYMENTS } from '@/lib/seeds'

interface ExportSummaryModalProps {
  type: 'day' | 'month'
  selectedDate: string // YYYY-MM-DD or YYYY-MM
  closures: ClosureRecord[]
  onClose: () => void
  onDownloadCSV: () => void
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  type,
  selectedDate,
  closures,
  onClose,
  onDownloadCSV,
}) => {
  const totalOrders = closures.reduce((s, c) => s + (c.ordersCount || 0), 0)
  const grossTotal = closures.reduce((s, c) => s + (c.grossTotal || 0), 0)
  const discountTotal = closures.reduce((s, c) => s + (c.discount || 0), 0)
  const netTotal = closures.reduce((s, c) => s + (c.netTotal ?? c.grossTotal ?? 0), 0)

  // Totais separados por origem
  const totalBalcaoOrders = closures.reduce((s, c) => s + (c.byOriginCount?.balcao || 0), 0)
  const totalOnlineOrders = closures.reduce((s, c) => s + (c.byOriginCount?.online || 0), 0)
  const totalBalcaoNet = closures.reduce((s, c) => s + (c.byOriginTotals?.balcao || 0), 0)
  const totalOnlineNet = closures.reduce((s, c) => s + (c.byOriginTotals?.online || 0), 0)

  const byPayment = PAYMENTS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = closures.reduce((sum, c) => sum + ((c.byPayment && c.byPayment[p]) || 0), 0)
    return acc
  }, {})

  // Aggregate product breakdown across closures
  const productMap: Record<string, { qty: number; total: number }> = {}
  closures.forEach((c) => {
    ;(c.productBreakdown || []).forEach((item) => {
      if (!productMap[item.name]) {
        productMap[item.name] = { qty: 0, total: 0 }
      }
      productMap[item.name].qty += item.qty
      productMap[item.name].total += item.total
    })
  })
  const aggregatedProducts = Object.entries(productMap)
    .map(([name, val]) => ({ name, qty: val.qty, total: val.total }))
    .sort((a, b) => b.total - a.total)

  // Title formatting
  const formattedTitle = () => {
    if (type === 'day') {
      const [y, m, d] = selectedDate.split('-')
      return `Resumo do Dia — ${d}/${m}/${y}`
    } else {
      const [y, m] = selectedDate.split('-')
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
      const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
      return `Resumo Mensal — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`
    }
  }

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div
        className="sc-modal max-w-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        <div className="sc-modal-header">
          <div>
            <div className="sc-modal-title">{formattedTitle()}</div>
            <p className="sc-sub" style={{ margin: '3px 0 0' }}>
              {closures.length} fechamento(s) incluído(s)
            </p>
          </div>
          <button className="sc-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        {closures.length === 0 ? (
          <p className="sc-empty">Nenhum fechamento encontrado para este período.</p>
        ) : (
          <div className="space-y-4">
            {/* Totais Gerais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="sc-pay-pill">
                Pedidos
                <b className="sc-tabular">{totalOrders}</b>
              </div>
              <div className="sc-pay-pill">
                Bruto
                <b className="sc-tabular">{fmtBRL(grossTotal)}</b>
              </div>
              <div className="sc-pay-pill">
                Descontos
                <b className="sc-tabular text-amber-400">{fmtBRL(discountTotal)}</b>
              </div>
              <div className="sc-pay-pill">
                Líquido
                <b className="sc-tabular text-emerald-400">{fmtBRL(netTotal)}</b>
              </div>
            </div>

            {/* SEPARAÇÃO BALCÃO vs ONLINE */}
            <div>
              <div className="sc-group-title" style={{ marginTop: 6 }}>
                Separação Contábil por Origem
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <span className="text-[11px] font-bold text-[var(--silver)] block uppercase">
                    Pedidos Balcão
                  </span>
                  <span className="text-xs text-[var(--muted)]">{totalBalcaoOrders} pedido(s)</span>
                  <span className="sc-tabular font-bold text-sm text-[var(--silver)] block mt-1">
                    {fmtBRL(totalBalcaoNet)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <span className="text-[11px] font-bold text-[var(--red)] block uppercase">
                    Pedidos Online
                  </span>
                  <span className="text-xs text-[var(--muted)]">{totalOnlineOrders} pedido(s)</span>
                  <span className="sc-tabular font-bold text-sm text-[var(--red)] block mt-1">
                    {fmtBRL(totalOnlineNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formas de pagamento */}
            <div>
              <div className="sc-group-title" style={{ marginTop: 6 }}>
                Formas de Pagamento
              </div>
              <div className="sc-pay-summary">
                {PAYMENTS.map((p) => (
                  <div className="sc-pay-pill" key={p}>
                    {p}
                    <b className="sc-tabular">{fmtBRL(byPayment[p] || 0)}</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Fechamentos detalhados */}
            <div>
              <div className="sc-group-title">Fechamentos do Período</div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {closures.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]"
                  >
                    <div>
                      <span className="font-semibold text-[var(--silver)]">
                        {new Date(c.closedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {c.dateLabel}
                      </span>
                      <span className="text-[var(--muted)] ml-2">
                        (
                        {c.byOriginCount
                          ? `${c.byOriginCount.balcao || 0} balcão · ${c.byOriginCount.online || 0} online`
                          : `${c.ordersCount} pedidos`}
                        )
                      </span>
                    </div>
                    <span className="sc-tabular font-bold text-[var(--red)]">
                      {fmtBRL(c.netTotal ?? c.grossTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos mais vendidos */}
            {aggregatedProducts.length > 0 && (
              <div>
                <div className="sc-group-title">Produtos Vendidos</div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {aggregatedProducts.map((p) => (
                    <div key={p.name} className="sc-breakdown-row">
                      <span>
                        {p.qty}x {p.name}
                      </span>
                      <span className="sc-tabular">{fmtBRL(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="sc-form-actions mt-4 pt-3 border-t border-[var(--line)]">
          <button
            className="sc-btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={onDownloadCSV}
            disabled={closures.length === 0}
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            className="sc-btn-ghost flex items-center justify-center gap-1.5"
            onClick={() => window.print()}
            disabled={closures.length === 0}
          >
            <Printer size={14} /> Imprimir
          </button>
          <button className="sc-btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
