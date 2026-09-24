import React, { useState } from 'react'
import { Plus, Minus, Pencil, Trash2 } from 'lucide-react'
import type { InventoryItem } from '@/types/loyolas'
import { GROUPS, UNITS } from '@/lib/seeds'

interface TabEstoqueProps {
  stock: InventoryItem[]
  isOffline?: boolean
  onSaveStockItem: (itemData: {
    id?: string
    name: string
    unit: InventoryItem['unit']
    qty: number
    min: number
    group: InventoryItem['group']
  }) => Promise<void>
  onAdjustStock: (id: string, delta: number) => Promise<void>
  onDeleteStockItem: (id: string) => Promise<void>
}

export const TabEstoque: React.FC<TabEstoqueProps> = ({
  stock,
  isOffline = false,
  onSaveStockItem,
  onAdjustStock,
  onDeleteStockItem,
}) => {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<InventoryItem['unit']>('un')
  const [qty, setQty] = useState('')
  const [min, setMin] = useState('')
  const [group, setGroup] = useState<InventoryItem['group']>('Ingrediente')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openNewForm = () => {
    setEditingId(null)
    setName('')
    setUnit('un')
    setQty('')
    setMin('')
    setGroup('Ingrediente')
    setFormOpen(true)
  }

  const openEditForm = (item: InventoryItem) => {
    setEditingId(item.id)
    setName(item.name)
    setUnit(item.unit)
    setQty(String(item.qty))
    setMin(String(item.min))
    setGroup(item.group)
    setFormOpen(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    const parsedQty = Number(String(qty).replace(',', '.'))
    const parsedMin = Number(String(min).replace(',', '.'))
    if (!trimmed || isNaN(parsedQty) || isNaN(parsedMin)) return

    setSaving(true)
    try {
      await onSaveStockItem({
        id: editingId || undefined,
        name: trimmed,
        unit,
        qty: parsedQty,
        min: parsedMin,
        group,
      })
      setFormOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sc-card">
      <h2 className="sc-title">Estoque</h2>
      {isOffline && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90">
          Modo offline ativo: estoque em modo somente leitura. Em modo offline, a baixa dos
          ingredientes será processada no servidor assim que os pedidos da fila forem sincronizados.
          Ajustes manuais exigem conexão.
        </div>
      )}
      <p className="sc-sub">
        Ingredientes e materiais de operação. O estoque de ingredientes é baixado automaticamente ao
        finalizar pedidos vinculados (balcão ou online).
      </p>

      {GROUPS.map((g) => {
        const items = stock.filter((s) => s.group === g)
        if (items.length === 0) return null

        return (
          <div key={g}>
            <div className="sc-group-title">
              {g === 'Ingrediente' ? 'Ingredientes' : 'Materiais e operação'}
            </div>
            {items.map((si) => {
              const low = si.qty <= si.min
              const displayName =
                si.code === 'ing-batata-300' || si.id === 'ing-batata-300'
                  ? 'Batata Frita Kg'
                  : si.name

              return (
                <div className="sc-row" key={si.id}>
                  <div className="sc-row-main">
                    <div className="sc-row-name">{displayName}</div>
                    <div className="sc-row-meta">
                      Mínimo: {si.min} {si.unit}
                    </div>
                  </div>

                  <div className="sc-row-actions">
                    {low && <span className="sc-badge low">Estoque baixo</span>}
                    <div className="sc-stock-adj">
                      {!isOffline && (
                        <button
                          className="sc-round-btn"
                          onClick={() => onAdjustStock(si.id, -1)}
                          aria-label="Diminuir estoque"
                        >
                          <Minus size={13} />
                        </button>
                      )}
                      <span className="sc-stock-qty sc-tabular font-bold">{si.qty}</span>
                      {!isOffline && (
                        <button
                          className="sc-round-btn"
                          onClick={() => onAdjustStock(si.id, 1)}
                          aria-label="Aumentar estoque"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>

                    {!isOffline && (
                      <>
                        <button
                          className="sc-btn-small"
                          onClick={() => openEditForm(si)}
                          aria-label="Editar"
                        >
                          <Pencil size={12} />
                        </button>

                        {deleteConfirmId === si.id ? (
                          <button
                            className="sc-btn-small danger"
                            onClick={() => {
                              onDeleteStockItem(si.id)
                              setDeleteConfirmId(null)
                            }}
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            className="sc-btn-small danger"
                            onClick={() => setDeleteConfirmId(si.id)}
                            aria-label="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {isOffline ? null : formOpen ? (
        <div className="sc-form">
          <div className="sc-field">
            <label className="sc-label">Nome do item</label>
            <input
              className="sc-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Guardanapo"
            />
          </div>

          <div className="sc-field-row">
            <div className="sc-field">
              <label className="sc-label">Tipo</label>
              <select
                className="sc-select"
                value={group}
                onChange={(e) => setGroup(e.target.value as InventoryItem['group'])}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g === 'Ingrediente' ? 'Ingrediente' : 'Material/Operação'}
                  </option>
                ))}
              </select>
            </div>
            <div className="sc-field">
              <label className="sc-label">Unidade</label>
              <select
                className="sc-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as InventoryItem['unit'])}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sc-field-row">
            <div className="sc-field">
              <label className="sc-label">Quantidade atual</label>
              <input
                className="sc-input"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="sc-field">
              <label className="sc-label">Mínimo p/ alerta</label>
              <input
                className="sc-input"
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="sc-form-actions">
            <button className="sc-btn-primary" onClick={handleSave} disabled={saving}>
              {editingId ? 'Salvar alterações' : 'Adicionar item'}
            </button>
            <button className="sc-btn-ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="sc-btn-ghost" style={{ marginTop: 10 }} onClick={openNewForm}>
          <Plus size={13} style={{ marginRight: 5 }} />
          Novo item de estoque
        </button>
      )}
    </div>
  )
}
