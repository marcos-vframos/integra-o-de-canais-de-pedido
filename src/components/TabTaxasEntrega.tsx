import React, { useState, useEffect } from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  DollarSign,
  Compass,
  CheckCircle2,
  Edit2,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { fmtBRL } from '@/lib/seeds'
import { DeliveryFeeItem } from '@/lib/geoDistance'

export const TabTaxasEntrega: React.FC = () => {
  const [fees, setFees] = useState<DeliveryFeeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [fee, setFee] = useState<number>(8)
  const [lat, setLat] = useState<string>('-22.9238')
  const [lng, setLng] = useState<string>('-45.4740')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const loadFees = async () => {
    try {
      const list = await pb
        .collection('delivery_fees')
        .getFullList<DeliveryFeeItem>({ sort: 'fee' })
      setFees(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFees()
  }, [])

  useRealtime('delivery_fees', loadFees)

  const handleOpenNew = () => {
    setEditingId(null)
    setName('')
    setFee(8)
    setLat('-22.9238')
    setLng('-45.4740')
    setDescription('')
    setShowModal(true)
  }

  const handleOpenEdit = (item: DeliveryFeeItem) => {
    setEditingId(item.id)
    setName(item.name)
    setFee(item.fee)
    setLat(item.lat !== undefined ? String(item.lat) : '')
    setLng(item.lng !== undefined ? String(item.lng) : '')
    setDescription(item.description || '')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload: any = {
        name: name.trim(),
        fee: Number(fee),
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        description: description.trim(),
      }

      if (editingId) {
        await pb.collection('delivery_fees').update(editingId, payload)
      } else {
        await pb.collection('delivery_fees').create(payload)
      }

      setShowModal(false)
      loadFees()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta taxa de entrega?')) return
    await pb.collection('delivery_fees').delete(id)
    loadFees()
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="text-[#E10600]" size={18} />
            <span>Cadastro & Gestão de Taxas de Entrega</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastre os bairros e coordenadas de referência para cálculo automático por proximidade
            no delivery
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold transition-all shadow cursor-pointer"
        >
          <Plus size={14} />
          <span>Adicionar Nova Taxa / Bairro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {fees.map((item) => (
          <div
            key={item.id}
            className="bg-[#121215] border border-[#27272A] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-white">{item.name}</h3>
                <span className="font-mono text-base font-black text-emerald-400">
                  {fmtBRL(item.fee)}
                </span>
              </div>

              {item.description && <p className="text-xs text-zinc-400 mt-1">{item.description}</p>}

              {item.lat && item.lng && (
                <div className="mt-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                  <Compass size={12} className="text-[#E10600]" />
                  <span>
                    Lat: {item.lat.toFixed(4)}, Lng: {item.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(item)}
                className="p-1 text-zinc-400 hover:text-white rounded"
                title="Editar taxa"
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1 text-zinc-500 hover:text-red-400 rounded"
                title="Excluir taxa"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingId ? 'Editar Taxa de Entrega' : 'Nova Taxa de Entrega'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome do Bairro / Região *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Araretama, Centro..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Valor da Taxa (R$) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Latitude (Referência)
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-22.9238"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Longitude (Referência)
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-45.4740"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Descrição / Observação
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Até 3km do carrinho..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold"
              >
                {saving ? 'Salvando...' : 'Salvar Taxa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
