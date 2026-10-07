import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, Layers, ArrowUp, ArrowDown } from 'lucide-react'
import type { MenuItem, InventoryItem } from '@/types/loyolas'
import { CATEGORIES, fmtBRL } from '@/lib/seeds'
import pb from '@/lib/pocketbase/client'

export interface CategoryItem {
  id: string
  name: string
  order: number
  active: boolean
  description?: string
}

interface TabCardapioProps {
  menu: MenuItem[]
  stock: InventoryItem[]
  isOffline?: boolean
  initialAction?: 'new' | 'edit' | null
  onSaveMenuItem: (itemData: {
    id?: string
    name: string
    price: number
    category: MenuItem['category']
    recipe: { ingredientId: string; qty: number }[]
  }) => Promise<void>
  onToggleActive: (id: string, current: boolean) => Promise<void>
  onDeleteMenuItem: (id: string) => Promise<void>
}

export const TabCardapio: React.FC<TabCardapioProps> = ({
  menu,
  stock,
  isOffline = false,
  initialAction = null,
  onSaveMenuItem,
  onToggleActive,
  onDeleteMenuItem,
}) => {
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState<MenuItem['category']>('Carnes')
  const [newRecipe, setNewRecipe] = useState<Record<string, string>>({})

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState<MenuItem['category']>('Carnes')
  const [editRecipe, setEditRecipe] = useState<Record<string, string>>({})

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Gerenciamento de Áreas / Categorias
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [showManageAreas, setShowManageAreas] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingAreaName, setEditingAreaName] = useState('')

  const loadCategories = async () => {
    try {
      const list = await pb.collection('categories').getFullList<CategoryItem>({
        sort: 'order',
      })
      if (list.length > 0) {
        setCategories(list)
      } else {
        // Fallback para CATEGORIES padrão
        const fallback = CATEGORIES.map((c, i) => ({
          id: `cat-${i}`,
          name: c,
          order: i + 1,
          active: true,
        }))
        setCategories(fallback)
      }
    } catch {
      const fallback = CATEGORIES.map((c, i) => ({
        id: `cat-${i}`,
        name: c,
        order: i + 1,
        active: true,
      }))
      setCategories(fallback)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleCreateArea = async () => {
    const trimmed = newAreaName.trim()
    if (!trimmed) return
    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0)
      await pb.collection('categories').create({
        name: trimmed,
        order: maxOrder + 1,
        active: true,
      })
      setNewAreaName('')
      loadCategories()
    } catch (e: any) {
      alert('Erro ao criar área: ' + (e?.message || 'Tente novamente.'))
    }
  }

  const handleUpdateArea = async (id: string) => {
    const trimmed = editingAreaName.trim()
    if (!trimmed) return
    try {
      await pb.collection('categories').update(id, { name: trimmed })
      setEditingAreaId(null)
      loadCategories()
    } catch (e: any) {
      alert('Erro ao atualizar área: ' + (e?.message || 'Tente novamente.'))
    }
  }

  const handleDeleteArea = async (id: string, name: string) => {
    if (
      !confirm(
        `Deseja remover a área "${name}"? Os itens associados continuarão no sistema como 'Outros'.`,
      )
    )
      return
    try {
      await pb.collection('categories').delete(id)
      loadCategories()
    } catch (e: any) {
      alert('Erro ao excluir área: ' + (e?.message || 'Tente novamente.'))
    }
  }

  const handleMoveArea = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const cur = categories[index]
    const target = categories[targetIndex]
    if (!cur.id.startsWith('cat-') && !target.id.startsWith('cat-')) {
      try {
        await pb.collection('categories').update(cur.id, { order: target.order })
        await pb.collection('categories').update(target.id, { order: cur.order })
        loadCategories()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const effectiveCategoriesList = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => c.name)
    }
    return CATEGORIES
  }, [categories])

  const ingredientStock = stock.filter((s) => s.group === 'Ingrediente')

  useEffect(() => {
    if (initialAction === 'new' && !isOffline) {
      setNewName('')
      setNewPrice('')
      setNewCategory('Carnes')
      setNewRecipe({})
      setNewFormOpen(true)
    }
  }, [initialAction, isOffline])

  const openNewForm = () => {
    setEditingId(null)
    setNewName('')
    setNewPrice('')
    setNewCategory('Carnes')
    setNewRecipe({})
    setNewFormOpen(true)
  }

  const handleStartInlineEdit = (item: MenuItem) => {
    setNewFormOpen(false)
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(String(item.price).replace('.', ','))
    setEditCategory(item.category)
    const recMap: Record<string, string> = {}
    ;(item.recipe || []).forEach((r) => {
      recMap[r.ingredientId] = String(r.qty)
    })
    setEditRecipe(recMap)
  }

  const handleCancelInlineEdit = () => {
    setEditingId(null)
  }

  const handleSaveInline = async () => {
    if (!editingId) return
    const trimmed = editName.trim()
    const parsedPrice = parseFloat(String(editPrice).replace(',', '.'))
    if (!trimmed || isNaN(parsedPrice) || parsedPrice <= 0) return

    const recipeArray = Object.entries(editRecipe)
      .filter(([, q]) => Number(q) > 0)
      .map(([ingredientId, qty]) => ({ ingredientId, qty: Number(qty) }))

    setSaving(true)
    try {
      await onSaveMenuItem({
        id: editingId,
        name: trimmed,
        price: parsedPrice,
        category: editCategory,
        recipe: recipeArray,
      })
      setEditingId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNew = async () => {
    const trimmed = newName.trim()
    const parsedPrice = parseFloat(String(newPrice).replace(',', '.'))
    if (!trimmed || isNaN(parsedPrice) || parsedPrice <= 0) return

    const recipeArray = Object.entries(newRecipe)
      .filter(([, q]) => Number(q) > 0)
      .map(([ingredientId, qty]) => ({ ingredientId, qty: Number(qty) }))

    setSaving(true)
    try {
      await onSaveMenuItem({
        name: trimmed,
        price: parsedPrice,
        category: newCategory,
        recipe: recipeArray,
      })
      setNewFormOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleBadgeClick = async (item: MenuItem) => {
    if (isOffline || togglingId) return
    setTogglingId(item.id)
    try {
      await onToggleActive(item.id, item.active)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="sc-card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="sc-title" style={{ marginBottom: 0 }}>
          Cardápio
        </h2>
        {!isOffline && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="sc-btn-small flex items-center gap-1 py-1 px-2.5 h-8 text-xs font-semibold !bg-zinc-800 hover:!bg-zinc-700 !text-white"
              onClick={() => setShowManageAreas((prev) => !prev)}
            >
              <Layers size={13} className="text-amber-400" />
              <span>{showManageAreas ? 'Ocultar Áreas' : 'Gerenciar Áreas'}</span>
            </button>
            {!newFormOpen && (
              <button
                className="sc-btn-small flex items-center gap-1 py-1 px-2.5 h-8 text-xs font-semibold"
                onClick={openNewForm}
              >
                <Plus size={13} />
                Novo item
              </button>
            )}
          </div>
        )}
      </div>

      {/* PAINEL DE GERENCIAMENTO DE ÁREAS / CATEGORIAS */}
      {!isOffline && showManageAreas && (
        <div className="mb-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Layers size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Áreas do Cardápio (Categorias)
              </h3>
            </div>
            <span className="text-[11px] text-zinc-500">Ordene e crie novas áreas do cardápio</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nome da nova área (ex: Sobremesas, Promoções)..."
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={handleCreateArea}
              disabled={!newAreaName.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus size={13} />
              <span>Adicionar Área</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-56 overflow-y-auto">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
              >
                {editingAreaId === cat.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={editingAreaName}
                      onChange={(e) => setEditingAreaName(e.target.value)}
                      className="flex-1 bg-black border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateArea(cat.id)}
                      className="text-emerald-400 hover:text-emerald-300 p-1"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAreaId(null)}
                      className="text-zinc-500 hover:text-white p-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-white truncate">{cat.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveArea(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Subir ordem"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveArea(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Descer ordem"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAreaId(cat.id)
                          setEditingAreaName(cat.name)
                        }}
                        className="p-1 text-zinc-400 hover:text-amber-400"
                        title="Editar nome"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArea(cat.id, cat.name)}
                        className="p-1 text-zinc-400 hover:text-red-400"
                        title="Excluir área"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOffline && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90">
          Modo offline ativo: cardápio em modo somente leitura. Alterações e novos cadastros exigem
          conexão com a internet.
        </div>
      )}

      <p className="sc-sub">
        Este cardápio é a fonte canônica para a Landing Page (/) e para a Loja do Cliente (/loja).
        Qualquer alteração de preço, nome ou disponibilidade reflete automaticamente em todos os
        canais em tempo real.
      </p>

      {/* Formulário de Novo Item */}
      {!isOffline && newFormOpen && (
        <div className="sc-form mb-5 border-emerald-500/30 bg-[var(--surface-2)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-[var(--silver)] flex items-center gap-1.5">
              <Plus size={15} className="text-emerald-500" /> Cadastrar novo produto
            </span>
            <button
              className="sc-icon-btn h-7 w-7"
              onClick={() => setNewFormOpen(false)}
              aria-label="Cancelar"
            >
              <X size={13} />
            </button>
          </div>

          <div className="sc-field">
            <label className="sc-label">Nome do item</label>
            <input
              className="sc-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: X-Especial da Casa"
            />
          </div>

          <div className="sc-field-row">
            <div className="sc-field">
              <label className="sc-label">Preço (R$)</label>
              <input
                className="sc-input"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="sc-field">
              <label className="sc-label">Categoria</label>
              <select
                className="sc-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MenuItem['category'])}
              >
                {effectiveCategoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ingredientStock.length > 0 && (
            <div className="sc-field">
              <label className="sc-label">
                Ingredientes consumidos por unidade vendida{' '}
                <span className="text-[11px] text-[var(--muted)] font-normal">
                  (materiais operacionais são controlados apenas no Estoque)
                </span>
              </label>
              <div className="sc-recipe-list border border-[var(--line)] rounded-lg p-2 bg-[var(--surface)] max-h-48 overflow-y-auto">
                {ingredientStock.map((si) => {
                  const targetKey = si.code || si.id
                  return (
                    <div
                      className="sc-recipe-row py-1 border-b border-[var(--line)] last:border-b-0"
                      key={si.id}
                    >
                      <span className="text-xs">
                        {si.name} ({si.unit})
                      </span>
                      <input
                        className="sc-input h-7 py-1 px-2 text-xs"
                        type="number"
                        min="0"
                        value={newRecipe[targetKey] ?? ''}
                        placeholder="0"
                        onChange={(e) =>
                          setNewRecipe({ ...newRecipe, [targetKey]: e.target.value })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="sc-form-actions">
            <button className="sc-btn-primary" onClick={handleSaveNew} disabled={saving}>
              {saving ? 'Adicionando…' : 'Adicionar ao cardápio'}
            </button>
            <button className="sc-btn-ghost" onClick={() => setNewFormOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Categorias e Itens */}
      {effectiveCategoriesList.map((cat) => {
        const items = menu.filter((m) => (m.category || '').trim() === cat)
        if (items.length === 0) return null

        return (
          <div key={cat} className="mb-4">
            <div className="sc-group-title">{cat}</div>
            {items.map((item) => {
              const isEditingThis = editingId === item.id

              return (
                <div key={item.id} className="transition-all">
                  <div
                    className={`sc-row ${
                      isEditingThis ? 'bg-[var(--surface-2)] border-b-0 rounded-b-none' : ''
                    }`}
                  >
                    <div className="sc-row-main">
                      <div className="sc-row-name font-semibold">{item.name}</div>
                      <div className="sc-row-meta sc-tabular">
                        {fmtBRL(item.price)}
                        {item.recipe?.length ? ` · ${item.recipe.length} ingrediente(s)` : ''}
                      </div>
                    </div>

                    <div className="sc-row-actions">
                      <button
                        type="button"
                        onClick={() => handleBadgeClick(item)}
                        disabled={isOffline || togglingId === item.id}
                        title={
                          isOffline
                            ? 'Indisponível em modo offline'
                            : item.active
                              ? 'Clique para marcar como Indisponível'
                              : 'Clique para marcar como Disponível'
                        }
                        className={`sc-badge cursor-pointer select-none transition-transform active:scale-95 border border-transparent hover:border-[var(--line)] ${
                          item.active ? '' : 'off'
                        } ${togglingId === item.id ? 'opacity-60' : ''}`}
                      >
                        {togglingId === item.id
                          ? 'Salvando…'
                          : item.active
                            ? 'Disponível'
                            : 'Indisponível'}
                      </button>

                      {!isOffline && (
                        <>
                          <button
                            className={`sc-btn-small ${
                              isEditingThis ? 'active !bg-[var(--red)] !text-white' : ''
                            }`}
                            onClick={() =>
                              isEditingThis ? handleCancelInlineEdit() : handleStartInlineEdit(item)
                            }
                            aria-label="Editar item"
                            title={
                              isEditingThis ? 'Fechar formulário de edição' : 'Editar item na linha'
                            }
                          >
                            <Pencil size={12} />
                          </button>

                          {deleteConfirmId === item.id ? (
                            <button
                              className="sc-btn-small danger"
                              onClick={() => {
                                onDeleteMenuItem(item.id)
                                setDeleteConfirmId(null)
                              }}
                            >
                              Confirmar?
                            </button>
                          ) : (
                            <button
                              className="sc-btn-small danger"
                              onClick={() => setDeleteConfirmId(item.id)}
                              aria-label="Excluir"
                              title="Excluir item do cardápio"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* FORMULÁRIO INLINE */}
                  {!isOffline && isEditingThis && (
                    <div className="p-3.5 bg-[var(--surface-2)] border border-t-0 border-[var(--line)] rounded-b-xl mb-2">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--line)]">
                        <span className="text-xs font-bold text-[var(--silver)] flex items-center gap-1.5">
                          <Pencil size={12} className="text-[var(--red)]" /> Editando: {item.name}
                        </span>
                        <button
                          type="button"
                          className="sc-icon-btn h-6 w-6"
                          onClick={handleCancelInlineEdit}
                          title="Cancelar edição"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="sc-field">
                        <label className="sc-label">Nome do produto</label>
                        <input
                          className="sc-input text-xs"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome do lanche ou bebida"
                        />
                      </div>

                      <div className="sc-field-row">
                        <div className="sc-field">
                          <label className="sc-label">Preço (R$)</label>
                          <input
                            className="sc-input text-xs"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="0,00"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="sc-field">
                          <label className="sc-label">Categoria</label>
                          <select
                            className="sc-select text-xs"
                            value={editCategory}
                            onChange={(e) =>
                              setEditCategory(e.target.value as MenuItem['category'])
                            }
                          >
                            {effectiveCategoriesList.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {ingredientStock.length > 0 && (
                        <div className="sc-field">
                          <label className="sc-label flex items-center justify-between">
                            <span>Ingredientes da receita</span>
                            <span className="text-[10px] text-[var(--muted)] font-normal">
                              Apenas insumos comestíveis
                            </span>
                          </label>
                          <div className="sc-recipe-list border border-[var(--line)] rounded-lg p-2 bg-[var(--surface)] max-h-40 overflow-y-auto">
                            {ingredientStock.map((si) => {
                              const targetKey = si.code || si.id
                              return (
                                <div
                                  className="sc-recipe-row py-1 border-b border-[var(--line)] last:border-b-0"
                                  key={si.id}
                                >
                                  <span className="text-xs">
                                    {si.name} ({si.unit})
                                  </span>
                                  <input
                                    className="sc-input h-7 py-1 px-2 text-xs"
                                    type="number"
                                    min="0"
                                    value={editRecipe[targetKey] ?? ''}
                                    placeholder="0"
                                    onChange={(e) =>
                                      setEditRecipe({
                                        ...editRecipe,
                                        [targetKey]: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          className="sc-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                          onClick={handleSaveInline}
                          disabled={saving}
                        >
                          <Check size={13} />
                          {saving ? 'Salvando…' : 'Salvar alterações'}
                        </button>
                        <button
                          type="button"
                          className="sc-btn-ghost py-2 text-xs"
                          onClick={handleCancelInlineEdit}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {!isOffline && !newFormOpen && (
        <button className="sc-btn-ghost" style={{ marginTop: 10 }} onClick={openNewForm}>
          <Plus size={13} style={{ marginRight: 5 }} />
          Novo item
        </button>
      )}
    </div>
  )
}
