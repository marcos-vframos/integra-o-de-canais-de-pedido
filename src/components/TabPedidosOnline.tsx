import React, { useState } from 'react'
import {
  Inbox,
  CheckCircle2,
  Clock,
  Printer,
  MessageCircle,
  XCircle,
  Bike,
  Store,
  MapPin,
  Search,
  AlertTriangle,
} from 'lucide-react'
import type { OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

interface TabPedidosOnlineProps {
  orders: OrderRecord[]
  onPrintOrderTicket: (order: OrderRecord) => void
  onOrderUpdated?: () => void
}

type OnlineFilterStatus = 'todos' | 'pendente' | 'aceito' | 'pronto' | 'concluído' | 'recusado'

export const TabPedidosOnline: React.FC<TabPedidosOnlineProps> = ({
  orders,
  onPrintOrderTicket,
  onOrderUpdated,
}) => {
  const [filterStatus, setFilterStatus] = useState<OnlineFilterStatus>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [rejectModalOrder, setRejectModalOrder] = useState<OrderRecord | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // Apenas pedidos online
  const onlineOrders = orders.filter((o) => o.origin === 'online')

  // Filtragem
  const filteredOrders = onlineOrders.filter((order) => {
    const s = (order.status || 'pendente').toLowerCase()
    const matchesStatus =
      filterStatus === 'todos'
        ? true
        : filterStatus === 'pendente'
          ? s === 'pendente'
          : filterStatus === 'aceito'
            ? s === 'aceito'
            : filterStatus === 'pronto'
              ? s === 'pronto'
              : filterStatus === 'concluído'
                ? s === 'concluído' || s === 'concluido' || s === 'finalizado'
                : filterStatus === 'recusado'
                  ? s === 'recusado'
                  : true

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      String(order.ticketNumber).includes(q) ||
      (order.customerName || '').toLowerCase().includes(q) ||
      (order.customerPhone || '').includes(q) ||
      (order.customerAddress || '').toLowerCase().includes(q) ||
      (order.items || []).some((it) => it.name.toLowerCase().includes(q))

    return matchesStatus && matchesSearch
  })

  // Atualizar status do pedido
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsProcessing(orderId)
    try {
      await pb.collection('orders').update(orderId, { status: newStatus })
      toast({
        title: 'Status atualizado',
        description: `Pedido #${padTicket(
          orders.find((o) => o.id === orderId)?.ticketNumber || 0,
        )} alterado para "${newStatus}".`,
      })
      if (onOrderUpdated) onOrderUpdated()
    } catch (err: any) {
      console.error('Erro ao atualizar status do pedido:', err)
      toast({
        title: 'Erro ao atualizar status',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(null)
    }
  }

  // Recusar pedido com estorno de estoque
  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return
    const orderId = rejectModalOrder.id
    setIsProcessing(orderId)

    try {
      const res = await pb.send<{
        success: boolean
        orderId: string
        status: string
        restoredItems: Array<{ name: string; restoredQty: number }>
      }>('/backend/v1/orders/reject', {
        method: 'POST',
        body: { orderId },
      })

      const restoredCount = res?.restoredItems?.length || 0
      toast({
        title: `Pedido #${padTicket(rejectModalOrder.ticketNumber)} recusado`,
        description:
          restoredCount > 0
            ? `Pedido cancelado e ${restoredCount} ingrediente(s) estornados ao estoque.`
            : 'Pedido marcado como recusado.',
      })

      setRejectModalOrder(null)
      if (onOrderUpdated) onOrderUpdated()
    } catch (err: any) {
      console.error('Erro ao recusar pedido:', err)
      try {
        await pb.collection('orders').update(orderId, { status: 'recusado' })
        toast({
          title: `Pedido #${padTicket(rejectModalOrder.ticketNumber)} recusado`,
          description: 'Status atualizado para recusado.',
        })
        setRejectModalOrder(null)
        if (onOrderUpdated) onOrderUpdated()
      } catch (fallbackErr: any) {
        toast({
          title: 'Erro ao recusar pedido',
          description: fallbackErr?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsProcessing(null)
    }
  }

  // Gera link WhatsApp
  const makeWhatsAppLink = (order: OrderRecord) => {
    const rawPhone = (order.customerPhone || '').replace(/\D/g, '')
    if (!rawPhone) return '#'
    const phoneWithCountry = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone

    const statusText =
      order.status === 'aceito'
        ? 'foi aceito e já está em preparo!'
        : order.status === 'pronto'
          ? order.deliveryType === 'entrega'
            ? 'está pronto e saindo para entrega!'
            : 'está pronto para retirada no balcão!'
          : order.status === 'concluído'
            ? 'foi concluído com sucesso. Bom apetite!'
            : order.status === 'recusado'
              ? 'não pôde ser aceito no momento.'
              : 'foi recebido e está sendo analisado!'

    const msg = `Olá, ${order.customerName || 'cliente'}! Seu pedido #${padTicket(
      order.ticketNumber,
    )} no Loyola's Lanches ${statusText}`

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`
  }

  const getStatusBadge = (status?: string) => {
    const s = (status || 'pendente').toLowerCase()
    if (s === 'pendente') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Clock size={12} />
          Pendente
        </span>
      )
    }
    if (s === 'aceito') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Em Preparo
        </span>
      )
    }
    if (s === 'pronto') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Pronto
        </span>
      )
    }
    if (s === 'concluído' || s === 'concluido' || s === 'finalizado') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Concluído
        </span>
      )
    }
    if (s === 'recusado') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
          <XCircle size={12} />
          Recusado
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#27272a] text-[var(--silver)] border border-[#3f3f46]">
        {status}
      </span>
    )
  }

  const pendingCount = onlineOrders.filter((o) => (o.status || 'pendente') === 'pendente').length

  return (
    <div className="space-y-4">
      {/* Header com resumo e filtros */}
      <div className="sc-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30 flex items-center justify-center">
              <Inbox size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pedidos Online Recebidos
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--red)] text-white text-xs font-bold animate-pulse">
                    {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Pedidos realizados por clientes via link público da loja (/loja)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/loja"
              target="_blank"
              rel="noopener noreferrer"
              className="sc-btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Abrir página pública da loja"
            >
              <Store size={13} />
              <span>Ver Loja do Cliente</span>
            </a>
          </div>
        </div>

        {/* Barra de Busca e Filtro de Status */}
        <div className="pt-3 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              placeholder="Buscar por comanda, nome do cliente, telefone ou item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-xs text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--red)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'aceito', label: 'Em Preparo' },
                { id: 'pronto', label: 'Prontos' },
                { id: 'concluído', label: 'Concluídos' },
                { id: 'recusado', label: 'Recusados' },
              ] as const
            ).map((f) => {
              const active = filterStatus === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[var(--red)] text-white shadow-sm'
                      : 'bg-[var(--surface-2)] text-[var(--silver)] border border-[var(--line)] hover:text-white'
                  }`}
                >
                  {f.label}
                  {f.id === 'pendente' && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="sc-card p-12 text-center text-[var(--muted)]">
          <Inbox size={36} className="mx-auto mb-2 opacity-40 text-[var(--silver)]" />
          <p className="text-sm font-semibold text-[var(--silver)]">
            Nenhum pedido online encontrado.
          </p>
          <p className="text-xs mt-1">
            {searchQuery || filterStatus !== 'todos'
              ? 'Tente remover os filtros ou buscar por outro termo.'
              : 'Compartilhe o link da loja (/loja) com os clientes para começar a receber pedidos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const currentStatus = (order.status || 'pendente').toLowerCase()
            const isPendente = currentStatus === 'pendente'
            const isAceito = currentStatus === 'aceito'
            const isPronto = currentStatus === 'pronto'
            const isConcluido =
              currentStatus === 'concluído' ||
              currentStatus === 'concluido' ||
              currentStatus === 'finalizado'
            const isRecusado = currentStatus === 'recusado'
            const isDelivery = order.deliveryType === 'entrega'

            return (
              <div
                key={order.id}
                className={`sc-card p-4 transition-all border ${
                  isPendente
                    ? 'border-amber-500/40 bg-[#161410]'
                    : isAceito
                      ? 'border-blue-500/30'
                      : isPronto
                        ? 'border-purple-500/30'
                        : isConcluido
                          ? 'border-emerald-500/20 opacity-90'
                          : isRecusado
                            ? 'border-red-500/20 opacity-60'
                            : 'border-[var(--line)]'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]/60">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-black text-white px-2.5 py-0.5 rounded bg-[#1c1c21] border border-[var(--line)]">
                      #{padTicket(order.ticketNumber)}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{order.customerName || 'Cliente Anônimo'}</span>
                        <span className="text-xs font-normal text-[var(--muted)]">
                          {order.created
                            ? new Date(order.created).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[var(--silver)]">
                          {isDelivery ? (
                            <>
                              <Bike size={12} className="text-amber-400" />
                              <b>Entrega (Delivery)</b>
                            </>
                          ) : (
                            <>
                              <Store size={12} className="text-blue-400" />
                              <b>Retirada no Balcão</b>
                            </>
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          Pagamento: <b>{order.payment}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {getStatusBadge(order.status)}

                    {order.customerPhone && (
                      <a
                        href={makeWhatsAppLink(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Enviar mensagem manual via WhatsApp"
                      >
                        <MessageCircle size={13} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onPrintOrderTicket(order)}
                      className="sc-icon-btn p-1.5 rounded-lg border border-[var(--line)]"
                      title="Imprimir comanda térmica 80mm"
                      aria-label="Imprimir comanda térmica 80mm"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>

                {/* Endereço de Entrega (se for delivery) */}
                {isDelivery && order.customerAddress && (
                  <div className="my-2.5 p-2 rounded-lg bg-[#1f1a14] border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                    <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Endereço de Entrega: </span>
                      <span>{order.customerAddress}</span>
                    </div>
                  </div>
                )}

                {/* Itens do Pedido */}
                <div className="py-2.5 space-y-1.5">
                  {(order.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-[var(--silver)] flex flex-col py-1 border-b border-[var(--line)]/30 last:border-b-0"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-white">
                          <b className="font-mono text-[var(--red)]">{it.qty}x</b> {it.name}
                        </span>
                        <span className="font-mono text-white">
                          {fmtBRL((it.price || 0) * (it.qty || 1))}
                        </span>
                      </div>

                      {it.removed && it.removed.length > 0 && (
                        <div className="text-[11px] text-red-400/90 pl-4 mt-0.5">
                          - Sem: {it.removed.join(', ')}
                        </div>
                      )}
                      {it.added && it.added.length > 0 && (
                        <div className="text-[11px] text-emerald-400/90 pl-4 mt-0.5">
                          + Adicionais: {it.added.map((a) => `${a.name} x${a.qty}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totais e Botões de Ação */}
                <div className="pt-2.5 border-t border-[var(--line)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <div className="text-xs text-[var(--muted)]">
                      Total:{' '}
                      <b className="text-base text-white font-mono font-black">
                        {fmtBRL(order.total)}
                      </b>
                    </div>
                    {order.deliveryFee ? (
                      <span className="text-[11px] text-[var(--muted)]">
                        (Taxa entrega: {fmtBRL(order.deliveryFee)})
                      </span>
                    ) : null}
                  </div>

                  {/* Fluxo de Status Manual: Pendente -> Aceitar -> Pronto -> Concluído */}
                  <div className="flex items-center gap-2">
                    {isPendente && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'aceito')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                          <CheckCircle2 size={13} />
                          <span>Aceitar Pedido</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing === order.id}
                          onClick={() => setRejectModalOrder(order)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <XCircle size={13} />
                          <span>Recusar</span>
                        </button>
                      </>
                    )}

                    {isAceito && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'pronto')}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                          <CheckCircle2 size={13} />
                          <span>Marcar Pronto</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing === order.id}
                          onClick={() => setRejectModalOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#27272a] hover:bg-red-500/20 text-[var(--muted)] hover:text-red-300 text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {isPronto && (
                      <button
                        type="button"
                        disabled={isProcessing === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'concluído')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      >
                        <CheckCircle2 size={13} />
                        <span>Entregue / Concluído</span>
                      </button>
                    )}

                    {(isConcluido || isRecusado) && (
                      <button
                        type="button"
                        disabled={isProcessing === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'aceito')}
                        className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[var(--silver)] hover:text-white text-[11px] transition-colors"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmação para Recusar Pedido */}
      {rejectModalOrder && (
        <div className="sc-modal-backdrop" onClick={() => setRejectModalOrder(null)}>
          <div className="sc-modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={18} />
                <span className="sc-modal-title">Recusar Pedido</span>
              </div>
            </div>

            <div className="py-2 text-xs text-[var(--silver)] space-y-2">
              <p>
                Deseja realmente recusar o pedido da comanda{' '}
                <b className="text-white">#{padTicket(rejectModalOrder.ticketNumber)}</b> (
                {rejectModalOrder.customerName})?
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                O status será alterado para <b>"recusado"</b> e os ingredientes consumidos serão
                estornados automaticamente para o estoque.
              </p>
            </div>

            <div className="sc-form-actions pt-3">
              <button
                type="button"
                className="sc-btn-primary !bg-red-600 hover:!bg-red-500"
                disabled={isProcessing === rejectModalOrder.id}
                onClick={handleConfirmReject}
              >
                Sim, Recusar e Estornar
              </button>
              <button
                type="button"
                className="sc-btn-ghost"
                onClick={() => setRejectModalOrder(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default TabPedidosOnline
