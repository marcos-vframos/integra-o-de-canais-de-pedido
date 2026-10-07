import React, { useState } from 'react'
import { Search, X, Pencil, Minus, Plus, Trash2, Printer } from 'lucide-react'
import type { MenuItem, InventoryItem, CartLine } from '@/types/loyolas'
import { CATEGORIES, PAYMENTS, fmtBRL, padTicket } from '@/lib/seeds'

interface TabPedidoProps {
  menu: MenuItem[]
  stock: InventoryItem[]
  cart: CartLine[]
  ticketCounter: number
  isOffline?: boolean
  pendingQueueCount?: number
  payment: 'Dinheiro' | 'Pix' | 'Cartão'
  setPayment: (p: 'Dinheiro' | 'Pix' | 'Cartão') => void
  orderDiscount: number
  setOrderDiscount: (val: number) => void
  orderDeliveryFee: number
  setOrderDeliveryFee: (val: number) => void
  onAddToCart: (item: MenuItem) => void
  onOpenCustomize: (item: MenuItem) => void
  onOpenEditCartLine: (line: CartLine) => void
  onChangeCartQty: (cartLineId: string, delta: number) => void
  onRemoveCartLine: (cartLineId: string) => void
  onFinalizeOrder: () => void
  onPrintCartDraft: () => void
  menuById: (id: string) => MenuItem | undefined
  resolveStockItem: (idOrCode: string) => InventoryItem | undefined
}

export const TabPedido: React.FC<TabPedidoProps> = ({
  menu,
  cart,
  ticketCounter,
  isOffline = false,
  pendingQueueCount = 0,
  payment,
  setPayment,
  orderDiscount,
  setOrderDiscount,
  orderDeliveryFee,
  setOrderDeliveryFee,
  onAddToCart,
  onOpenCustomize,
  onOpenEditCartLine,
  onChangeCartQty,
  onRemoveCartLine,
  onFinalizeOrder,
  onPrintCartDraft,
  menuById,
  resolveStockItem,
}) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const orderCategories = CATEGORIES.filter((c) => c !== 'Complementos')
  const [categoryFilter, setCategoryFilter] = useState<string>(orderCategories[0] || 'Carnes')

  const normalizeText = (text: string) =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  const normalizedQuery = normalizeText(searchQuery.trim())

  const visibleMenu = menu
    .filter((m) => m.active)
    .filter((m) => (normalizedQuery ? true : m.category === categoryFilter))
    .filter((m) => !normalizedQuery || normalizeText(m.name).includes(normalizedQuery))

  const subtotal = cart.reduce((sum, l) => {
    const item = menuById(l.itemId)
    if (!item) return sum
    let lineUnitPrice = item.price
    ;(l.added || []).forEach((a) => {
      const stockItem = resolveStockItem(a.ingredientId)
      const ingKey = stockItem?.code || a.ingredientId
      let addPrice = 3
      if (ingKey === 'ing-catupiry' || ingKey.includes('catupiry')) {
        addPrice = 6
      } else if (ingKey === 'ing-cheddar' || ingKey.includes('cheddar')) {
        addPrice = 5
      } else {
        const comp = menu.find(
          (m) =>
            m.category === 'Complementos' &&
            m.recipe?.some((r) => r.ingredientId === a.ingredientId || r.ingredientId === ingKey),
        )
        if (comp) addPrice = comp.price
      }
      lineUnitPrice += addPrice * a.qty
    })
    return sum + lineUnitPrice * l.qty
  }, 0)

  const effectiveDiscount = Math.min(orderDiscount, subtotal)
  const finalTotal = Math.max(0, subtotal - effectiveDiscount + orderDeliveryFee)

  return (
    <div className="sc-grid-2">
      {/* Coluna Esquerda: Novo Pedido */}
      <div className="sc-card">
        <div className="sc-title-row">
          <h2 className="sc-title" style={{ marginBottom: 0, paddingBottom: 0 }}>
            Novo pedido (Balcão)
          </h2>
          <button
            className={`sc-icon-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) setSearchQuery('')
            }}
            aria-label="Buscar item"
          >
            <Search size={15} />
          </button>
        </div>

        {searchOpen && (
          <div className="sc-search-bar">
            <Search size={14} className="sc-search-icon" />
            <input
              className="sc-search-input"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do item..."
            />
            {searchQuery && (
              <button
                className="sc-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        <div className="sc-chips">
          {orderCategories.map((c) => (
            <button
              key={c}
              className={`sc-chip ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(c)
                if (searchQuery) setSearchQuery('')
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {visibleMenu.length === 0 ? (
          <p className="sc-empty">Nenhum item encontrado.</p>
        ) : (
          <div className="sc-menu-grid">
            {visibleMenu.map((item) => (
              <button
                key={item.id}
                className="sc-menu-item"
                onClick={() =>
                  item.category === 'Complementos' ? onAddToCart(item) : onOpenCustomize(item)
                }
              >
                <div className="sc-menu-item-name">{item.name}</div>
                <div className="sc-menu-item-price sc-tabular">{fmtBRL(item.price)}</div>
                <div className="sc-menu-item-cat">{item.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coluna Direita: Comanda */}
      <div className="sc-card">
        <h2 className="sc-title">Comanda</h2>
        {isOffline ? (
          <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>● Modo offline ativo</span>
              {pendingQueueCount > 0 && (
                <span className="text-[11px] opacity-80">({pendingQueueCount} na fila)</span>
              )}
            </div>
            <div className="text-[11px] mt-0.5 text-amber-300/80">
              Próxima comanda provisória:{' '}
              <span className="font-mono font-bold text-amber-300">
                ##{String(ticketCounter).padStart(4, '0')} (pendente)
              </span>
              . A comanda definitiva será gerada ao sincronizar com a internet.
            </div>
          </div>
        ) : (
          <p className="sc-note">
            Próxima comanda: <span className="sc-ticket-badge">{padTicket(ticketCounter)}</span>
          </p>
        )}

        {cart.length === 0 ? (
          <p className="sc-empty">Toque em um item do cardápio para adicionar ao pedido.</p>
        ) : (
          cart.map((l) => {
            const item = menuById(l.itemId)
            if (!item) return null

            return (
              <div className="sc-cart-line" key={l.cartLineId}>
                <div className="sc-cart-line-name">
                  {item.name}
                  {(() => {
                    let unitTotal = item.price
                    ;(l.added || []).forEach((a) => {
                      const stockItem = resolveStockItem(a.ingredientId)
                      const ingKey = stockItem?.code || a.ingredientId
                      let addPrice = 3
                      if (ingKey === 'ing-catupiry' || ingKey.includes('catupiry')) addPrice = 6
                      else if (ingKey === 'ing-cheddar' || ingKey.includes('cheddar')) addPrice = 5
                      else {
                        const comp = menu.find(
                          (m) =>
                            m.category === 'Complementos' &&
                            m.recipe?.some(
                              (r) => r.ingredientId === a.ingredientId || r.ingredientId === ingKey,
                            ),
                        )
                        if (comp) addPrice = comp.price
                      }
                      unitTotal += addPrice * a.qty
                    })
                    return (
                      <div className="sc-cart-line-price sc-tabular">
                        {fmtBRL(unitTotal)} un.{' '}
                        {unitTotal > item.price && (
                          <span className="text-[10px] text-zinc-400 font-normal">
                            ({fmtBRL(item.price)} base)
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  {(l.removed?.length > 0 ||
                    l.added?.length > 0 ||
                    (l.gourmetFreeChoice && l.gourmetFreeChoice !== 'none')) && (
                    <div className="sc-cart-tags">
                      {l.gourmetFreeChoice && l.gourmetFreeChoice !== 'none' && (
                        <div className="text-[10px] text-amber-300 font-bold">
                          ★ Cortesia:{' '}
                          {l.gourmetFreeChoice === 'catupiry'
                            ? 'Catupiry (Grátis)'
                            : 'Cheddar (Grátis)'}
                        </div>
                      )}
                      {l.removed?.length > 0 && (
                        <div className="sc-cart-tag-removed">
                          sem: {l.removed.map((id) => resolveStockItem(id)?.name || id).join(', ')}
                        </div>
                      )}
                      {l.added?.length > 0 && (
                        <div className="sc-cart-tag-added">
                          +{' '}
                          {l.added
                            .map(
                              (a) =>
                                `${resolveStockItem(a.ingredientId)?.name || a.ingredientId} x${a.qty}`,
                            )
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="sc-qty-ctrl">
                  <button
                    className="sc-round-btn"
                    onClick={() => onOpenEditCartLine(l)}
                    aria-label="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="sc-round-btn"
                    onClick={() => onChangeCartQty(l.cartLineId, -1)}
                    aria-label="Diminuir"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="sc-tabular">{l.qty}</span>
                  <button
                    className="sc-round-btn"
                    onClick={() => onChangeCartQty(l.cartLineId, 1)}
                    aria-label="Aumentar"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="sc-round-btn danger"
                    onClick={() => onRemoveCartLine(l.cartLineId)}
                    aria-label="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}

        {cart.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>Subtotal</span>
              <span className="sc-tabular font-semibold text-[var(--silver)]">
                {fmtBRL(subtotal)}
              </span>
            </div>

            {/* Ajustes: Desconto e Taxa de Entrega */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] text-[var(--muted)] font-medium mb-1">
                  Desconto (R$)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.5"
                    className="sc-input text-xs py-1.5 px-2 h-8"
                    placeholder="0,00"
                    value={orderDiscount === 0 ? '' : orderDiscount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (isNaN(val) || val <= 0) {
                        setOrderDiscount(0)
                      } else {
                        const clamped = Math.min(val, subtotal)
                        setOrderDiscount(clamped)
                      }
                    }}
                  />
                  {orderDiscount > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderDiscount(0)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--red)] p-0.5"
                      aria-label="Limpar desconto"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {orderDiscount > subtotal && subtotal > 0 && (
                  <span className="text-[10px] text-red-400">Máx: {fmtBRL(subtotal)}</span>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-[var(--muted)] font-medium mb-1">
                  Taxa entrega (R$)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="sc-input text-xs py-1.5 px-2 h-8"
                    placeholder="0,00"
                    value={orderDeliveryFee === 0 ? '' : orderDeliveryFee}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (isNaN(val) || val <= 0) {
                        setOrderDeliveryFee(0)
                      } else {
                        setOrderDeliveryFee(val)
                      }
                    }}
                  />
                  {orderDeliveryFee > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderDeliveryFee(0)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--red)] p-0.5"
                      aria-label="Limpar taxa"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {effectiveDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>Desconto aplicado</span>
                <span className="sc-tabular">- {fmtBRL(effectiveDiscount)}</span>
              </div>
            )}
            {orderDeliveryFee > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span>Taxa de entrega</span>
                <span className="sc-tabular">+ {fmtBRL(orderDeliveryFee)}</span>
              </div>
            )}
          </div>
        )}

        <div className="sc-cart-total">
          <span className="sc-cart-total-label">Total</span>
          <span className="sc-cart-total-val sc-tabular">{fmtBRL(finalTotal)}</span>
        </div>

        <div className="sc-pay-row">
          {PAYMENTS.map((p) => (
            <button
              key={p}
              className={`sc-pay-btn ${payment === p ? 'active' : ''}`}
              onClick={() => setPayment(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <button className="sc-btn-primary" disabled={cart.length === 0} onClick={onFinalizeOrder}>
          {isOffline ? 'Finalizar pedido (salvar na fila offline)' : 'Finalizar pedido (Balcão)'}
        </button>
        <button
          className="sc-btn-secondary"
          disabled={cart.length === 0}
          onClick={onPrintCartDraft}
        >
          <Printer size={14} /> Imprimir comanda
        </button>
      </div>
    </div>
  )
}
