import React from 'react'
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  Printer,
} from 'lucide-react'
import type { OfflineOrderItem } from '@/types/offline'
import type { OrderRecord } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'
import { removeOfflineOrderItem } from '@/lib/offlineQueue'

interface OfflineQueueModalProps {
  isOpen: boolean
  isOnline: boolean
  isSyncing: boolean
  queue: OfflineOrderItem[]
  onClose: () => void
  onSyncNow: () => void
  onPrintTicket?: (order: OrderRecord) => void
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  isOpen,
  isOnline,
  isSyncing,
  queue,
  onClose,
  onSyncNow,
  onPrintTicket,
}) => {
  if (!isOpen) return null

  const pendingCount = queue.filter((i) => i.status === 'pending' || i.status === 'syncing').length
  const failedCount = queue.filter((i) => i.status === 'failed').length

  const handleDiscard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Deseja realmente remover este pedido da fila offline?')) {
      removeOfflineOrderItem(id)
    }
  }

  return (
    <div className="sc-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="sc-modal max-w-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="sc-modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="sc-modal-title" style={{ fontSize: 18 }}>
                Fila de Pedidos Offline
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi size={11} /> Conectado
                  </>
                ) : (
                  <>
                    <WifiOff size={11} /> Sem internet
                  </>
                )}
              </span>
            </div>
            <div className="sc-sub" style={{ margin: '4px 0 0' }}>
              Pedidos registrados enquanto o celular estava sem conexão.
            </div>
          </div>
          <button
            className="sc-icon-btn"
            onClick={onClose}
            aria-label="Fechar modal"
            style={{ minWidth: 28 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Resumo da Fila */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
            <span className="text-[11px] text-[var(--muted)] block">Na fila / pendentes</span>
            <span className="sc-tabular font-bold text-base text-[var(--silver)]">
              {pendingCount} pedido(s)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
            <span className="text-[11px] text-[var(--muted)] block">Com erro de envio</span>
            <span
              className={`sc-tabular font-bold text-base ${
                failedCount > 0 ? 'text-red-400' : 'text-[var(--silver-dim)]'
              }`}
            >
              {failedCount} pedido(s)
            </span>
          </div>
        </div>

        {/* Aviso de Baixa de Estoque */}
        <div className="p-2.5 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong>Aviso de estoque e comanda:</strong> em modo offline, as comandas usam numeração
            provisória. A numeração definitiva e a baixa automática no estoque do sistema serão
            processadas assim que os pedidos forem sincronizados com o servidor.
          </div>
        </div>

        {/* Lista de Pedidos na Fila */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)] text-sm">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400/60" />
              Nenhum pedido pendente na fila offline.
              <div className="text-xs text-[var(--silver-dim)] mt-1">
                Tudo está sincronizado com o servidor.
              </div>
            </div>
          ) : (
            queue.map((item) => {
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''
              const isItemSyncing = item.status === 'syncing'
              const isItemFailed = item.status === 'failed'

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 font-mono">
                        {item.provisionalTicket}
                      </span>
                      <span className="text-[var(--muted)] flex items-center gap-1">
                        <Clock size={11} /> {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isItemSyncing && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-medium">
                          <RefreshCw size={11} className="animate-spin" /> Enviando...
                        </span>
                      )}
                      {isItemFailed && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                          <AlertTriangle size={11} /> Erro no envio
                        </span>
                      )}
                      {!isItemSyncing && !isItemFailed && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                          Pendente
                        </span>
                      )}

                      {/* Botão de impressão da comanda térmica */}
                      {onPrintTicket && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPrintTicket({
                              id: item.id,
                              ticketNumber: item.provisionalTicketNumber,
                              items: item.payload.items,
                              subtotal: item.payload.subtotal,
                              discount: item.payload.discount,
                              deliveryFee: item.payload.deliveryFee,
                              total: item.payload.total,
                              payment: item.payload.payment,
                              status:
                                item.status === 'pending' || item.status === 'syncing'
                                  ? 'Comanda offline pendente'
                                  : 'Comanda',
                              created: item.createdAt,
                            })
                          }}
                          className="p-1 text-[var(--muted)] hover:text-[var(--silver)] rounded transition-colors ml-0.5"
                          title="Imprimir comanda térmica 80mm"
                          aria-label="Imprimir comanda"
                        >
                          <Printer size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDiscard(item.id, e)}
                        className="p-1 text-[var(--muted)] hover:text-red-400 rounded transition-colors ml-0.5"
                        title="Descartar pedido da fila"
                        aria-label="Descartar pedido"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes dos Itens */}
                  <div className="text-[var(--silver)] font-medium">
                    {item.payload.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                  </div>

                  {/* Valores e Pagamento */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]/50">
                    <span>
                      Pagamento:{' '}
                      <strong className="text-[var(--silver)]">{item.payload.payment}</strong>
                      {item.payload.deliveryFee > 0 &&
                        ` · Taxa: ${fmtBRL(item.payload.deliveryFee)}`}
                      {item.payload.discount > 0 && ` · Desc: -${fmtBRL(item.payload.discount)}`}
                    </span>
                    <span className="font-bold text-[var(--silver)] sc-tabular text-xs">
                      {fmtBRL(item.payload.total)}
                    </span>
                  </div>

                  {/* Mensagem de Erro, se houver */}
                  {item.errorMessage && (
                    <div className="text-[11px] text-red-300/90 bg-red-950/40 p-1.5 rounded border border-red-800/40 mt-1">
                      {item.errorMessage}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Ações */}
        <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
          <button className="sc-btn-ghost text-xs py-2 px-3 h-9" onClick={onClose}>
            Fechar
          </button>

          <button
            className="sc-btn-primary flex items-center justify-center gap-2 text-xs py-2 px-4 h-9 flex-1"
            disabled={queue.length === 0 || isSyncing}
            onClick={onSyncNow}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando fila...' : 'Sincronizar agora'}
          </button>
        </div>
      </div>
    </div>
  )
}
