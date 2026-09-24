import React from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { MenuItem, InventoryItem } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'

interface CustomizeModalProps {
  item: MenuItem | null
  stock: InventoryItem[]
  qty: number
  removed: Record<string, boolean>
  added: Record<string, number>
  isEditing: boolean
  onClose: () => void
  onConfirm: () => void
  setQty: React.Dispatch<React.SetStateAction<number>>
  setRemoved: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setAdded: React.Dispatch<React.SetStateAction<Record<string, number>>>
  resolveStockItem: (idOrCode: string) => InventoryItem | undefined
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  item,
  qty,
  removed,
  added,
  isEditing,
  onClose,
  onConfirm,
  setQty,
  setRemoved,
  setAdded,
  resolveStockItem,
}) => {
  if (!item) return null

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div>
            <div className="sc-modal-title">{item.name}</div>
            <div className="sc-modal-price sc-tabular">{fmtBRL(item.price)}</div>
          </div>
          <button className="sc-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        <div className="sc-field">
          <label className="sc-label">Quantidade</label>
          <div className="sc-qty-ctrl">
            <button className="sc-round-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus size={13} />
            </button>
            <span className="sc-tabular font-bold px-2">{qty}</span>
            <button className="sc-round-btn" onClick={() => setQty((q) => q + 1)}>
              <Plus size={13} />
            </button>
          </div>
        </div>

        {item.recipe && item.recipe.length > 0 && (
          <div className="sc-field">
            <label className="sc-label">
              Ingredientes inclusos — desmarque para remover ou use o seletor para adicionar extra
            </label>
            <div className="sc-recipe-list">
              {item.recipe.map((r) => {
                const si = resolveStockItem(r.ingredientId)
                const ingKey = si?.code || si?.id || r.ingredientId
                const checked = !removed[ingKey]
                const extraCount = Number(added[ingKey]) || 0

                return (
                  <React.Fragment key={ingKey}>
                    <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--line)]/40 last:border-b-0">
                      <label className="sc-check-row flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setRemoved((prev) => ({
                              ...prev,
                              [ingKey]: !e.target.checked,
                            }))
                          }
                        />
                        <span
                          className={
                            checked ? 'text-[var(--silver)]' : 'line-through text-[var(--muted)]'
                          }
                        >
                          {si ? si.name : r.ingredientId}
                        </span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0 select-none">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full bg-[#18181b] border border-[var(--line)] text-white hover:border-[var(--red)] active:scale-95 flex items-center justify-center transition-all disabled:opacity-40"
                          disabled={extraCount <= 0}
                          onClick={() =>
                            setAdded((prev) => {
                              const current = Number(prev[ingKey]) || 0
                              if (current <= 1) {
                                const next = { ...prev }
                                delete next[ingKey]
                                return next
                              }
                              return { ...prev, [ingKey]: current - 1 }
                            })
                          }
                          title={`Reduzir porção de ${si ? si.name : r.ingredientId}`}
                          aria-label={`Reduzir porção de ${si ? si.name : r.ingredientId}`}
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="sc-tabular font-bold text-[14px] text-white min-w-[14px] text-center">
                          {extraCount}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full bg-[#18181b] border border-[var(--red)] text-white hover:bg-[var(--red)] hover:text-white active:scale-95 flex items-center justify-center transition-all"
                          onClick={() =>
                            setAdded((prev) => ({
                              ...prev,
                              [ingKey]: (Number(prev[ingKey]) || 0) + 1,
                            }))
                          }
                          title={`Adicionar porção extra de ${si ? si.name : r.ingredientId}`}
                          aria-label={`Adicionar porção extra de ${si ? si.name : r.ingredientId}`}
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {(ingKey === 'ing-batata-300' || si?.code === 'ing-batata-300') && (
                      <div style={{ paddingLeft: 22 }} className="pt-1">
                        <div className="sc-note" style={{ margin: '4px 0' }}>
                          Cobertura da batata frita:
                        </div>
                        {[
                          ['ing-cheddar', 'Cheddar'],
                          ['ing-bacon', 'Bacon'],
                          ['ing-queijo', 'Mussarela'],
                        ].map(([toppingId, label]) => {
                          const toppingItem = resolveStockItem(toppingId)
                          const topKey = toppingItem?.code || toppingItem?.id || toppingId
                          const topExtra = Number(added[topKey]) || 0
                          return (
                            <div
                              key={topKey}
                              className="flex items-center justify-between gap-2 py-0.5"
                            >
                              <label className="sc-check-row flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={topExtra > 0}
                                  onChange={(e) =>
                                    setAdded((prev) => ({
                                      ...prev,
                                      [topKey]: e.target.checked ? 1 : 0,
                                    }))
                                  }
                                />
                                <span>{label}</span>
                              </label>
                              <div className="flex items-center gap-2 shrink-0 select-none">
                                <button
                                  type="button"
                                  className="w-7 h-7 rounded-full bg-[#18181b] border border-[var(--line)] text-white hover:border-[var(--red)] active:scale-95 flex items-center justify-center transition-all disabled:opacity-40"
                                  disabled={topExtra <= 0}
                                  onClick={() =>
                                    setAdded((prev) => {
                                      const current = Number(prev[topKey]) || 0
                                      if (current <= 1) {
                                        const next = { ...prev }
                                        delete next[topKey]
                                        return next
                                      }
                                      return { ...prev, [topKey]: current - 1 }
                                    })
                                  }
                                  title={`Reduzir porção de ${label}`}
                                  aria-label={`Reduzir porção de ${label}`}
                                >
                                  <Minus size={12} strokeWidth={2.5} />
                                </button>
                                <span className="sc-tabular font-bold text-[14px] text-white min-w-[14px] text-center">
                                  {topExtra}
                                </span>
                                <button
                                  type="button"
                                  className="w-7 h-7 rounded-full bg-[#18181b] border border-[var(--red)] text-white hover:bg-[var(--red)] hover:text-white active:scale-95 flex items-center justify-center transition-all"
                                  onClick={() =>
                                    setAdded((prev) => ({
                                      ...prev,
                                      [topKey]: (Number(prev[topKey]) || 0) + 1,
                                    }))
                                  }
                                  title={`Adicionar porção extra de ${label}`}
                                  aria-label={`Adicionar porção extra de ${label}`}
                                >
                                  <Plus size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        <div className="sc-form-actions">
          <button className="sc-btn-primary" onClick={onConfirm}>
            {isEditing ? 'Salvar alterações' : 'Adicionar ao pedido'}
          </button>
          <button className="sc-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
