import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  MapPin,
  Store,
  Phone,
  User,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  SlidersHorizontal,
  ArrowLeft,
  Share2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import type { MenuItem, InventoryItem, OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'
import { CustomizeModal } from '@/components/CustomizeModal'

export interface CustomerCartLine {
  cartLineId: string
  itemId: string
  qty: number
  removed: string[]
  added: { ingredientId: string; qty: number }[]
}

const CATEGORIES = ['Carnes', 'Frango', 'Hot-Dog', 'Gourmet', 'Especial', 'Combos', 'Bebidas']

const CART_STORAGE_KEY = 'loyolas_customer_cart_v1'

export default function LojaPublica() {
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState("Loyola's Lanches")
  const [isOpen, setIsOpen] = useState(true)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [stock, setStock] = useState<InventoryItem[]>([])

  const [activeCategory, setActiveCategory] = useState<string>('Carnes')
  const [searchTerm, setSearchTerm] = useState('')

  // Carrinho com persistência localStorage
  const [cart, setCart] = useState<CustomerCartLine[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [cartOpen, setCartOpen] = useState(false)

  // Customização
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null)
  const [customizeQty, setCustomizeQty] = useState(1)
  const [customizeRemoved, setCustomizeRemoved] = useState<Record<string, boolean>>({})
  const [customizeAdded, setCustomizeAdded] = useState<Record<string, number>>({})
  const [customizeEditingLineId, setCustomizeEditingLineId] = useState<string | null>(null)

  // Checkout dados
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'retirada' | 'entrega'>('retirada')
  const [customerAddress, setCustomerAddress] = useState('')
  const [payment, setPayment] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix')
  const [changeFor, setChangeFor] = useState('')

  // Submissão & Confirmação
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null)

  // Salvar carrinho no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  // Carregar dados iniciais
  useEffect(() => {
    let mounted = true
    const loadStore = async () => {
      try {
        const [settingsList, menuList, stockList] = await Promise.all([
          pb
            .collection('settings')
            .getFullList<{ key: string; value: string }>()
            .catch(() => []),
          pb
            .collection('menu')
            .getFullList<MenuItem>({ filter: 'active = true', sort: 'name' })
            .catch(() => []),
          pb
            .collection('inventory')
            .getFullList<InventoryItem>()
            .catch(() => []),
        ])

        if (!mounted) return
        const nameSetting = settingsList.find((s) => s.key === 'store_name')
        const openSetting = settingsList.find((s) => s.key === 'is_open')
        if (nameSetting?.value) setStoreName(nameSetting.value)
        if (openSetting) setIsOpen(openSetting.value === 'true')

        setMenu(menuList)
        setStock(stockList)
      } catch (e) {
        console.error('Erro ao carregar cardápio da loja:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStore()
    return () => {
      mounted = false
    }
  }, [])

  // Assinaturas realtime com useRealtime
  useRealtime('settings', (e) => {
    if (e.record && (e.record as any).key === 'is_open') {
      setIsOpen((e.record as any).value === 'true')
    }
    if (e.record && (e.record as any).key === 'store_name') {
      setStoreName((e.record as any).value)
    }
  })

  useRealtime('menu', () => {
    pb.collection('menu')
      .getFullList<MenuItem>({ filter: 'active = true', sort: 'name' })
      .then(setMenu)
      .catch(() => {})
  })

  const stockById = (idOrCode: string) => {
    return (
      stock.find((s) => s.code === idOrCode) ||
      stock.find((s) => s.id === idOrCode) ||
      stock.find((s) => s.name === idOrCode)
    )
  }

  const menuById = (id: string) => menu.find((m) => m.id === id || m.code === id)

  // Categorias disponíveis no cardápio canônico vindas do backend (excluindo Todos e Complementos)
  const availableCategories = useMemo(() => {
    const fromMenu = Array.from(
      new Set(menu.map((item) => String(item.category)).filter(Boolean)),
    ).filter((cat) => cat !== 'Complementos' && cat !== 'Todos')

    if (fromMenu.length > 0) {
      // Manter a ordem canônica pré-definida para as conhecidas, e adicionar novas no fim
      const ordered = CATEGORIES.filter((c) => fromMenu.includes(c))
      const others = fromMenu.filter((c) => !CATEGORIES.includes(c))
      return [...ordered, ...others]
    }
    return CATEGORIES
  }, [menu])

  // Garantir que a categoria ativa seja válida dentro das disponíveis
  const currentCategory = useMemo(() => {
    if (activeCategory && availableCategories.includes(activeCategory)) {
      return activeCategory
    }
    return availableCategories[0] || 'Carnes'
  }, [activeCategory, availableCategories])

  // Filtro de itens (excluindo 'Complementos' do cardápio público principal)
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      if (item.category === 'Complementos') return false
      const matchCat = item.category === currentCategory
      const query = searchTerm.toLowerCase().trim()
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      return matchCat && matchSearch
    })
  }, [menu, currentCategory, searchTerm])

  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizeItem(item)
    setCustomizeQty(1)
    setCustomizeRemoved({})
    setCustomizeAdded({})
    setCustomizeEditingLineId(null)
  }

  const handleEditCartLine = (line: CustomerCartLine) => {
    const item = menuById(line.itemId)
    if (!item) return
    setCustomizeItem(item)
    setCustomizeQty(line.qty)
    const removedMap: Record<string, boolean> = {}
    ;(line.removed || []).forEach((id) => {
      removedMap[id] = true
    })
    setCustomizeRemoved(removedMap)
    const addedMap: Record<string, number> = {}
    ;(line.added || []).forEach((a) => {
      addedMap[a.ingredientId] = a.qty
    })
    setCustomizeAdded(addedMap)
    setCustomizeEditingLineId(line.cartLineId)
  }

  const handleConfirmCustomize = () => {
    if (!customizeItem) return
    const removed = Object.keys(customizeRemoved).filter((id) => customizeRemoved[id])
    const added = Object.entries(customizeAdded)
      .filter(([, q]) => Number(q) > 0)
      .map(([ingredientId, qty]) => ({ ingredientId, qty: Number(qty) }))

    if (customizeEditingLineId) {
      setCart((prev) =>
        prev.map((l) =>
          l.cartLineId === customizeEditingLineId ? { ...l, qty: customizeQty, removed, added } : l,
        ),
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          cartLineId: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: customizeItem.id,
          qty: customizeQty,
          removed,
          added,
        },
      ])
    }
    setCustomizeItem(null)
    setCustomizeEditingLineId(null)
  }

  const handleCloseCustomize = () => {
    setCustomizeItem(null)
    setCustomizeEditingLineId(null)
  }

  const handleQuickAdd = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) =>
          l.itemId === item.id &&
          (!l.removed || l.removed.length === 0) &&
          (!l.added || l.added.length === 0),
      )
      if (existing) {
        return prev.map((l) =>
          l.cartLineId === existing.cartLineId ? { ...l, qty: l.qty + 1 } : l,
        )
      }
      return [
        ...prev,
        {
          cartLineId: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: item.id,
          qty: 1,
          removed: [],
          added: [],
        },
      ]
    })
  }

  const handleCartQtyChange = (cartLineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.cartLineId === cartLineId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )
  }

  const handleRemoveCartLine = (cartLineId: string) => {
    setCart((prev) => prev.filter((l) => l.cartLineId !== cartLineId))
  }

  // Totais
  const subtotal = cart.reduce((sum, line) => {
    const item = menuById(line.itemId)
    return sum + (item ? item.price * line.qty : 0)
  }, 0)

  const totalItemsCount = cart.reduce((sum, line) => sum + line.qty, 0)

  // Checkout submit via endpoint /backend/v1/orders/finalize com origin: 'online'
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!isOpen) {
      setErrorMsg('Desculpe, a loja está fechada no momento. Não é possível enviar pedidos.')
      return
    }

    if (cart.length === 0) {
      setErrorMsg('Seu carrinho está vazio.')
      return
    }

    const cleanName = customerName.trim()
    if (!cleanName) {
      setErrorMsg('Por favor, informe seu nome.')
      return
    }

    const cleanPhone = customerPhone.trim()
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 8) {
      setErrorMsg('Por favor, informe um WhatsApp válido com DDD.')
      return
    }

    if (deliveryType === 'entrega' && !customerAddress.trim()) {
      setErrorMsg('Por favor, informe o endereço completo para entrega.')
      return
    }

    setSubmitting(true)

    // Formatar itens para backend
    const items = cart.map((l) => {
      const item = menuById(l.itemId)
      return {
        itemId: l.itemId,
        name: item?.name || 'Item',
        price: item?.price || 0,
        qty: l.qty,
        removed: (l.removed || []).map((id) => stockById(id)?.name || id),
        added: (l.added || []).map((a) => ({
          name: stockById(a.ingredientId)?.name || a.ingredientId,
          qty: a.qty,
        })),
      }
    })

    // Calcular consumo de estoque (deductions)
    const deductions: Record<string, number> = {}
    cart.forEach((l) => {
      const item = menuById(l.itemId)
      ;(item?.recipe || []).forEach((r) => {
        const ingMatch = stockById(r.ingredientId)
        const ingKey = ingMatch?.code || ingMatch?.id || r.ingredientId
        if (!(l.removed || []).includes(ingKey) && !(l.removed || []).includes(r.ingredientId)) {
          deductions[ingKey] = (deductions[ingKey] || 0) + r.qty * l.qty
        }
      })
      ;(l.added || []).forEach((a) => {
        const ingMatch = stockById(a.ingredientId)
        const ingKey = ingMatch?.code || ingMatch?.id || a.ingredientId
        deductions[ingKey] = (deductions[ingKey] || 0) + a.qty * l.qty
      })
    })

    const payload = {
      origin: 'online',
      customerName: cleanName,
      customerPhone: cleanPhone,
      deliveryType,
      customerAddress:
        deliveryType === 'entrega'
          ? `${customerAddress.trim()}${payment === 'Dinheiro' && changeFor ? ` (Troco para R$ ${changeFor})` : ''}`
          : payment === 'Dinheiro' && changeFor
            ? `(Troco para R$ ${changeFor})`
            : '',
      items,
      subtotal,
      discount: 0,
      deliveryFee: 0,
      total: subtotal,
      payment,
      deductions,
    }

    try {
      const res = await pb.send<{
        success: boolean
        order: OrderRecord
      }>('/backend/v1/orders/finalize', {
        method: 'POST',
        body: payload,
      })

      if (res && res.order) {
        setConfirmedOrder(res.order)
        setCart([])
        setCartOpen(false)
        localStorage.removeItem(CART_STORAGE_KEY)
      } else {
        throw new Error('Falha ao registrar pedido.')
      }
    } catch (err: any) {
      console.error('Erro ao enviar pedido online:', err)
      setErrorMsg(
        err?.data?.error ||
          err?.message ||
          'Não foi possível enviar o pedido. Tente novamente em alguns instantes.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-[#E10600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#C0C0C0] font-medium text-sm">Carregando cardápio de Loyola's...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#E10600] selection:text-white">
      {/* 1. Header do Cliente */}
      <header className="sticky top-0 z-30 bg-[#121215]/95 backdrop-blur-md border-b border-[#27272A] px-4 py-3 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 rounded-lg bg-[#17171C] border border-[#27272A] flex items-center justify-center text-[#C0C0C0] hover:text-white transition-colors"
              title="Voltar para a página inicial"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#E10600] text-white flex items-center justify-center font-black text-lg shadow-[0_0_12px_rgba(225,6,0,0.4)]">
                L
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white leading-tight font-heading">
                  {storeName}
                </h1>
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  <span className={isOpen ? 'text-emerald-400 font-semibold' : 'text-red-400'}>
                    {isOpen ? 'Aberto agora' : 'Fechado no momento'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative px-3.5 py-2 rounded-lg bg-[#17171C] hover:bg-[#27272A] border border-[#27272A] text-white flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              aria-label="Abrir carrinho"
            >
              <ShoppingBag size={17} className="text-[#E10600]" />
              <span className="font-semibold text-xs hidden sm:inline">Carrinho</span>
              {totalItemsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#E10600] text-white text-[11px] font-bold min-w-[20px] text-center">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Loja Fechada */}
      {!isOpen && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3 text-xs sm:text-sm font-medium">
            <AlertCircle size={18} className="shrink-0 text-amber-400" />
            <div>
              <b>Estamos fechados agora.</b> Você pode consultar o cardápio, mas pedidos online só
              serão aceitos quando a lanchonete reabrir.
            </div>
          </div>
        </div>
      )}

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-28">
        {/* Barra de Busca */}
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA0] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por lanche, cachorro-quente, refrigerante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121215] border border-[#27272A] text-sm text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9A9CA0] hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categorias (Pills horizontais) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
          {availableCategories.map((cat) => {
            const active = currentCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                  active
                    ? 'bg-[#E10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.35)]'
                    : 'bg-[#121215] text-[#C0C0C0] border border-[#27272A] hover:border-[#3f3f46]'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Lista de Itens do Cardápio Canônico */}
        {filteredMenu.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#27272A] bg-[#121215]">
            <p className="text-[#C0C0C0] text-sm font-medium">Nenhum item encontrado.</p>
            <p className="text-xs text-[#9A9CA0] mt-1">
              Tente buscar por outro termo ou escolha outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredMenu.map((item) => {
              const hasRecipe = item.recipe && item.recipe.length > 0
              const recipeDescriptions = hasRecipe
                ? item.recipe
                    ?.map((r) => stockById(r.ingredientId)?.name)
                    .filter(Boolean)
                    .join(', ')
                : ''

              return (
                <div
                  key={item.id}
                  className="bg-[#121215] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between hover:border-[#3f3f46] transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-white leading-snug group-hover:text-[#E10600] transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#17171C] text-[#9A9CA0] shrink-0 font-medium">
                        {item.category}
                      </span>
                    </div>

                    {recipeDescriptions && (
                      <p className="text-[11px] text-[#9A9CA0] line-clamp-2 mt-1 leading-relaxed">
                        {recipeDescriptions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1f1f23]">
                    <span className="font-bold text-base text-white font-mono">
                      {fmtBRL(item.price)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {hasRecipe ? (
                        <button
                          type="button"
                          disabled={!isOpen}
                          onClick={() => handleOpenCustomize(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <SlidersHorizontal size={13} />
                          <span>Personalizar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isOpen}
                          onClick={() => handleQuickAdd(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 3. Barra Fixa Inferior Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-[#121215]/95 backdrop-blur-md border-t border-[#27272A] p-3 shadow-2xl">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-[#9A9CA0] uppercase tracking-wider font-semibold">
                Total do Pedido
              </div>
              <div className="text-lg font-black text-white font-mono leading-tight">
                {fmtBRL(subtotal)}
                <span className="text-xs text-[#C0C0C0] font-normal ml-1.5">
                  ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#E10600] hover:bg-[#9E0400] text-white font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(225,6,0,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag size={16} />
              <span>Ver Pedido</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Drawer de Carrinho e Checkout */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#121215] border-l border-[#27272A] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Carrinho */}
            <div className="px-4 py-3.5 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#E10600]" />
                <h2 className="font-bold text-base text-white">Seu Pedido</h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#17171C] text-[#C0C0C0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo Carrinho com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-12 text-[#9A9CA0] text-sm">
                  Seu carrinho está vazio no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#9A9CA0] uppercase tracking-wider">
                    Itens adicionados
                  </div>
                  {cart.map((line) => {
                    const item = menuById(line.itemId)
                    return (
                      <div
                        key={line.cartLineId}
                        className="p-3 rounded-xl bg-[#17171C] border border-[#27272A] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-white">
                              {item?.name || 'Item'}
                            </div>
                            <div className="text-xs text-[#C0C0C0] font-mono">
                              {fmtBRL((item?.price || 0) * line.qty)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item?.recipe && item.recipe.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleEditCartLine(line)}
                                className="text-[11px] px-2 py-1 rounded bg-[#27272A] text-[#C0C0C0] hover:text-white cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveCartLine(line.cartLineId)}
                              className="text-[#9A9CA0] hover:text-red-400 p-1 cursor-pointer"
                              title="Remover item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {line.removed && line.removed.length > 0 && (
                          <div className="text-[11px] text-red-400/90 leading-tight">
                            Sem: {line.removed.join(', ')}
                          </div>
                        )}
                        {line.added && line.added.length > 0 && (
                          <div className="text-[11px] text-emerald-400/90 leading-tight">
                            Adicionais:{' '}
                            {line.added
                              .map(
                                (a) =>
                                  `${stockById(a.ingredientId)?.name || a.ingredientId} x${a.qty}`,
                              )
                              .join(', ')}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#9A9CA0]">Quantidade</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCartQtyChange(line.cartLineId, -1)}
                              className="w-7 h-7 rounded-lg bg-[#27272A] hover:bg-[#3f3f46] text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold text-white min-w-[16px] text-center font-mono">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCartQtyChange(line.cartLineId, 1)}
                              className="w-7 h-7 rounded-lg bg-[#27272A] hover:bg-[#3f3f46] text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Formulário de Identificação do Cliente */}
              {cart.length > 0 && (
                <form
                  onSubmit={handleCheckout}
                  id="public-checkout-form"
                  className="space-y-4 pt-2 border-t border-[#27272A]"
                >
                  <div className="text-xs font-bold text-[#9A9CA0] uppercase tracking-wider">
                    Dados para o Pedido
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                        Seu nome *
                      </label>
                      <div className="relative">
                        <User
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9CA0]"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Como podemos te chamar?"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#17171C] border border-[#27272A] rounded-lg text-xs text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                        WhatsApp (com DDD) *
                      </label>
                      <div className="relative">
                        <Phone
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9CA0]"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="(12) 99999-9999"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#17171C] border border-[#27272A] rounded-lg text-xs text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tipo de Entrega */}
                  <div>
                    <label className="block text-xs font-semibold text-[#C0C0C0] mb-1.5">
                      Como deseja receber?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('retirada')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          deliveryType === 'retirada'
                            ? 'bg-[#E10600] border-[#E10600] text-white shadow-sm'
                            : 'bg-[#17171C] border-[#27272A] text-[#C0C0C0] hover:text-white'
                        }`}
                      >
                        <Store size={14} />
                        <span>Retirar no balcão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType('entrega')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          deliveryType === 'entrega'
                            ? 'bg-[#E10600] border-[#E10600] text-white shadow-sm'
                            : 'bg-[#17171C] border-[#27272A] text-[#C0C0C0] hover:text-white'
                        }`}
                      >
                        <MapPin size={14} />
                        <span>Entrega (Delivery)</span>
                      </button>
                    </div>

                    {deliveryType === 'entrega' && (
                      <div className="mt-2.5">
                        <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                          Endereço completo (Rua, Nº, Bairro, Ponto de ref.) *
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Ex: Av. Nicanor Ramos Nogueira, 120, Araretama"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full p-2.5 bg-[#17171C] border border-[#27272A] rounded-lg text-xs text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-xs font-semibold text-[#C0C0C0] mb-1.5">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Pix', label: 'Pix', icon: QrCode },
                        { id: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
                        { id: 'Cartão', label: 'Cartão', icon: CreditCard },
                      ].map((pay) => {
                        const Icon = pay.icon
                        const active = payment === pay.id
                        return (
                          <button
                            key={pay.id}
                            type="button"
                            onClick={() => setPayment(pay.id as any)}
                            className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              active
                                ? 'bg-[#E10600] border-[#E10600] text-white shadow-sm'
                                : 'bg-[#17171C] border-[#27272A] text-[#C0C0C0] hover:text-white'
                            }`}
                          >
                            <Icon size={14} />
                            <span>{pay.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {payment === 'Dinheiro' && (
                      <div className="mt-2.5">
                        <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                          Precisa de troco para quanto? (opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 50 ou deixe em branco se não precisar"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          className="w-full px-3 py-2 bg-[#17171C] border border-[#27272A] rounded-lg text-xs text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600]"
                        />
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Footer Carrinho / Botão Enviar */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#27272A] bg-[#121215] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#C0C0C0]">Subtotal</span>
                  <span className="font-bold text-white font-mono">{fmtBRL(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold">
                  <span className="text-white">Total a Pagar</span>
                  <span className="text-white font-mono text-lg">{fmtBRL(subtotal)}</span>
                </div>

                <button
                  type="submit"
                  form="public-checkout-form"
                  disabled={submitting || !isOpen}
                  className="w-full py-3 rounded-xl bg-[#E10600] hover:bg-[#9E0400] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,6,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando Pedido ao Caixa...</span>
                    </>
                  ) : !isOpen ? (
                    <span>Loja Fechada no Momento</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirmar e Enviar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Modal de Confirmação Pós-Envio */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-2xl p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Pedido Recebido!</h3>
              <p className="text-xs text-[#C0C0C0] mt-1">
                Seu pedido foi direcionado ao terminal do Loyola's Lanches. O operador confirmará a
                comanda em instantes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#18181d] border border-[#27272A] space-y-1 text-center">
              <span className="text-xs text-[#9A9CA0] uppercase tracking-wider font-semibold">
                Número da Comanda
              </span>
              <div className="text-3xl font-black text-[#E10600] font-mono tracking-tight">
                #{padTicket(confirmedOrder.ticketNumber)}
              </div>
              <div className="text-xs text-[#C0C0C0] pt-1">
                Total: <b>{fmtBRL(confirmedOrder.total)}</b> ({confirmedOrder.payment})
              </div>
            </div>

            <div className="text-xs text-[#C0C0C0] space-y-1 text-left bg-[#17171C] p-3 rounded-lg border border-[#27272A]">
              <p>
                <b>Cliente:</b> {confirmedOrder.customerName}
              </p>
              <p>
                <b>Modalidade:</b>{' '}
                {confirmedOrder.deliveryType === 'entrega'
                  ? 'Entrega (Delivery)'
                  : 'Retirada no balcão'}
              </p>
              {confirmedOrder.deliveryType === 'entrega' && confirmedOrder.customerAddress && (
                <p>
                  <b>Endereço:</b> {confirmedOrder.customerAddress}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/5512991591915?text=${encodeURIComponent(
                  `Olá! Acabei de enviar o pedido #${padTicket(confirmedOrder.ticketNumber)} no app do Loyola's Lanches em nome de ${confirmedOrder.customerName} (${fmtBRL(confirmedOrder.total)}).`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <Share2 size={13} />
                <span>Enviar aviso no WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="w-full py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3f3f46] text-white font-bold text-xs transition-all cursor-pointer"
              >
                Fazer outro pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal de Customização Reutilizado */}
      <CustomizeModal
        item={customizeItem}
        stock={stock}
        qty={customizeQty}
        removed={customizeRemoved}
        added={customizeAdded}
        isEditing={Boolean(customizeEditingLineId)}
        onClose={handleCloseCustomize}
        onConfirm={handleConfirmCustomize}
        setQty={setCustomizeQty}
        setRemoved={setCustomizeRemoved}
        setAdded={setCustomizeAdded}
        resolveStockItem={stockById}
      />
    </div>
  )
}
