import React, { useState, useEffect } from 'react'
import {
  Bike,
  Plus,
  Trash2,
  Phone,
  CheckCircle2,
  DollarSign,
  Calendar,
  User,
  Clock,
  Send,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'

export interface MotoboyItem {
  id: string
  name: string
  phone: string
  plate?: string
  active: boolean
  feePerDelivery?: number
}

interface TabMotoboysProps {
  orders: OrderRecord[]
}

export const TabMotoboys: React.FC<TabMotoboysProps> = ({ orders }) => {
  const [motoboys, setMotoboys] = useState<MotoboyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPlate, setNewPlate] = useState('')
  const [newFee, setNewFee] = useState<number>(7)
  const [saving, setSaving] = useState(false)

  const loadMotoboys = async () => {
    try {
      const list = await pb.collection('motoboys').getFullList<MotoboyItem>({ sort: 'name' })
      setMotoboys(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMotoboys()
  }, [])

  useRealtime('motoboys', loadMotoboys)

  const handleCreateMotoboy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      await pb.collection('motoboys').create({
        name: newName.trim(),
        phone: newPhone.trim(),
        plate: newPlate.trim(),
        active: true,
        feePerDelivery: newFee,
      })
      setNewName('')
      setNewPhone('')
      setNewPlate('')
      setNewFee(7)
      setShowNewModal(false)
      loadMotoboys()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMotoboy = async (id: string) => {
    if (!confirm('Deseja excluir este motoboy?')) return
    await pb.collection('motoboys').delete(id)
    loadMotoboys()
  }

  const handleToggleActive = async (mb: MotoboyItem) => {
    await pb.collection('motoboys').update(mb.id, { active: !mb.active })
    loadMotoboys()
  }

  // Histórico individual: entregas acumuladas de todos os tempos
  const [selectedHistoryMb, setSelectedHistoryMb] = useState<MotoboyItem | null>(null)

  // Filtrar entregas do dia atual
  const todayStartIso = new Date()
  todayStartIso.setHours(0, 0, 0, 0)
  const todayStartStr = todayStartIso.toISOString()

  const todayOrders = orders.filter((o) => {
    const d = o.created || ''
    return d >= todayStartStr && o.deliveryType === 'entrega' && o.status !== 'recusado'
  })

  // Agrupamento de entregas por motoboy no dia e no total histórico
  const statsByMotoboy = motoboys.map((mb) => {
    const mbOrders = todayOrders.filter((o) => o.motoboyId === mb.id || o.motoboyName === mb.name)
    const allMbOrders = orders.filter(
      (o) => (o.motoboyId === mb.id || o.motoboyName === mb.name) && o.status !== 'recusado',
    )
    const count = mbOrders.length
    const feeUnit = mb.feePerDelivery || 7
    const totalPagar = count * feeUnit
    const totalHistoricoValor = allMbOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    return {
      motoboy: mb,
      orders: mbOrders,
      allOrders: allMbOrders,
      deliveriesCount: count,
      feeUnit,
      totalPagar,
      allCount: allMbOrders.length,
      totalHistoricoValor,
    }
  })

  const totalDeliveriesToday = statsByMotoboy.reduce((sum, item) => sum + item.deliveriesCount, 0)
  const totalAmountToPayToday = statsByMotoboy.reduce((sum, item) => sum + item.totalPagar, 0)

  // Entregas ainda sem motoboy atribuído hoje
  const unassignedDeliveries = todayOrders.filter((o) => !o.motoboyId && !o.motoboyName)

  return (
    <div className="space-y-6">
      {/* Topo da Aba */}
      <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bike className="text-[#E10600]" size={18} />
            <span>Gestão de Entregas & Motoboys</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Acompanhe as entregas despachadas no dia de hoje com somatória e valor a pagar por
            entregador
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold transition-all shadow cursor-pointer"
        >
          <Plus size={14} />
          <span>Cadastrar Novo Motoboy</span>
        </button>
      </div>

      {/* Cards de Resumo Geral do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4">
          <span className="text-zinc-500 text-[11px] block uppercase font-semibold">
            Total de Entregas Hoje
          </span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {totalDeliveriesToday}
          </div>
        </div>
        <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4">
          <span className="text-zinc-500 text-[11px] block uppercase font-semibold">
            Somatória a Pagar aos Motoboys
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {fmtBRL(totalAmountToPayToday)}
          </div>
        </div>
        <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4">
          <span className="text-zinc-500 text-[11px] block uppercase font-semibold">
            Entregas sem Motoboy Definido
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {unassignedDeliveries.length}
          </div>
        </div>
      </div>

      {/* Lista de Motoboys e Entregas do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsByMotoboy.map(
          ({ motoboy, orders: mbOrders, deliveriesCount, feeUnit, totalPagar }) => (
            <div
              key={motoboy.id}
              className="bg-[#121215] border border-[#27272A] rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Bike size={16} className="text-[#E10600]" />
                      {motoboy.name}
                    </h3>
                    <div className="text-xs text-zinc-400 mt-0.5 space-x-2">
                      {motoboy.phone && <span>{motoboy.phone}</span>}
                      {motoboy.plate && (
                        <span className="font-mono text-zinc-500">[{motoboy.plate}]</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMotoboy(motoboy.id)}
                    className="text-zinc-600 hover:text-red-400 p-1"
                    title="Excluir motoboy"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Estatísticas do motoboy no dia */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">
                      Entregas Feitas
                    </span>
                    <span className="text-base font-bold text-white font-mono">
                      {deliveriesCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">
                      Diária / Taxa Unit
                    </span>
                    <span className="text-xs font-semibold text-zinc-300 font-mono">
                      {fmtBRL(feeUnit)}/entrega
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-semibold">
                      Somatória Final Hoje:
                    </span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {fmtBRL(totalPagar)}
                    </span>
                  </div>
                </div>

                {/* Relação de comandas do dia */}
                {mbOrders.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Comandas Despachadas ({mbOrders.length})
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px]">
                      {mbOrders.map((o) => (
                        <div
                          key={o.id}
                          className="p-1.5 bg-zinc-900/60 rounded flex items-center justify-between text-zinc-300"
                        >
                          <span className="font-mono font-bold text-white">
                            #{padTicket(o.ticketNumber)}
                          </span>
                          <span className="truncate max-w-[120px] text-[10px] text-zinc-400">
                            {o.customerName || 'Cliente'}
                          </span>
                          <span className="font-mono text-zinc-300">{fmtBRL(o.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(motoboy)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    motoboy.active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {motoboy.active ? 'Ativo' : 'Inativo'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHistoryMb(motoboy)}
                  className="text-xs text-[#E10600] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Clock size={12} />
                  <span>
                    Histórico (
                    {
                      orders.filter(
                        (o) => o.motoboyId === motoboy.id || o.motoboyName === motoboy.name,
                      ).length
                    }
                    )
                  </span>
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Modal de Histórico Individual do Motoboy */}
      {selectedHistoryMb && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedHistoryMb(null)}
        >
          <div
            className="w-full max-w-lg bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bike className="text-[#E10600]" size={18} />
                  <span>Histórico de Entregas: {selectedHistoryMb.name}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedHistoryMb.phone || 'Sem telefone'} • Placa:{' '}
                  {selectedHistoryMb.plate || 'N/A'} • Taxa por entrega:{' '}
                  {fmtBRL(selectedHistoryMb.feePerDelivery || 7)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryMb(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Resumo acumulado */}
            {(() => {
              const histOrders = orders.filter(
                (o) =>
                  (o.motoboyId === selectedHistoryMb.id ||
                    o.motoboyName === selectedHistoryMb.name) &&
                  o.status !== 'recusado',
              )
              const totalAcumuladoTaxa = histOrders.length * (selectedHistoryMb.feePerDelivery || 7)
              const totalAcumuladoPedidos = histOrders.reduce((sum, o) => sum + (o.total || 0), 0)

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-center">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">
                        Total Entregas
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {histOrders.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">
                        Comissão Total
                      </span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {fmtBRL(totalAcumuladoTaxa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">
                        Volume Entregue
                      </span>
                      <span className="text-base font-bold text-zinc-300 font-mono">
                        {fmtBRL(totalAcumuladoPedidos)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Entregas Registradas
                    </span>
                    {histOrders.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">
                        Nenhuma entrega registrada para este motoboy ainda.
                      </p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {histOrders.map((o) => (
                          <div
                            key={o.id}
                            className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">
                                  #{padTicket(o.ticketNumber)}
                                </span>
                                <span className="text-zinc-300">{o.customerName || 'Cliente'}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                {o.created ? new Date(o.created).toLocaleString('pt-BR') : ''} •
                                End: {o.customerAddress || 'Não informado'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-white">
                                {fmtBRL(o.total)}
                              </div>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                +{fmtBRL(selectedHistoryMb.feePerDelivery || 7)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className="flex justify-end pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setSelectedHistoryMb(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Motoboy */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMotoboy}
            className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bike className="text-[#E10600]" size={16} />
                <span>Novo Entregador / Motoboy</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Carlos Entrega"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  WhatsApp / Fone
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(12) 99999-9999"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Placa da Moto
                </label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder="BRA-1234"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Valor pago por entrega (R$)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newFee}
                onChange={(e) => setNewFee(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold"
              >
                {saving ? 'Cadastrando...' : 'Cadastrar Motoboy'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
