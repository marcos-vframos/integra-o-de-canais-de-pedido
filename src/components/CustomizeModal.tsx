import React from 'react'
import { isBeverage, hasSodaFlavor, SODA_FLAVORS } from '@/lib/beverages'
import { Minus, Plus, X } from 'lucide-react'
import type { MenuItem, InventoryItem } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'
import { BREAD_FRANCES_SURCHARGE, breadKind, breadName, breadSurcharge, hasBread, lineUnitTotal, extraUnitPrice, type BreadChoice } from '@/lib/orderCustomization'

interface CustomizeModalProps {
  beverageFlavor?: string
  setBeverageFlavor?: (flavor: string) => void
  item: MenuItem | null
  stock: InventoryItem[]
  menu: MenuItem[]
  qty: number
  removed: Record<string, boolean>
  added: Record<string, number>
  isEditing: boolean
  breadChoice: BreadChoice
  setBreadChoice: (choice: BreadChoice) => void
  onClose: () => void
  onConfirm: () => void
  setQty: React.Dispatch<React.SetStateAction<number>>
  setRemoved: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setAdded: React.Dispatch<React.SetStateAction<Record<string, number>>>
  resolveStockItem: (idOrCode: string) => InventoryItem | undefined
  gourmetFreeChoice?: 'catupiry' | 'cheddar' | 'none'
  setGourmetFreeChoice?: (choice: 'catupiry' | 'cheddar' | 'none') => void
  catupiryExtraPrice?: number
  cheddarExtraPrice?: number
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  item,
  beverageFlavor = '',
  setBeverageFlavor,
  menu,
  qty,
  removed,
  added,
  isEditing,
  breadChoice,
  setBreadChoice,
  onClose,
  onConfirm,
  setQty,
  setRemoved,
  setAdded,
  resolveStockItem,
  gourmetFreeChoice = 'none',
  setGourmetFreeChoice,
  catupiryExtraPrice = 4,
  cheddarExtraPrice = 3,
}) => {
  if (!item) return null

  const beverage = isBeverage(item)
  const soda = hasSodaFlavor(item)
  const isGourmet = item.category === 'Gourmet'
  const showBreadSelector = !beverage && hasBread(item, resolveStockItem)
  const extras = Object.entries(beverage ? {} : added)
    .filter(([ingredientId, amount]) => Number(amount) > 0 && !breadKind(ingredientId, resolveStockItem))
    .map(([ingredientId, amount]) => ({ ingredientId, qty: Number(amount) }))
  const extrasTotal = extras.reduce((sum, a) => sum + extraUnitPrice(a.ingredientId, resolveStockItem, menu) * a.qty, 0)
  const breadExtra = breadSurcharge(item, { breadChoice }, resolveStockItem)
  const currentUnitTotal = beverage ? Number(item.price) : lineUnitTotal(item, { added: extras, breadChoice }, resolveStockItem, menu)

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

        {soda && setBeverageFlavor && <div className="sc-field">
          <label htmlFor="beverage-flavor" className="sc-label">Sabor do refrigerante</label>
          <select id="beverage-flavor" value={beverageFlavor} onChange={e => setBeverageFlavor(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-[#17171C] p-3 text-white">
            <option value="">Selecione o sabor</option>
            {SODA_FLAVORS.map(flavor => <option key={flavor} value={flavor}>{flavor}</option>)}
          </select>
        </div>}
        {showBreadSelector && (
          <fieldset className="sc-field rounded-xl border border-[var(--line)] bg-[#151518] p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-white">Escolha o pão</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pão">
              {(['hamburguer', 'frances'] as const).map(choice => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={breadChoice === choice}
                  onClick={() => setBreadChoice(choice)}
                  className={`rounded-lg border px-3 py-3 text-xs font-bold transition-colors ${breadChoice === choice
                    ? 'border-[var(--red)] bg-[rgba(225,6,0,0.15)] text-white'
                    : 'border-zinc-700 bg-[#1a1a1f] text-zinc-300 hover:border-zinc-400'}`}
                >
                  {breadChoice === choice ? '✓ ' : ''}{breadName(choice)}
                  <span className="mt-1 block text-[10px] font-semibold text-zinc-300">
                    {choice === 'frances' ? `+ ${fmtBRL(BREAD_FRANCES_SURCHARGE)} por lanche` : 'Incluso no preço'}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">Escolha um pão por lanche. Pão de Hambúrguer incluso; Pão Francês acrescenta {fmtBRL(BREAD_FRANCES_SURCHARGE)} por unidade.</p>
          </fieldset>
        )}

        {/* EXCEÇÃO GOURMET: Catupiry ou Cheddar grátis */}
        {isGourmet && (
          <div className="sc-field p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                ★ Exceção Gourmet — Cortesia da Casa
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-semibold">
                1 Grátis
              </span>
            </div>
            <p className="text-[11.5px] text-[#C4C4C4] leading-relaxed">
              Itens da linha <b>Gourmet</b> ganham <b>Catupiry</b> ou <b>Cheddar</b> gratuitamente.
              Se desejar ambos, o primeiro sai grátis e o segundo é cobrado pelo valor padrão
              cadastrado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (setGourmetFreeChoice) {
                    setGourmetFreeChoice('none')
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${
                  gourmetFreeChoice === 'none'
                    ? 'bg-zinc-800 border-amber-400 text-amber-300 font-bold shadow-sm'
                    : 'bg-[#18181b] border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                Nenhum grátis
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setGourmetFreeChoice) {
                    setGourmetFreeChoice('catupiry')
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  gourmetFreeChoice === 'catupiry'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                    : 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>Catupiry</span>
                <span className="text-[10px] text-emerald-400 font-bold">GRÁTIS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setGourmetFreeChoice) {
                    setGourmetFreeChoice('cheddar')
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  gourmetFreeChoice === 'cheddar'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                    : 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>Cheddar</span>
                <span className="text-[10px] text-emerald-400 font-bold">GRÁTIS</span>
              </button>
            </div>

            {/* Opção de levar ambos */}
            <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs text-[#C4C4C4]">
                Deseja <b>Catupiry E Cheddar</b> juntos?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Ambos com catupiry grátis e cheddar cobrado
                    if (setGourmetFreeChoice) setGourmetFreeChoice('catupiry')
                    const cheddarItem = resolveStockItem('ing-cheddar')
                    const chKey = cheddarItem?.code || cheddarItem?.id || 'ing-cheddar'
                    setAdded((prev) => ({
                      ...prev,
                      [chKey]: 1,
                    }))
                  }}
                  className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-zinc-800 border border-zinc-700 text-[11px] text-amber-200 transition-colors"
                >
                  Ambos (+ {fmtBRL(cheddarExtraPrice)} Cheddar)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Ambos com cheddar grátis e catupiry cobrado
                    if (setGourmetFreeChoice) setGourmetFreeChoice('cheddar')
                    const catupiryItem = resolveStockItem('ing-catupiry')
                    const catKey = catupiryItem?.code || catupiryItem?.id || 'ing-catupiry'
                    setAdded((prev) => ({
                      ...prev,
                      [catKey]: 1,
                    }))
                  }}
                  className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-zinc-800 border border-zinc-700 text-[11px] text-amber-200 transition-colors"
                >
                  Ambos (+ {fmtBRL(catupiryExtraPrice)} Catupiry)
                </button>
              </div>
            </div>
          </div>
        )}

        {!beverage && item.recipe && item.recipe.length > 0 && (
          <div className="sc-field">
            <label className="sc-label">
              Ingredientes inclusos — desmarque para remover ou use o seletor para adicionar extra
            </label>
            <div className="sc-recipe-list">
              {(() => {
                // O pão tem seletor exclusivo acima; não deve aparecer como adicional de quantidade.
                const sortedRecipe = item.recipe.filter(r => !breadKind(r.ingredientId, resolveStockItem))

                return sortedRecipe.map((r) => {
                  const si = resolveStockItem(r.ingredientId)
                  const ingKey = si?.code || si?.id || r.ingredientId
                  const checked = !removed[ingKey]
                  const extraCount = Number(added[ingKey]) || 0
                  const extraPrice = extraUnitPrice(ingKey, resolveStockItem, menu)
                  const unitProduct = /^ing-(refri|agua|suco)/.test(si?.code || ingKey)

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
                          <span className="flex flex-col">
                            <span className={checked ? 'text-[var(--silver)]' : 'line-through text-[var(--muted)]'}>
                              {si ? si.name : r.ingredientId}
                            </span>
                            <span className="text-[10px] text-zinc-500">{unitProduct ? 'Incluído no combo. Para outra unidade, peça a bebida no cardápio.' : extraPrice > 0 ? `Extra: ${fmtBRL(extraPrice)} por porção` : 'Sem adicional disponível'}</span>
                          </span>
                        </label>

                        {!unitProduct && extraPrice > 0 && <div className="flex items-center gap-2 shrink-0 select-none">
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
                        </div>}
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
                            if (extraUnitPrice(topKey, resolveStockItem, menu) <= 0) return null
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
                })
              })()}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--line)] bg-[#121217] p-3 space-y-1" aria-live="polite">
          <div className="flex justify-between text-xs text-zinc-300"><span>{beverage ? 'Preço da bebida' : 'Preço do produto'}</span><span>{fmtBRL(item.price)}</span></div>
          {showBreadSelector && <div className="flex justify-between text-xs text-zinc-300"><span>{breadName(breadChoice)} por unidade</span><span>{breadExtra > 0 ? `+ ${fmtBRL(breadExtra)}` : 'Incluso'}</span></div>}
          {!beverage && <div className="flex justify-between text-xs text-zinc-300"><span>Outros adicionais por unidade</span><span>+ {fmtBRL(extrasTotal)}</span></div>}
          {extras.map(a => <div key={a.ingredientId} className="flex justify-between text-[11px] text-zinc-400">
            <span>{resolveStockItem(a.ingredientId)?.name || a.ingredientId} × {a.qty}</span>
            <span>+ {fmtBRL(extraUnitPrice(a.ingredientId, resolveStockItem, menu) * a.qty)}</span>
          </div>)}
          <div className="flex justify-between border-t border-zinc-700 pt-2 text-sm font-bold text-white"><span>Total</span><span>{fmtBRL(currentUnitTotal * qty)}</span></div>
        </div>

        <div className="sc-form-actions">
          <button className="sc-btn-primary" disabled={soda && !!setBeverageFlavor && !beverageFlavor} onClick={onConfirm}>
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
