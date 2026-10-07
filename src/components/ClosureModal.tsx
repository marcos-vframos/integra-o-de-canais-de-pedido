import React from 'react'
import { X, Printer } from 'lucide-react'
import { fmtBRL, PAYMENTS } from '@/lib/seeds'

interface ClosureModalProps {
  isDraft: boolean
  view: {
    openedAt?: string | null
    closedAt: string
    grossTotal: number
    discount: number
    netTotal: number
    byPayment: Record<string, number>
    ordersCount: number
    productBreakdown: { name: string; qty: number; total: number }[]
    byOriginCount?: Record<string, number>
    byOriginTotals?: Record<string, number>
    shoppingReport?: {
      ingredientName: string
      consumedQty: number
      unit: string
      currentStock: number
      minStock: number
      suggestedBuy: number
    }[]
    dateLabel?: string
  }
  closingDiscount: string
  setClosingDiscount: (val: string) => void
  onClose: () => void
  onConfirm: () => void
  onPrint?: () => void
  justClosed?: boolean
  onDeclinePrint?: () => void
}

export const ClosureModal: React.FC<ClosureModalProps> = ({
  isDraft,
  view,
  closingDiscount,
  setClosingDiscount,
  onClose,
  onConfirm,
  onPrint,
  justClosed = false,
  onDeclinePrint,
}) => {
  const balcaoCount = view.byOriginCount?.balcao ?? 0
  const onlineCount = view.byOriginCount?.online ?? 0
  const balcaoTotal = view.byOriginTotals?.balcao ?? 0
  const onlineTotal = view.byOriginTotals?.online ?? 0

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div className="sc-modal-title">
            {justClosed
              ? 'Caixa fechado com sucesso!'
              : isDraft
                ? 'Fechamento de caixa'
                : `Fechamento — ${view.dateLabel || ''}`}
          </div>
          <button className="sc-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        {/* Pergunta de impressão quando acabado de fechar */}
        {justClosed ? (
          <div className="my-3 p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[rgba(225,6,0,0.15)] text-[var(--red)] shrink-0">
                <Printer size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[var(--silver)] mb-1">
                  Deseja imprimir o relatório do dia?
                </h4>
                <p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
                  Gere a impressão térmica ou em folha com o resumo dos pedidos balcão e online,
                  formas de pagamento e produtos vendidos no período encerrado.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="sc-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={onPrint}
                  >
                    <Printer size={13} />
                    Sim, imprimir relatório
                  </button>
                  <button
                    type="button"
                    className="sc-btn-ghost flex-1 py-2 text-xs font-semibold"
                    onClick={onDeclinePrint || onClose}
                  >
                    Não
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Detalhes do Fechamento / Período (formato térmico & resumo) */}
        <div className="receipt p-3 rounded-lg border border-[var(--line)] mb-3">
          <div className="receipt-center">
            <div className="receipt-name">RELATÓRIO DE FECHAMENTO</div>
            <div className="receipt-line text-xs text-[#555]">
              {view.dateLabel || new Date(view.closedAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <hr className="receipt-hr" />

          <p className="sc-sub my-1 text-[11px] text-[#333]">
            <b>Início:</b>{' '}
            {view.openedAt ? new Date(view.openedAt).toLocaleString('pt-BR') : 'Abertura'}
            <br />
            <b>Fim:</b> {new Date(view.closedAt).toLocaleString('pt-BR')}
          </p>

          <hr className="receipt-hr" />

          {/* DIFERENCIAÇÃO: Vendas Balcão e Vendas Online */}
          <div className="sc-group-title" style={{ marginTop: 4, color: '#111' }}>
            Origem das Vendas
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-xs">
            <div className="p-2 rounded bg-[#f5f5f5] border border-[#ddd] text-black">
              <span className="font-bold block text-[11px] uppercase tracking-wider text-[#555]">
                Balcão (Manual)
              </span>
              <span className="text-xs text-[#444] block mt-0.5">{balcaoCount} pedido(s)</span>
              <span className="sc-tabular font-bold text-sm text-[#111] block mt-1">
                {fmtBRL(balcaoTotal)}
              </span>
            </div>
            <div className="p-2 rounded bg-[#f5f5f5] border border-[#ddd] text-black">
              <span className="font-bold block text-[11px] uppercase tracking-wider text-[#e10600]">
                Pedidos Online
              </span>
              <span className="text-xs text-[#444] block mt-0.5">{onlineCount} pedido(s)</span>
              <span className="sc-tabular font-bold text-sm text-[#e10600] block mt-1">
                {fmtBRL(onlineTotal)}
              </span>
            </div>
          </div>

          <hr className="receipt-hr" />

          <div className="sc-group-title" style={{ marginTop: 4, color: '#111' }}>
            Produtos vendidos
          </div>
          {view.productBreakdown.length === 0 ? (
            <p className="sc-empty text-[#666]">Nenhum produto neste período.</p>
          ) : (
            view.productBreakdown.map((p) => (
              <div className="sc-breakdown-row text-black border-dashed border-[#ddd]" key={p.name}>
                <span>
                  {p.qty}x {p.name}
                </span>
                <span className="sc-tabular font-semibold">{fmtBRL(p.total)}</span>
              </div>
            ))
          )}

          <hr className="receipt-hr" />

          <div className="sc-group-title" style={{ color: '#111' }}>
            Formas de pagamento
          </div>
          <div className="sc-pay-summary my-2">
            {PAYMENTS.map((p) => (
              <div className="sc-pay-pill bg-[#f5f5f5] border-[#ddd] text-black" key={p}>
                {p}
                <b className="sc-tabular text-[#d11a2a]">{fmtBRL(view.byPayment[p] || 0)}</b>
              </div>
            ))}
          </div>

          <hr className="receipt-hr" />

          <div className="sc-summary-row text-black">
            <span>Total de pedidos no período</span>
            <span className="sc-tabular font-bold">{view.ordersCount}</span>
          </div>
          <div className="sc-summary-row text-black">
            <span>Total bruto</span>
            <span className="sc-tabular">{fmtBRL(view.grossTotal)}</span>
          </div>

          {isDraft ? (
            <div className="sc-field my-2">
              <label className="sc-label text-black">Descontos do período (R$)</label>
              <input
                className="sc-input bg-white text-black border-[#ccc]"
                value={closingDiscount}
                onChange={(e) => setClosingDiscount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
          ) : (
            <div className="sc-summary-row text-black">
              <span>Descontos</span>
              <span className="sc-tabular text-amber-600 font-semibold">
                {fmtBRL(view.discount)}
              </span>
            </div>
          )}

          <div className="sc-summary-row strong border-t border-black text-[#d11a2a]">
            <span>Total líquido</span>
            <span className="sc-tabular">{fmtBRL(view.netTotal)}</span>
          </div>

          {/* LISTA DE COMPRAS SUGERIDA / CONSUMO DO PERÍODO */}
          {view.shoppingReport && view.shoppingReport.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#ccc]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-black uppercase tracking-wider">
                  📋 Lista de Compras & Reposição ({view.shoppingReport.length} itens)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const printWin = window.open('', '_blank')
                    if (!printWin) return
                    const html = `
                      <html>
                        <head>
                          <title>Lista de Compras Loyola's - ${view.dateLabel || ''}</title>
                          <style>
                            body { font-family: monospace; font-size: 12px; margin: 20px; color: black; }
                            h2 { margin: 0 0 10px 0; font-size: 16px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                            th { background: #eee; }
                          </style>
                        </head>
                        <body>
                          <h2>LOYOLA'S LANCHES — LISTA DE REPOSIÇÃO / COMPRAS</h2>
                          <p>Período: ${view.dateLabel || new Date(view.closedAt).toLocaleDateString('pt-BR')}</p>
                          <table>
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Consumo</th>
                                <th>Estoque Atual</th>
                                <th>Mínimo</th>
                                <th>Sugerido Comprar</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${view.shoppingReport
                                .map(
                                  (r) => `
                                <tr>
                                  <td><b>${r.ingredientName}</b></td>
                                  <td>${r.consumedQty} ${r.unit}</td>
                                  <td>${r.currentStock} ${r.unit}</td>
                                  <td>${r.minStock} ${r.unit}</td>
                                  <td style="color: ${r.suggestedBuy > 0 ? '#d11a2a' : '#000'}; font-weight: bold;">
                                    ${r.suggestedBuy > 0 ? `${r.suggestedBuy} ${r.unit}` : 'OK'}
                                  </td>
                                </tr>`,
                                )
                                .join('')}
                            </tbody>
                          </table>
                          <script>window.print();</script>
                        </body>
                      </html>
                    `
                    printWin.document.write(html)
                    printWin.document.close()
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-black text-white text-[11px] font-bold cursor-pointer"
                >
                  Imprimir Lista de Compras
                </button>
              </div>
              <div className="space-y-1 text-[11px] text-[#333] max-h-40 overflow-y-auto">
                {view.shoppingReport.map((rep) => (
                  <div
                    key={rep.ingredientName}
                    className="flex items-center justify-between py-0.5 border-b border-dashed border-[#e5e5e5]"
                  >
                    <span>
                      {rep.ingredientName} (gastou: {rep.consumedQty} {rep.unit})
                    </span>
                    <span
                      className={
                        rep.suggestedBuy > 0
                          ? 'text-red-700 font-bold'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {rep.suggestedBuy > 0
                        ? `Comprar: ${rep.suggestedBuy} ${rep.unit}`
                        : 'Estoque OK'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de botões */}
        <div className="sc-form-actions">
          {justClosed ? (
            <button className="sc-btn-ghost w-full" onClick={onClose}>
              Concluir e fechar janela
            </button>
          ) : isDraft ? (
            <>
              <button className="sc-btn-primary" onClick={onConfirm}>
                Confirmar fechamento
              </button>
              <button className="sc-btn-ghost" onClick={onClose}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              {onPrint && (
                <button
                  type="button"
                  className="sc-btn-primary flex items-center justify-center gap-1.5"
                  onClick={onPrint}
                >
                  <Printer size={14} /> Imprimir relatório
                </button>
              )}
              <button className="sc-btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
