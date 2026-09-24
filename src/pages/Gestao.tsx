import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Wallet,
  Printer,
  RotateCcw,
  Check,
  X,
  Inbox,
  Settings as SettingsIcon,
  Store as StoreIcon,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { MenuItem, InventoryItem, OrderRecord, ClosureRecord, CartLine } from '@/types/loyolas'
import { fmtBRL, padTicket, uid, seedStock, seedMenu } from '@/lib/seeds'

import { TabPedido } from '@/components/TabPedido'
import { TabCardapio } from '@/components/TabCardapio'
import { TabEstoque } from '@/components/TabEstoque'
import { TabCaixa } from '@/components/TabCaixa'
import { TabPedidosOnline } from '@/components/TabPedidosOnline'
import { CustomizeModal } from '@/components/CustomizeModal'
import { ReceiptModal } from '@/components/ReceiptModal'
import { ClosureModal } from '@/components/ClosureModal'
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge'
import { StoreCloseChoiceModal } from '@/components/StoreCloseChoiceModal'
import { OfflineQueueModal } from '@/components/OfflineQueueModal'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { OfflineOrderItem } from '@/types/offline'
import {
  saveMenuCache,
  getMenuCache,
  saveStockCache,
  getStockCache,
  saveTicketCounterCache,
  resetTicketCounterCache,
  getTicketCounterCache,
  saveSettingsCache,
  getSettingsCache,
} from '@/lib/offlineCache'
import { getOfflineQueue, enqueueOfflineOrder, removeOfflineOrderItem } from '@/lib/offlineQueue'
import { processOfflineQueue, isCurrentlySyncing } from '@/lib/offlineSync'

export default function Gestao() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'pedido'
  const { toast } = useToast()

  const [loaded, setLoaded] = useState(false)
  const [cartName, setCartName] = useState("Loyola's Lanches")
  const [isOpen, setIsOpen] = useState(true)
  const [ticketCounter, setTicketCounter] = useState(1)

  const [menu, setMenu] = useState<MenuItem[]>([])
  const [stock, setStock] = useState<InventoryItem[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [closures, setClosures] = useState<ClosureRecord[]>([])

  // Offline status & Queue state
  const isOnline = useOnlineStatus()
  const [offlineQueue, setOfflineQueue] = useState<OfflineOrderItem[]>(() => getOfflineQueue())
  const [isSyncing, setIsSyncing] = useState<boolean>(() => isCurrentlySyncing())
  const [queueModalOpen, setQueueModalOpen] = useState(false)

  // Cart & Order state (Balcão)
  const [cart, setCart] = useState<CartLine[]>([])
  const [payment, setPayment] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Dinheiro')
  const [orderDiscount, setOrderDiscount] = useState<number>(0)
  const [orderDeliveryFee, setOrderDeliveryFee] = useState<number>(0)
  const [banner, setBanner] = useState('')
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<OrderRecord | null>(null)

  // Customize Modal state
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null)
  const [customizeQty, setCustomizeQty] = useState(1)
  const [customizeRemoved, setCustomizeRemoved] = useState<Record<string, boolean>>({})
  const [customizeAdded, setCustomizeAdded] = useState<Record<string, number>>({})
  const [customizeEditingLineId, setCustomizeEditingLineId] = useState<string | null>(null)

  // Receipt Modal state
  const [printTicket, setPrintTicket] = useState<(OrderRecord & { status?: string }) | null>(null)

  // Closing Modal state
  const [closingPreviewOpen, setClosingPreviewOpen] = useState(false)
  const [closingDiscount, setClosingDiscount] = useState('')
  const [viewingClosure, setViewingClosure] = useState<ClosureRecord | null>(null)
  const [justClosedClosure, setJustClosedClosure] = useState<ClosureRecord | null>(null)

  // Store metadata
  const [storeCnpj, setStoreCnpj] = useState<string>('')
  const [storePhone, setStorePhone] = useState<string>('')
  const [storeAddress, setStoreAddress] = useState<string>('')

  // Reset defaults confirm
  const [resetConfirm, setResetConfirm] = useState(false)

  // Modal de escolha ao fechar loja
  const [storeCloseModalOpen, setStoreCloseModalOpen] = useState(false)

  // Helper resolvers
  const menuById = useCallback(
    (id: string) => menu.find((m) => m.id === id || m.code === id),
    [menu],
  )
  const stockById = useCallback(
    (idOrCode: string) => stock.find((s) => s.id === idOrCode || s.code === idOrCode),
    [stock],
  )

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [mRecords, sRecords, oRecords, cRecords, settingsList] = await Promise.all([
        pb
          .collection('menu')
          .getFullList<MenuItem>({ sort: 'name' })
          .catch((e) => {
            console.warn('Falha na consulta remota de menu:', e)
            return null
          }),
        pb
          .collection('inventory')
          .getFullList<InventoryItem>({ sort: 'name' })
          .catch((e) => {
            console.warn('Falha na consulta remota de estoque:', e)
            return null
          }),
        pb
          .collection('orders')
          .getFullList<OrderRecord>({ sort: '-ticketNumber' })
          .catch(() => null),
        pb
          .collection('closures')
          .getFullList<ClosureRecord>({ sort: 'closedAt' })
          .catch(() => null),
        pb
          .collection('settings')
          .getFullList<{ id: string; key: string; value: string }>()
          .catch(() => null),
      ])

      const cachedMenu = getMenuCache()
      const cachedStock = getStockCache()
      const cachedCounter = getTicketCounterCache()
      const cachedSettings = getSettingsCache()

      const resolvedMenu = mRecords ?? cachedMenu ?? seedMenu().map((m) => ({ ...m, id: m.code }))
      const resolvedStock =
        sRecords ?? cachedStock ?? seedStock().map((s) => ({ ...s, id: s.code }))

      setMenu(resolvedMenu)
      setStock(resolvedStock)

      if (mRecords) saveMenuCache(mRecords)
      if (sRecords) saveStockCache(sRecords)

      if (oRecords) setOrders(oRecords)
      if (cRecords) setClosures(cRecords)

      if (settingsList) {
        const nameSetting = settingsList.find((s) => s.key === 'store_name')
        const openSetting = settingsList.find((s) => s.key === 'is_open')
        const counterSetting = settingsList.find((s) => s.key === 'ticket_counter')
        const cnpjSetting = settingsList.find((s) => s.key === 'store_cnpj')
        const phoneSetting = settingsList.find((s) => s.key === 'store_phone')
        const addressSetting = settingsList.find((s) => s.key === 'store_address')

        const currentName = nameSetting?.value ?? "Loyola's Lanches"
        const currentOpen = openSetting?.value !== 'false'
        const currentCounter = counterSetting ? parseInt(counterSetting.value, 10) || 1 : 1
        const currentCnpj = cnpjSetting?.value ?? ''
        const currentPhone = phoneSetting?.value ?? ''
        const currentAddress = addressSetting?.value ?? ''

        setCartName(currentName)
        setIsOpen(currentOpen)
        setTicketCounter(currentCounter)
        setStoreCnpj(currentCnpj)
        setStorePhone(currentPhone)
        setStoreAddress(currentAddress)

        saveSettingsCache({
          storeName: currentName,
          isOpen: currentOpen,
          ticketCounter: currentCounter,
          storeCnpj: currentCnpj,
          storePhone: currentPhone,
          storeAddress: currentAddress,
        })
        saveTicketCounterCache(currentCounter)
      } else if (cachedSettings) {
        setCartName(cachedSettings.storeName)
        setIsOpen(cachedSettings.isOpen)
        setTicketCounter(cachedCounter || cachedSettings.ticketCounter || 1)
        if (cachedSettings.storeCnpj) setStoreCnpj(cachedSettings.storeCnpj)
        if (cachedSettings.storePhone) setStorePhone(cachedSettings.storePhone)
        if (cachedSettings.storeAddress) setStoreAddress(cachedSettings.storeAddress)
      } else if (cachedCounter) {
        setTicketCounter(cachedCounter)
      }

      setLoaded(true)
    } catch (err) {
      console.error('Falha geral ao carregar dados do PocketBase:', err)
      const cachedMenu = getMenuCache()
      const cachedStock = getStockCache()
      const cachedCounter = getTicketCounterCache()
      const cachedSettings = getSettingsCache()

      if (cachedMenu) setMenu(cachedMenu)
      if (cachedStock) setStock(cachedStock)
      if (cachedSettings) {
        setCartName(cachedSettings.storeName)
        setIsOpen(cachedSettings.isOpen)
      }
      if (cachedCounter) setTicketCounter(cachedCounter)

      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    const handleQueueChange = (e: any) => {
      const q = e?.detail || getOfflineQueue()
      setOfflineQueue(q)
    }
    const handleSyncStatus = (e: any) => {
      setIsSyncing(Boolean(e?.detail?.isSyncing))
    }

    window.addEventListener('loyolas_offline_queue_changed', handleQueueChange)
    window.addEventListener('loyolas_sync_status_changed', handleSyncStatus)

    return () => {
      window.removeEventListener('loyolas_offline_queue_changed', handleQueueChange)
      window.removeEventListener('loyolas_sync_status_changed', handleSyncStatus)
    }
  }, [])

  const handleTriggerSync = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão com a internet',
        description: 'Conecte-se para sincronizar os pedidos da fila.',
        variant: 'destructive',
      })
      return
    }

    const result = await processOfflineQueue({
      onOrderSynced: (syncedOrder) => {
        setOrders((prev) => {
          if (prev.some((o) => o.id === syncedOrder.id)) return prev
          return [syncedOrder, ...prev]
        })
        setTicketCounter((prev) => Math.max(prev, (syncedOrder.ticketNumber || 0) + 1))
      },
      onLowStock: (warnings) => {
        if (warnings.length > 0) {
          toast({
            title: 'Aviso de estoque baixo pós-sincronização',
            description: `Itens com estoque baixo: ${warnings.join(', ')}`,
          })
        }
      },
    })

    setOfflineQueue(getOfflineQueue())

    if (result.succeeded > 0) {
      const lastSynced = result.syncedOrders[result.syncedOrders.length - 1]
      if (lastSynced) {
        setLastFinalizedOrder(lastSynced)
        setBanner(
          `Sincronizado: ${result.succeeded} pedido(s) gravado(s). Última comanda: #${String(lastSynced.ticketNumber).padStart(4, '0')}.`,
        )
      }
      toast({
        title: 'Sincronização concluída!',
        description: `${result.succeeded} pedido(s) sincronizado(s) com sucesso.`,
      })
      pb.collection('inventory')
        .getFullList<InventoryItem>({ sort: 'name' })
        .then((s) => {
          setStock(s)
          saveStockCache(s)
        })
        .catch(() => {})
      pb.collection('orders')
        .getFullList<OrderRecord>({ sort: '-ticketNumber' })
        .then(setOrders)
        .catch(() => {})
    } else if (result.failedPermanent > 0) {
      toast({
        title: 'Atenção na sincronização',
        description: 'Algum pedido na fila teve erro de validação. Abra a fila para conferir.',
        variant: 'destructive',
      })
    }
  }, [isOnline, toast])

  useEffect(() => {
    if (isOnline) {
      handleTriggerSync()
    }
  }, [isOnline, handleTriggerSync])

  useEffect(() => {
    if (!isOnline) return
    const timer = setInterval(() => {
      if (getOfflineQueue().length > 0) {
        handleTriggerSync()
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [isOnline, handleTriggerSync])

  // Realtime updates
  useRealtime('menu', () => {
    pb.collection('menu')
      .getFullList<MenuItem>({ sort: 'name' })
      .then(setMenu)
      .catch(() => {})
  })

  useRealtime('inventory', () => {
    pb.collection('inventory')
      .getFullList<InventoryItem>({ sort: 'name' })
      .then(setStock)
      .catch(() => {})
  })

  useRealtime('orders', () => {
    pb.collection('orders')
      .getFullList<OrderRecord>({ sort: '-ticketNumber' })
      .then(setOrders)
      .catch(() => {})
  })

  useRealtime('closures', () => {
    pb.collection('closures')
      .getFullList<ClosureRecord>({ sort: 'closedAt' })
      .then(setClosures)
      .catch(() => {})
  })

  useRealtime('settings', () => {
    pb.collection('settings')
      .getFullList<{ key: string; value: string }>()
      .then((list) => {
        const nameSetting = list.find((s) => s.key === 'store_name')
        const openSetting = list.find((s) => s.key === 'is_open')
        const counterSetting = list.find((s) => s.key === 'ticket_counter')
        const cnpjSetting = list.find((s) => s.key === 'store_cnpj')
        const phoneSetting = list.find((s) => s.key === 'store_phone')
        const addressSetting = list.find((s) => s.key === 'store_address')
        if (nameSetting) setCartName(nameSetting.value)
        if (openSetting) setIsOpen(openSetting.value === 'true')
        if (counterSetting) setTicketCounter(parseInt(counterSetting.value, 10) || 1)
        if (cnpjSetting) setStoreCnpj(cnpjSetting.value)
        if (phoneSetting) setStorePhone(phoneSetting.value)
        if (addressSetting) setStoreAddress(addressSetting.value)
      })
      .catch(() => {})
  })

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(''), 3500)
    return () => clearTimeout(t)
  }, [banner])

  useEffect(() => {
    const handler = () => setPrintTicket(null)
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [])

  const setTab = (tabId: string) => {
    setSearchParams({ tab: tabId })
  }

  const saveOpenStatus = async (val: boolean) => {
    try {
      const rec = await pb
        .collection('settings')
        .getFirstListItem('key="is_open"')
        .catch(() => null)
      if (rec) {
        await pb.collection('settings').update(rec.id, { value: val ? 'true' : 'false' })
      } else {
        await pb.collection('settings').create({ key: 'is_open', value: val ? 'true' : 'false' })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleNameBlur = async () => {
    const trimmed = cartName.trim() || "Loyola's Lanches"
    setCartName(trimmed)
    try {
      const rec = await pb
        .collection('settings')
        .getFirstListItem('key="store_name"')
        .catch(() => null)
      if (rec) {
        await pb.collection('settings').update(rec.id, { value: trimmed })
      } else {
        await pb.collection('settings').create({ key: 'store_name', value: trimmed })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const quickAddToCart = (item: MenuItem) => {
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
      return [...prev, { cartLineId: uid('line'), itemId: item.id, qty: 1, removed: [], added: [] }]
    })
  }

  const openCustomize = (item: MenuItem) => {
    setCustomizeItem(item)
    setCustomizeQty(1)
    setCustomizeRemoved({})
    setCustomizeAdded({})
    setCustomizeEditingLineId(null)
  }

  const openEditCartLine = (line: CartLine) => {
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

  const closeCustomize = () => {
    setCustomizeItem(null)
    setCustomizeEditingLineId(null)
  }

  const confirmCustomize = () => {
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
        { cartLineId: uid('line'), itemId: customizeItem.id, qty: customizeQty, removed, added },
      ])
    }
    closeCustomize()
  }

  const changeCartQty = (cartLineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.cartLineId === cartLineId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )
  }

  const removeCartLine = (cartLineId: string) => {
    setCart((prev) => prev.filter((l) => l.cartLineId !== cartLineId))
  }

  const printCartAsTicket = () => {
    if (cart.length === 0) return
    const subtotal = cart.reduce((sum, l) => {
      const item = menuById(l.itemId)
      return sum + (item ? item.price * l.qty : 0)
    }, 0)

    const items = cart.map((l) => {
      const item = menuById(l.itemId)
      return {
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

    const effectiveDiscount = Math.min(orderDiscount, subtotal)
    const total = Math.max(0, subtotal - effectiveDiscount + orderDeliveryFee)

    setPrintTicket({
      id: 'rascunho',
      ticketNumber: ticketCounter,
      created: new Date().toISOString(),
      items,
      subtotal,
      discount: effectiveDiscount,
      deliveryFee: orderDeliveryFee,
      total,
      payment,
      origin: 'balcao',
      status: 'Comanda Balcão (pedido em preparo)',
    })
  }

  const printOrderTicket = (order: OrderRecord) => {
    setPrintTicket({ ...order, status: 'Pedido finalizado' })
  }

  // Finalize balcão order
  const finalizeOrder = async () => {
    if (cart.length === 0) return

    const items = cart.map((l) => {
      const item = menuById(l.itemId)
      return {
        itemId: l.itemId,
        name: item?.name || 'Item removido',
        price: item?.price || 0,
        qty: l.qty,
        removed: (l.removed || []).map((id) => stockById(id)?.name || id),
        added: (l.added || []).map((a) => ({
          name: stockById(a.ingredientId)?.name || a.ingredientId,
          qty: a.qty,
        })),
      }
    })

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const effectiveDiscount = Math.min(orderDiscount, subtotal)
    const total = Math.max(0, subtotal - effectiveDiscount + orderDeliveryFee)

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
      items,
      subtotal,
      discount: effectiveDiscount,
      deliveryFee: orderDeliveryFee,
      total,
      payment,
      origin: 'balcao' as const,
      deductions,
    }

    const handleSaveOffline = () => {
      const offlineItem = enqueueOfflineOrder(payload, ticketCounter)
      setOfflineQueue(getOfflineQueue())

      const provisionalRecord: OrderRecord = {
        id: offlineItem.id,
        ticketNumber: offlineItem.provisionalTicketNumber,
        items,
        subtotal,
        discount: effectiveDiscount,
        deliveryFee: orderDeliveryFee,
        total,
        payment,
        origin: 'balcao',
        status: 'pendente (offline)',
        created: offlineItem.createdAt,
      }

      setOrders((prev) => [provisionalRecord, ...prev])
      setTicketCounter(offlineItem.provisionalTicketNumber + 1)
      setLastFinalizedOrder(provisionalRecord)
      setCart([])
      setOrderDiscount(0)
      setOrderDeliveryFee(0)
      setBanner(`Sem internet: pedido ${offlineItem.provisionalTicket} salvo na fila offline.`)
      toast({
        title: 'Pedido salvo na fila offline',
        description: `Comanda provisória ${offlineItem.provisionalTicket}.`,
      })
    }

    if (!isOnline) {
      handleSaveOffline()
      return
    }

    try {
      const res = await pb.send<{
        success: boolean
        order: OrderRecord
        lowStockWarnings: string[]
      }>('/backend/v1/orders/finalize', {
        method: 'POST',
        body: payload,
      })

      const newOrder = res.order
      setOrders((prev) => [newOrder, ...prev])
      setTicketCounter(newOrder.ticketNumber + 1)
      saveTicketCounterCache(newOrder.ticketNumber + 1)
      setLastFinalizedOrder(newOrder)
      setCart([])
      setOrderDiscount(0)
      setOrderDeliveryFee(0)
      setBanner(
        `Comanda Balcão ${padTicket(newOrder.ticketNumber)} registrada — ${fmtBRL(total)} em ${payment}.`,
      )

      if (res.lowStockWarnings && res.lowStockWarnings.length > 0) {
        toast({
          title: 'Aviso de estoque baixo',
          description: `Itens com estoque baixo: ${res.lowStockWarnings.join(', ')}`,
        })
      }

      pb.collection('inventory')
        .getFullList<InventoryItem>({ sort: 'name' })
        .then((s) => {
          setStock(s)
          saveStockCache(s)
        })
        .catch(() => {})
    } catch (err: any) {
      console.warn('Erro ao finalizar pedido, verificando offline:', err)
      const status = err?.status || err?.response?.status || err?.data?.code
      const isNetworkFail =
        !status || status === 0 || status >= 500 || err?.message?.includes?.('fetch')

      if (isNetworkFail) {
        handleSaveOffline()
      } else {
        toast({
          title: 'Erro ao registrar pedido',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      }
    }
  }

  // Cardapio CRUD
  const handleSaveMenuItem = async (itemData: {
    id?: string
    name: string
    price: number
    category: MenuItem['category']
    recipe: { ingredientId: string; qty: number }[]
  }) => {
    if (itemData.id) {
      await pb.collection('menu').update(itemData.id, {
        name: itemData.name,
        price: itemData.price,
        category: itemData.category,
        recipe: itemData.recipe,
      })
    } else {
      await pb.collection('menu').create({
        name: itemData.name,
        price: itemData.price,
        category: itemData.category,
        active: true,
        recipe: itemData.recipe,
      })
    }
    const updated = await pb.collection('menu').getFullList<MenuItem>({ sort: 'name' })
    setMenu(updated)
    toast({ title: 'Cardápio atualizado em tempo real' })
  }

  const handleToggleMenuActive = async (id: string, current: boolean) => {
    await pb.collection('menu').update(id, { active: !current })
    setMenu((prev) => prev.map((m) => (m.id === id ? { ...m, active: !current } : m)))
  }

  const handleDeleteMenuItem = async (id: string) => {
    await pb.collection('menu').delete(id)
    setMenu((prev) => prev.filter((m) => m.id !== id))
    toast({ title: 'Item removido do cardápio' })
  }

  // Estoque CRUD
  const handleSaveStockItem = async (itemData: {
    id?: string
    name: string
    unit: InventoryItem['unit']
    qty: number
    min: number
    group: InventoryItem['group']
  }) => {
    if (itemData.id) {
      await pb.collection('inventory').update(itemData.id, {
        name: itemData.name,
        unit: itemData.unit,
        qty: itemData.qty,
        min: itemData.min,
        group: itemData.group,
      })
    } else {
      await pb.collection('inventory').create({
        name: itemData.name,
        unit: itemData.unit,
        qty: itemData.qty,
        min: itemData.min,
        group: itemData.group,
      })
    }
    const updated = await pb.collection('inventory').getFullList<InventoryItem>({ sort: 'name' })
    setStock(updated)
    toast({ title: 'Estoque atualizado' })
  }

  const handleAdjustStock = async (id: string, delta: number) => {
    const currentItem = stock.find((s) => s.id === id)
    if (!currentItem) return
    const nextQty = Math.max(0, currentItem.qty + delta)
    setStock((prev) => prev.map((s) => (s.id === id ? { ...s, qty: nextQty } : s)))
    await pb.collection('inventory').update(id, { qty: nextQty })
  }

  const handleDeleteStockItem = async (id: string) => {
    await pb.collection('inventory').delete(id)
    setStock((prev) => prev.filter((s) => s.id !== id))
    toast({ title: 'Item removido do estoque' })
  }

  // Caixa closing logic com diferenciação balcão vs online
  const lastClosureTime = closures.length ? closures[closures.length - 1].closedAt : null
  const openOrders = orders.filter((o) => {
    if (o.status === 'recusado') return false
    if (!lastClosureTime) return true
    const orderTime = o.created || ''
    return orderTime > lastClosureTime
  })

  const openBalcaoOrders = openOrders.filter((o) => o.origin !== 'online')
  const openOnlineOrders = openOrders.filter((o) => o.origin === 'online')
  const openBalcaoTotal = openBalcaoOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const openOnlineTotal = openOnlineOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const openTotal = openOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)

  const byPayment = ['Dinheiro', 'Pix', 'Cartão'].reduce<Record<string, number>>((acc, p) => {
    acc[p] = openOrders
      .filter((o) => o.payment === p)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    return acc
  }, {})

  const openingTime = lastClosureTime || openOrders[openOrders.length - 1]?.created || null

  useEffect(() => {
    if (searchParams.get('triggerClose') === 'true' && currentTab === 'caixa') {
      if (openOrders.length > 0) {
        setClosingDiscount('')
        setClosingPreviewOpen(true)
      }
      setSearchParams({ tab: 'caixa' })
    }
  }, [searchParams, currentTab, openOrders.length, setSearchParams])

  const handleStatusToggle = () => {
    if (isOpen) {
      setStoreCloseModalOpen(true)
    } else {
      setIsOpen(true)
      saveOpenStatus(true)
      toast({
        title: 'Loja aberta',
        description: 'A lanchonete está aberta para receber pedidos.',
      })
    }
  }

  const handlePauseOperation = async () => {
    setStoreCloseModalOpen(false)
    setIsOpen(false)
    await saveOpenStatus(false)
    toast({
      title: 'Operação pausada',
      description: 'A lanchonete foi marcada como fechada. O caixa atual continua aberto.',
    })
  }

  const handleCloseRegisterFromStatus = async () => {
    setStoreCloseModalOpen(false)
    setIsOpen(false)
    await saveOpenStatus(false)
    setSearchParams({ tab: 'caixa' })
    if (openOrders.length > 0) {
      setClosingDiscount('')
      setClosingPreviewOpen(true)
    } else {
      toast({
        title: 'Caixa sem vendas pendentes',
        description: 'Loja fechada. Nenhum pedido pendente para fechar no turno atual.',
      })
    }
  }

  const computeBreakdown = (list: OrderRecord[]) => {
    const map: Record<string, { name: string; qty: number; total: number }> = {}
    list.forEach((o) =>
      o.items.forEach((i) => {
        if (!map[i.name]) map[i.name] = { name: i.name, qty: 0, total: 0 }
        map[i.name].qty += i.qty
        map[i.name].total += i.price * i.qty
      }),
    )
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const openClosingPreview = () => {
    if (openOrders.length === 0) return
    setClosingDiscount('')
    setClosingPreviewOpen(true)
  }

  const confirmCloseRegister = async () => {
    const discount = Number(String(closingDiscount).replace(',', '.')) || 0
    const net = Math.max(0, openTotal - discount)

    const closurePayload = {
      closedAt: new Date().toISOString(),
      openedAt: openingTime ? new Date(openingTime).toISOString() : new Date().toISOString(),
      dateLabel: new Date().toLocaleDateString('pt-BR'),
      grossTotal: openTotal,
      discount,
      netTotal: net,
      byPayment,
      ordersCount: openOrders.length,
      productBreakdown: computeBreakdown(openOrders),
      byOriginCount: {
        balcao: openBalcaoOrders.length,
        online: openOnlineOrders.length,
      },
      byOriginTotals: {
        balcao: openBalcaoTotal,
        online: openOnlineTotal,
      },
    }

    try {
      const createdClosure = await pb.collection('closures').create<ClosureRecord>(closurePayload)
      setClosures((prev) => [...prev, createdClosure])
      setClosingPreviewOpen(false)

      setTicketCounter(1)
      resetTicketCounterCache()
      try {
        const counterRec = await pb
          .collection('settings')
          .getFirstListItem('key="ticket_counter"')
          .catch(() => null)
        if (counterRec) {
          await pb.collection('settings').update(counterRec.id, { value: '1' })
        } else {
          await pb.collection('settings').create({ key: 'ticket_counter', value: '1' })
        }
      } catch (counterErr) {
        console.warn('Erro ao zerar contador de comanda no PocketBase:', counterErr)
      }

      setJustClosedClosure(createdClosure)
      setBanner(
        `Caixa fechado — líquido de ${fmtBRL(net)} (${openBalcaoOrders.length} balcão, ${openOnlineOrders.length} online).`,
      )
      toast({
        title: 'Caixa fechado com sucesso',
        description: `Total líquido de ${fmtBRL(net)} registrado (${openBalcaoOrders.length} balcão · ${openOnlineOrders.length} online).`,
      })
    } catch (err: any) {
      console.error('Erro ao fechar caixa:', err)
      toast({
        title: 'Erro ao fechar caixa',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClosure = async (closureId: string) => {
    try {
      await pb.collection('closures').delete(closureId)
      setClosures((prev) => prev.filter((c) => c.id !== closureId))
      toast({
        title: 'Fechamento excluído',
        description: 'O registro de fechamento foi removido com sucesso.',
      })
    } catch (err: any) {
      console.error('Erro ao excluir fechamento:', err)
      toast({
        title: 'Erro ao excluir fechamento',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId)
    const ticketLabel = targetOrder?.ticketNumber ? padTicket(targetOrder.ticketNumber) : orderId

    removeOfflineOrderItem(orderId)
    setOfflineQueue(getOfflineQueue())

    const isProvisional = targetOrder?.status?.includes?.('offline') || !isOnline
    let stockRestored = false

    try {
      if (isOnline) {
        const res = await pb
          .send<{
            success: boolean
            deletedId: string
            restoredItems: Array<{ name: string; restoredQty: number }>
          }>('/backend/v1/orders/delete', {
            method: 'POST',
            body: { orderId, restoreStock: true },
          })
          .catch(async (endpointErr) => {
            console.warn('Fallback exclusão direta:', endpointErr)
            await pb.collection('orders').delete(orderId)
            return { success: true, deletedId: orderId, restoredItems: [] }
          })

        if (res?.restoredItems && res.restoredItems.length > 0) {
          stockRestored = true
        }

        pb.collection('inventory')
          .getFullList<InventoryItem>({ sort: 'name' })
          .then((s) => {
            setStock(s)
            saveStockCache(s)
          })
          .catch(() => {})
      }

      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      if (lastFinalizedOrder && lastFinalizedOrder.id === orderId) {
        setLastFinalizedOrder(null)
      }

      toast({
        title: `Comanda ${ticketLabel} removida`,
        description: stockRestored
          ? 'Pedido cancelado e ingredientes estornados para o estoque com sucesso.'
          : 'Pedido removido com sucesso.',
      })
    } catch (err: any) {
      console.error('Erro ao excluir comanda:', err)
      if (!isOnline || isProvisional) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        toast({
          title: `Comanda ${ticketLabel} removida da fila local`,
          description: 'O pedido offline foi descartado com sucesso.',
        })
      } else {
        toast({
          title: 'Erro ao remover comanda',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      }
    }
  }

  const resetAll = async () => {
    try {
      const currentMenu = await pb.collection('menu').getFullList()
      for (const m of currentMenu) {
        await pb
          .collection('menu')
          .delete(m.id)
          .catch(() => {})
      }
      const currentStock = await pb.collection('inventory').getFullList()
      for (const s of currentStock) {
        await pb
          .collection('inventory')
          .delete(s.id)
          .catch(() => {})
      }

      const defaultStock = seedStock()
      for (const si of defaultStock) {
        await pb.collection('inventory').create(si)
      }
      const defaultMenu = seedMenu()
      for (const mi of defaultMenu) {
        await pb.collection('menu').create(mi)
      }

      const nameRec = await pb
        .collection('settings')
        .getFirstListItem('key="store_name"')
        .catch(() => null)
      if (nameRec) await pb.collection('settings').update(nameRec.id, { value: "Loyola's Lanches" })
      const openRec = await pb
        .collection('settings')
        .getFirstListItem('key="is_open"')
        .catch(() => null)
      if (openRec) await pb.collection('settings').update(openRec.id, { value: 'true' })

      setCartName("Loyola's Lanches")
      setIsOpen(true)
      setCart([])
      setResetConfirm(false)

      await loadInitialData()
      setBanner('Dados restaurados para o cardápio e estoque padrão.')
      toast({
        title: 'Restauração concluída',
        description: 'Cardápio e estoque retornaram aos padrões.',
      })
    } catch (err: any) {
      console.error('Erro ao restaurar:', err)
      toast({
        title: 'Erro ao restaurar',
        description: err?.message || 'Não foi possível restaurar os dados padrão.',
        variant: 'destructive',
      })
    }
  }

  if (!loaded) {
    return (
      <div className="sc-root flex items-center justify-center min-h-[60vh]">
        <p className="sc-empty">Carregando painel de gestão Loyola's Lanches…</p>
      </div>
    )
  }

  const pendingOnlineOrdersCount = orders.filter(
    (o) => o.origin === 'online' && (o.status || 'pendente') === 'pendente',
  ).length

  const TABS = [
    { id: 'pedido', label: 'Pedido (Balcão)', icon: ShoppingCart },
    {
      id: 'online',
      label: 'Pedidos Online',
      icon: Inbox,
      badge: pendingOnlineOrdersCount,
    },
    { id: 'cardapio', label: 'Cardápio', icon: UtensilsCrossed },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'caixa', label: 'Caixa', icon: Wallet },
  ]

  return (
    <div className="sc-root min-h-screen">
      <main className="max-w-[1100px] mx-auto">
        {/* 1. Header com Store Name editável */}
        <div className="sc-header">
          <div className="sc-brand-row">
            <div className="sc-brand-name">
              <input
                className="sc-name-input"
                value={cartName}
                onChange={(e) => setCartName(e.target.value)}
                onBlur={handleNameBlur}
                aria-label="Nome da lanchonete"
              />
              <div className="sc-sub-line">
                Gestão de pedidos, cardápio canônico, estoque e caixa
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionStatusBadge
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingCount={
                  offlineQueue.filter((i) => i.status === 'pending' || i.status === 'syncing')
                    .length
                }
                failedCount={offlineQueue.filter((i) => i.status === 'failed').length}
                onClick={() => setQueueModalOpen(true)}
              />

              <button
                className={`sc-status ${isOpen ? 'is-open' : 'is-closed'}`}
                onClick={handleStatusToggle}
                title={
                  isOpen ? 'Clique para encerrar expediente ou pausar' : 'Clique para reabrir loja'
                }
              >
                <span className={`sc-status-dot ${isOpen ? 'is-open' : 'is-closed'}`} />
                {isOpen ? 'Aberto' : 'Fechado'}
              </button>

              <Link
                to="/loja"
                target="_blank"
                rel="noopener noreferrer"
                className="sc-icon-btn"
                title="Ver Loja do Cliente"
                aria-label="Loja do Cliente"
              >
                <StoreIcon size={15} />
              </Link>

              <Link
                to="/config"
                className="sc-icon-btn"
                title="Configurações da lanchonete"
                aria-label="Configurações"
              >
                <SettingsIcon size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div className="sc-banner sc-banner-row">
            <span>{banner}</span>
            {lastFinalizedOrder && (
              <button className="sc-print-btn" onClick={() => printOrderTicket(lastFinalizedOrder)}>
                <Printer size={12} /> Imprimir
              </button>
            )}
          </div>
        )}

        {/* 2. Tabs */}
        <div className="sc-tabs">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                className={`sc-tab relative ${currentTab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={14} /> {t.label}
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[var(--red)] text-white text-[10px] font-bold animate-pulse">
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 3. Tab Contents */}
        {currentTab === 'online' && (
          <TabPedidosOnline
            orders={orders}
            onPrintOrderTicket={printOrderTicket}
            onOrderUpdated={() => {
              pb.collection('orders')
                .getFullList<OrderRecord>({ sort: '-ticketNumber' })
                .then(setOrders)
                .catch(() => {})
            }}
          />
        )}

        {currentTab === 'pedido' && (
          <TabPedido
            menu={menu}
            stock={stock}
            cart={cart}
            ticketCounter={ticketCounter}
            isOffline={!isOnline}
            pendingQueueCount={offlineQueue.length}
            payment={payment}
            setPayment={setPayment}
            orderDiscount={orderDiscount}
            setOrderDiscount={setOrderDiscount}
            orderDeliveryFee={orderDeliveryFee}
            setOrderDeliveryFee={setOrderDeliveryFee}
            onAddToCart={quickAddToCart}
            onOpenCustomize={openCustomize}
            onOpenEditCartLine={openEditCartLine}
            onChangeCartQty={changeCartQty}
            onRemoveCartLine={removeCartLine}
            onFinalizeOrder={finalizeOrder}
            onPrintCartDraft={printCartAsTicket}
            menuById={menuById}
            resolveStockItem={stockById}
          />
        )}

        {currentTab === 'cardapio' && (
          <TabCardapio
            menu={menu}
            stock={stock}
            isOffline={!isOnline}
            initialAction={(searchParams.get('action') as 'new' | 'edit') || null}
            onSaveMenuItem={handleSaveMenuItem}
            onToggleActive={handleToggleMenuActive}
            onDeleteMenuItem={handleDeleteMenuItem}
          />
        )}

        {currentTab === 'estoque' && (
          <TabEstoque
            stock={stock}
            isOffline={!isOnline}
            onSaveStockItem={handleSaveStockItem}
            onAdjustStock={handleAdjustStock}
            onDeleteStockItem={handleDeleteStockItem}
          />
        )}

        {currentTab === 'caixa' && (
          <TabCaixa
            orders={orders}
            closures={closures}
            onOpenClosingPreview={openClosingPreview}
            onOpenViewingClosure={(c) => setViewingClosure(c)}
            onPrintOrderTicket={printOrderTicket}
            onDeleteClosure={handleDeleteClosure}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {/* Modal de Escolha de Fechamento de Loja */}
        <StoreCloseChoiceModal
          isOpen={storeCloseModalOpen}
          onClose={() => setStoreCloseModalOpen(false)}
          onPauseOperation={handlePauseOperation}
          onCloseRegister={handleCloseRegisterFromStatus}
          openOrdersCount={openOrders.length}
        />

        {/* Modais */}
        <CustomizeModal
          item={customizeItem}
          stock={stock}
          qty={customizeQty}
          removed={customizeRemoved}
          added={customizeAdded}
          isEditing={Boolean(customizeEditingLineId)}
          onClose={closeCustomize}
          onConfirm={confirmCustomize}
          setQty={setCustomizeQty}
          setRemoved={setCustomizeRemoved}
          setAdded={setCustomizeAdded}
          resolveStockItem={stockById}
        />

        <ReceiptModal
          ticket={printTicket}
          storeName={cartName}
          storeInfo={{
            name: cartName,
            cnpj: storeCnpj,
            phone: storePhone,
            address: storeAddress,
          }}
          onClose={() => setPrintTicket(null)}
          onPrint={() => window.print()}
        />

        {/* Modal da Fila de Pedidos Offline */}
        <OfflineQueueModal
          isOpen={queueModalOpen}
          isOnline={isOnline}
          isSyncing={isSyncing}
          queue={offlineQueue}
          onClose={() => setQueueModalOpen(false)}
          onSyncNow={handleTriggerSync}
          onPrintTicket={printOrderTicket}
        />

        {(closingPreviewOpen || viewingClosure || justClosedClosure) && (
          <ClosureModal
            isDraft={closingPreviewOpen}
            justClosed={Boolean(justClosedClosure)}
            view={
              justClosedClosure
                ? justClosedClosure
                : closingPreviewOpen
                  ? {
                      openedAt: openingTime,
                      closedAt: new Date().toISOString(),
                      grossTotal: openTotal,
                      discount: Number(String(closingDiscount).replace(',', '.')) || 0,
                      netTotal: Math.max(
                        0,
                        openTotal - (Number(String(closingDiscount).replace(',', '.')) || 0),
                      ),
                      byPayment,
                      ordersCount: openOrders.length,
                      productBreakdown: computeBreakdown(openOrders),
                      byOriginCount: {
                        balcao: openBalcaoOrders.length,
                        online: openOnlineOrders.length,
                      },
                      byOriginTotals: {
                        balcao: openBalcaoTotal,
                        online: openOnlineTotal,
                      },
                    }
                  : (viewingClosure as ClosureRecord)
            }
            closingDiscount={closingDiscount}
            setClosingDiscount={setClosingDiscount}
            onClose={() => {
              setClosingPreviewOpen(false)
              setViewingClosure(null)
              setJustClosedClosure(null)
            }}
            onDeclinePrint={() => setJustClosedClosure(null)}
            onConfirm={confirmCloseRegister}
            onPrint={() => window.print()}
          />
        )}

        {/* 4. Footer */}
        <div className="sc-footer-link">
          {resetConfirm ? (
            <button onClick={resetAll}>
              <Check size={11} /> Confirmar restauração do cardápio e estoque padrão
            </button>
          ) : (
            <button onClick={() => setResetConfirm(true)}>
              <RotateCcw size={11} /> Restaurar cardápio e estoque padrão
            </button>
          )}
          {resetConfirm && (
            <button onClick={() => setResetConfirm(false)} style={{ marginLeft: 10 }}>
              <X size={11} /> Cancelar
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
