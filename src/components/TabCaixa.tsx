import React, { useState } from 'react'
import { Printer, Download, Calendar, FileText, Trash2, Store, Bike } from 'lucide-react'
import type { OrderRecord, ClosureRecord } from '@/types/loyolas'
import { PAYMENTS, fmtBRL, padTicket } from '@/lib/seeds'
import { ExportSummaryModal } from '@/components/ExportSummaryModal'

interface TabCaixaProps {
  orders: OrderRecord[]
  closures: ClosureRecord[]
  onOpenClosingPreview: () => void
  onOpenViewingClosure: (closure: ClosureRecord) => void
  onPrintOrderTicket: (order: OrderRecord) => void
  onDeleteClosure?: (id: string) => Promise<void>
  onDeleteOrder?: (id: string) => Promise<void>
}

export const TabCaixa: React.FC<TabCaixaProps> = ({
  orders,
  closures,
  onOpenClosingPreview,
  onOpenViewingClosure,
  onPrintOrderTicket,
  onDeleteClosure,
  onDeleteOrder,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteOrderConfirmId, setDeleteOrderConfirmId] = useState<string | null>(null)
  const [isDeletingOrderId, setIsDeletingOrderId] = useState<string | null>(null)

  const [exportModalType, setExportModalType] = useState<'day' | 'month' | null>(null)
  const todayStr = new Date().toISOString().slice(0, 10)
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const [selectedDay, setSelectedDay] = useState<string>(todayStr)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const lastClosureTime = closures.length ? closures[closures.length - 1].closedAt : null

  // Pedidos abertos desde o último fechamento (excluindo 'recusado')
  const openOrders = orders.filter((o) => {
    if (o.status === 'recusado') return false
    if (!lastClosureTime) return true
    const orderTime = o.created || ''
    return orderTime > lastClosureTime
  })

  // Separação por origem
  const openBalcaoOrders = openOrders.filter((o) => o.origin !== 'online')
  const openOnlineOrders = openOrders.filter((o) => o.origin === 'online')

  const openBalcaoTotal = openBalcaoOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const openOnlineTotal = openOnlineOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const openTotal = openOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)

  // Formas de pagamento balcão
  const byPaymentBalcao = PAYMENTS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = openBalcaoOrders
      .filter((o) => o.payment === p)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    return acc
  }, {})

  // Formas de pagamento online
  const byPaymentOnline = PAYMENTS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = openOnlineOrders
      .filter((o) => o.payment === p)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    return acc
  }, {})

  // Formas de pagamento agregadas
  const byPayment = PAYMENTS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = openOrders
      .filter((o) => o.payment === p)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    return acc
  }, {})

  const filteredClosuresForExport = closures.filter((c) => {
    if (!c.closedAt) return false
    const isoDate = new Date(c.closedAt).toISOString()
    if (exportModalType === 'day') {
      return isoDate.startsWith(selectedDay)
    }
    if (exportModalType === 'month') {
      return isoDate.startsWith(selectedMonth)
    }
    return true
  })

  // Download CSV com colunas de balcão e online
  const handleDownloadCSV = () => {
    const list = filteredClosuresForExport
    if (list.length === 0) return

    const isDay = exportModalType === 'day'
    const periodLabel = isDay ? `dia_${selectedDay}` : `mes_${selectedMonth}`
    const filename = `fechamentos_${periodLabel}.csv`

    const headers = [
      'ID Fechamento',
      'Data/Hora Fechamento',
      'Data Rótulo',
      'Qtd Pedidos Total',
      'Pedidos Balcão',
      'Líquido Balcão (R$)',
      'Pedidos Online',
      'Líquido Online (R$)',
      'Total Bruto (R$)',
      'Desconto (R$)',
      'Total Líquido (R$)',
      'Dinheiro (R$)',
      'Pix (R$)',
      'Cartão (R$)',
    ]

    const rows = list.map((c) => [
      c.id,
      `"${new Date(c.closedAt).toLocaleString('pt-BR')}"`,
      `"${c.dateLabel}"`,
      c.ordersCount || 0,
      c.byOriginCount?.balcao ?? 0,
      (c.byOriginTotals?.balcao ?? 0).toFixed(2).replace('.', ','),
      c.byOriginCount?.online ?? 0,
      (c.byOriginTotals?.online ?? 0).toFixed(2).replace('.', ','),
      (c.grossTotal || 0).toFixed(2).replace('.', ','),
      (c.discount || 0).toFixed(2).replace('.', ','),
      (c.netTotal ?? c.grossTotal ?? 0).toFixed(2).replace('.', ','),
      ((c.byPayment && c.byPayment['Dinheiro']) || 0).toFixed(2).replace('.', ','),
      ((c.byPayment && c.byPayment['Pix']) || 0).toFixed(2).replace('.', ','),
      ((c.byPayment && c.byPayment['Cartão']) || 0).toFixed(2).replace('.', ','),
    ])

    const totalOrders = list.reduce((s, c) => s + (c.ordersCount || 0), 0)
    const totalBalcao = list.reduce((s, c) => s + (c.byOriginCount?.balcao || 0), 0)
    const totalOnline = list.reduce((s, c) => s + (c.byOriginCount?.online || 0), 0)
    const totalBalcaoNet = list.reduce((s, c) => s + (c.byOriginTotals?.balcao || 0), 0)
    const totalOnlineNet = list.reduce((s, c) => s + (c.byOriginTotals?.online || 0), 0)
    const grossTotal = list.reduce((s, c) => s + (c.grossTotal || 0), 0)
    const discountTotal = list.reduce((s, c) => s + (c.discount || 0), 0)
    const netTotal = list.reduce((s, c) => s + (c.netTotal ?? c.grossTotal ?? 0), 0)
    const totalDinheiro = list.reduce(
      (s, c) => s + ((c.byPayment && c.byPayment['Dinheiro']) || 0),
      0,
    )
    const totalPix = list.reduce((s, c) => s + ((c.byPayment && c.byPayment['Pix']) || 0), 0)
    const totalCartao = list.reduce((s, c) => s + ((c.byPayment && c.byPayment['Cartão']) || 0), 0)

    rows.push([
      'TOTAL DO PERÍODO',
      '""',
      '""',
      totalOrders,
      totalBalcao,
      totalBalcaoNet.toFixed(2).replace('.', ','),
      totalOnline,
      totalOnlineNet.toFixed(2).replace('.', ','),
      grossTotal.toFixed(2).replace('.', ','),
      discountTotal.toFixed(2).replace('.', ','),
      netTotal.toFixed(2).replace('.', ','),
      totalDinheiro.toFixed(2).replace('.', ','),
      totalPix.toFixed(2).replace('.', ','),
      totalCartao.toFixed(2).replace('.', ','),
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sc-card">
      <h2 className="sc-title">Caixa & Contabilidade</h2>
      <p className="sc-sub">
        {lastClosureTime
          ? `Pedidos desde o último fechamento (${new Date(lastClosureTime).toLocaleString('pt-BR')}).`
          : 'Pedidos desde a abertura do expediente.'}
      </p>

      {/* DIFERENCIAÇÃO: DOIS BLOCOS LADO A LADO BALCÃO VS ONLINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Bloco Balcão */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--silver)] flex items-center gap-1.5">
              <Store size={14} className="text-amber-400" /> Pedidos Balcão (manuais)
            </span>
            <span className="sc-badge">{openBalcaoOrders.length} pedido(s)</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-[var(--muted)]">Total Balcão</span>
            <span className="sc-tabular font-bold text-lg text-[var(--silver)]">
              {fmtBRL(openBalcaoTotal)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
            {PAYMENTS.map((p) => (
              <div
                key={p}
                className="p-1.5 rounded bg-[var(--surface)] text-center border border-[var(--line)]/50"
              >
                <span className="text-[10px] text-[var(--muted)] block">{p}</span>
                <span className="sc-tabular font-semibold text-[var(--silver)]">
                  {fmtBRL(byPaymentBalcao[p] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco Online */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--red)] flex items-center gap-1.5">
              <Bike size={14} className="text-[var(--red)]" /> Pedidos Online
            </span>
            <span className="sc-badge low">{openOnlineOrders.length} pedido(s)</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-[var(--muted)]">Total Online</span>
            <span className="sc-tabular font-bold text-lg text-[var(--red)]">
              {fmtBRL(openOnlineTotal)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
            {PAYMENTS.map((p) => (
              <div
                key={p}
                className="p-1.5 rounded bg-[var(--surface)] text-center border border-[var(--line)]/50"
              >
                <span className="text-[10px] text-[var(--muted)] block">{p}</span>
                <span className="sc-tabular font-semibold text-[var(--silver)]">
                  {fmtBRL(byPaymentOnline[p] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo Consolidado por Forma de Pagamento */}
      <div className="sc-pay-summary">
        {PAYMENTS.map((p) => (
          <div className="sc-pay-pill" key={p}>
            {p}
            <b className="sc-tabular">{fmtBRL(byPayment[p] || 0)}</b>
          </div>
        ))}
      </div>

      {openOrders.length === 0 ? (
        <p className="sc-empty">Nenhum pedido registrado ainda neste período.</p>
      ) : (
        openOrders
          .slice()
          .sort((a, b) => (b.ticketNumber || 0) - (a.ticketNumber || 0))
          .map((o) => (
            <div className="sc-row" key={o.id}>
              <div className="sc-row-main">
                <div className="sc-row-name flex items-center gap-1.5 flex-wrap">
                  <span className="sc-ticket-badge">{padTicket(o.ticketNumber)}</span>
                  {o.origin === 'online' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30">
                      Online
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--surface-2)] text-[var(--muted)]">
                      Balcão
                    </span>
                  )}
                  <span>· {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}</span>
                </div>
                <div className="sc-row-meta">
                  {o.created
                    ? new Date(o.created).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}{' '}
                  · {o.payment}
                  {o.customerName && ` · Cliente: ${o.customerName}`}
                </div>
              </div>

              <div className="sc-row-actions">
                <span className="sc-row-name sc-tabular font-bold">{fmtBRL(o.total)}</span>
                <button
                  className="sc-icon-btn"
                  onClick={() => onPrintOrderTicket(o)}
                  aria-label="Imprimir pedido"
                  title="Imprimir comanda"
                >
                  <Printer size={13} />
                </button>

                {onDeleteOrder && (
                  <div className="inline-flex items-center">
                    {deleteOrderConfirmId === o.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="sc-btn-small danger text-[10px] py-0.5 px-2 h-7"
                          disabled={isDeletingOrderId === o.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setIsDeletingOrderId(o.id)
                            try {
                              await onDeleteOrder(o.id)
                            } finally {
                              setIsDeletingOrderId(null)
                              setDeleteOrderConfirmId(null)
                            }
                          }}
                        >
                          {isDeletingOrderId === o.id ? 'Excluindo…' : 'Excluir?'}
                        </button>
                        <button
                          type="button"
                          className="sc-btn-small text-[10px] py-0.5 px-1.5 h-7"
                          disabled={isDeletingOrderId === o.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteOrderConfirmId(null)
                          }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="sc-icon-btn hover:!border-red-500 hover:!text-red-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteOrderConfirmId(o.id)
                        }}
                        title="Remover comanda lançada por engano"
                        aria-label="Remover comanda"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
      )}

      {/* Linha consolidada somando os dois */}
      <div className="sc-cart-total">
        <span className="sc-cart-total-label">Total do período (Balcão + Online)</span>
        <span className="sc-cart-total-val sc-tabular">{fmtBRL(openTotal)}</span>
      </div>

      <button
        className="sc-btn-primary"
        disabled={openOrders.length === 0}
        onClick={onOpenClosingPreview}
      >
        Fechar caixa
      </button>

      {closures.length > 0 && (
        <div style={{ marginTop: 22 }} className="pt-4 border-t border-[var(--line)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="sc-title" style={{ fontSize: 17, marginBottom: 0, paddingBottom: 6 }}>
                Histórico de fechamentos
              </h3>
              <p className="sc-sub" style={{ margin: 0 }}>
                {closures.length} fechamento(s) arquivado(s).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="sc-btn-small flex items-center gap-1.5"
                onClick={() => setExportModalType('day')}
                title="Exportar resumo do dia"
              >
                <Calendar size={13} />
                Resumo do dia
              </button>
              <button
                className="sc-btn-small flex items-center gap-1.5"
                onClick={() => setExportModalType('month')}
                title="Exportar resumo mensal"
              >
                <FileText size={13} />
                Resumo do mês
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-2.5 mb-3 bg-[var(--surface-2)] rounded-lg border border-[var(--line)] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)]">Dia:</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="sc-input text-xs py-1 px-2 h-7 rounded"
              />
              <button
                className="sc-icon-btn h-7 w-7"
                onClick={() => setExportModalType('day')}
                title="Ver e exportar resumo deste dia"
              >
                <Download size={12} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)]">Mês:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="sc-input text-xs py-1 px-2 h-7 rounded"
              />
              <button
                className="sc-icon-btn h-7 w-7"
                onClick={() => setExportModalType('month')}
                title="Ver e exportar resumo deste mês"
              >
                <Download size={12} />
              </button>
            </div>
          </div>

          {closures
            .slice()
            .reverse()
            .slice(0, 20)
            .map((c) => {
              const bCount = c.byOriginCount?.balcao ?? 0
              const oCount = c.byOriginCount?.online ?? 0
              const labelCount =
                c.byOriginCount && (bCount > 0 || oCount > 0)
                  ? `${bCount} balcão · ${oCount} online`
                  : `${c.ordersCount} pedido(s)`

              return (
                <div
                  className="sc-closure flex items-center justify-between gap-2 p-2 hover:bg-[var(--surface-2)] transition-colors rounded"
                  key={c.id}
                >
                  <div
                    className="flex-1 cursor-pointer flex items-center justify-between gap-2"
                    onClick={() => onOpenViewingClosure(c)}
                  >
                    <span className="text-xs">
                      {c.dateLabel} · {labelCount}
                    </span>
                    <span className="sc-tabular font-semibold text-xs text-[var(--silver)]">
                      {fmtBRL(c.netTotal ?? c.grossTotal)}
                    </span>
                  </div>

                  {onDeleteClosure && (
                    <div className="shrink-0 flex items-center ml-2">
                      {deleteConfirmId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="sc-btn-small danger text-[10px] py-0.5 px-2 h-6"
                            onClick={async (e) => {
                              e.stopPropagation()
                              await onDeleteClosure(c.id)
                              setDeleteConfirmId(null)
                            }}
                          >
                            Excluir?
                          </button>
                          <button
                            type="button"
                            className="sc-btn-small text-[10px] py-0.5 px-1.5 h-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(null)
                            }}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="p-1 text-[var(--muted)] hover:text-red-400 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmId(c.id)
                          }}
                          title="Excluir fechamento errado"
                          aria-label="Excluir fechamento errado"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {exportModalType && (
        <ExportSummaryModal
          type={exportModalType}
          selectedDate={exportModalType === 'day' ? selectedDay : selectedMonth}
          closures={filteredClosuresForExport}
          onClose={() => setExportModalType(null)}
          onDownloadCSV={handleDownloadCSV}
        />
      )}
    </div>
  )
}
export default TabCaixa
