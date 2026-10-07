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
  Copy,
  Check,
  Compass,
  Tag,
  History,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import type { MenuItem, InventoryItem, OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'
import { CustomizeModal } from '@/components/CustomizeModal'
import { DeliveryMapPicker } from '@/components/DeliveryMapPicker'
import StorePromotionCarousel from '@/components/StorePromotionCarousel'
import {
  CustomerAuthDrawer,
  CustomerProfile,
  CampaignVoucher,
} from '@/components/CustomerAuthDrawer'
import { OrderReceiptModal } from '@/components/OrderReceiptModal'
import { generatePixPayload } from '@/lib/pix'
import { resolveDeliveryFee, DeliveryFeeItem } from '@/lib/geoDistance'

export interface CustomerCartLine {
  cartLineId: string
  itemId: string
  qty: number
  removed: string[]
  added: { ingredientId: string; qty: number }[]
  gourmetFreeChoice?: 'catupiry' | 'cheddar' | 'none'
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
  const [customizeGourmetChoice, setCustomizeGourmetChoice] = useState<
    'catupiry' | 'cheddar' | 'none'
  >('none')
  const [customizeEditingLineId, setCustomizeEditingLineId] = useState<string | null>(null)

  // Checkout dados
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'entrega' | 'retirada'>('entrega')
  const [customerAddress, setCustomerAddress] = useState('')
  const [payment, setPayment] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix')
  const [cardType, setCardType] = useState<'debito' | 'credito'>('debito')
  const [changeFor, setChangeFor] = useState('')
  const [wantsInvoice, setWantsInvoice] = useState(false)
  const [invoiceDocument, setInvoiceDocument] = useState('')

  // Pix real estático
  const [pixKey, setPixKey] = useState('12991591915')
  const [pixCopied, setPixCopied] = useState(false)

  // Entrega com mapa e taxas
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFeeItem[]>([])
  const [selectedFeeNeighborhood, setSelectedFeeNeighborhood] = useState<string>('')
  const [deliveryFeeValue, setDeliveryFeeValue] = useState<number>(0)
  const [useMapLocation, setUseMapLocation] = useState(false)
  const [deliveryLat, setDeliveryLat] = useState<number>(-22.9238)
  const [deliveryLng, setDeliveryLng] = useState<number>(-45.474)
  const [locatingUser, setLocatingUser] = useState(false)

  // Auth do Cliente & CRM / Campanhas
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<CustomerProfile | null>(null)
  const [customerOrders, setCustomerOrders] = useState<OrderRecord[]>([])
  const [customerCampaigns, setCustomerCampaigns] = useState<CampaignVoucher[]>([])
  const [appliedCampaign, setAppliedCampaign] = useState<CampaignVoucher | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherMessage, setVoucherMessage] = useState('')

  // Modal de Comprovante completo
  const [showReceiptModal, setShowReceiptModal] = useState(false)
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
        const [settingsList, menuList, stockList, feesList] = await Promise.all([
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
          pb
            .collection('delivery_fees')
            .getFullList<DeliveryFeeItem>()
            .catch(() => []),
        ])

        if (!mounted) return
        const nameSetting = settingsList.find((s) => s.key === 'store_name')
        const openSetting = settingsList.find((s) => s.key === 'is_open')
        const forceOpen = settingsList.find((s) => s.key === 'force_open')?.value === 'true'
        const forceClosed = settingsList.find((s) => s.key === 'force_closed')?.value === 'true'
        const pixSetting = settingsList.find((s) => s.key === 'pix_key')

        if (nameSetting?.value) setStoreName(nameSetting.value)
        if (pixSetting?.value) setPixKey(pixSetting.value)
        if (forceOpen) {
          setIsOpen(true)
        } else if (forceClosed) {
          setIsOpen(false)
        } else if (openSetting) {
          setIsOpen(openSetting.value === 'true')
        }

        setMenu(menuList)
        setStock(stockList)
        setDeliveryFees(feesList)
        if (feesList.length > 0) {
          setSelectedFeeNeighborhood(feesList[0].name)
          setDeliveryFeeValue(feesList[0].fee)
        }
      } catch (e) {
        console.error('Erro ao carregar cardápio da loja:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStore()

    // Verificação contínua reativa a cada 30s e ao focar no app
    const interval = setInterval(loadStore, 30000)
    const handleFocus = () => loadStore()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [])

  // Assinaturas realtime com useRealtime
  useRealtime('settings', () => {
    pb.collection('settings')
      .getFullList()
      .then((records) => {
        const nameSetting = records.find((s) => s.key === 'store_name')
        const openSetting = records.find((s) => s.key === 'is_open')
        const forceOpen = records.find((s) => s.key === 'force_open')?.value === 'true'
        const forceClosed = records.find((s) => s.key === 'force_closed')?.value === 'true'

        if (nameSetting?.value) setStoreName(nameSetting.value)
        if (forceOpen) {
          setIsOpen(true)
        } else if (forceClosed) {
          setIsOpen(false)
        } else if (openSetting) {
          setIsOpen(openSetting.value === 'true')
        }
      })
      .catch(() => {})
  })

  useRealtime('menu', () => {
    pb.collection('menu')
      .getFullList<MenuItem>({ filter: 'active = true', sort: 'name' })
      .then(setMenu)
      .catch(() => {})
  })

  useRealtime('delivery_fees', () => {
    pb.collection('delivery_fees')
      .getFullList<DeliveryFeeItem>()
      .then((fees) => {
        setDeliveryFees(fees)
      })
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

  // Categorias disponíveis no cardápio vindas do backend (excluindo Todos e Complementos)
  const availableCategories = useMemo(() => {
    const fromMenu = Array.from(
      new Set(
        menu.map((item) => {
          const cat = (item.category || '').trim()
          return cat || 'Outros'
        }),
      ),
    ).filter((cat) => cat !== 'Complementos' && cat !== 'Todos')

    if (fromMenu.length > 0) {
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
      const itemCat = (item.category || '').trim() || 'Outros'
      if (itemCat === 'Complementos') return false
      const matchCat = itemCat === currentCategory
      const query = searchTerm.toLowerCase().trim()
      const matchSearch =
        !query ||
        (item.name || '').toLowerCase().includes(query) ||
        itemCat.toLowerCase().includes(query)
      return matchCat && matchSearch
    })
  }, [menu, currentCategory, searchTerm])

  // Preços cadastrados dos complementos de Catupiry e Cheddar
  const catupiryAddPrice = useMemo(() => {
    const m = menu.find(
      (it) => it.code === 'x-catupiry' || it.name.toLowerCase().includes('catupiry (adicional)'),
    )
    return m ? m.price : 4
  }, [menu])

  const cheddarAddPrice = useMemo(() => {
    const m = menu.find(
      (it) => it.code === 'x-cheddar' || it.name.toLowerCase().includes('cheddar (adicional)'),
    )
    return m ? m.price : 3
  }, [menu])

  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizeItem(item)
    setCustomizeQty(1)
    setCustomizeRemoved({})
    setCustomizeAdded({})
    setCustomizeGourmetChoice('none')
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
    setCustomizeGourmetChoice(line.gourmetFreeChoice || 'none')
    setCustomizeEditingLineId(line.cartLineId)
  }

  const handleConfirmCustomize = () => {
    if (!customizeItem) return
    const removed = Object.keys(customizeRemoved).filter((id) => customizeRemoved[id])
    const added = Object.entries(customizeAdded)
      .filter(([, q]) => Number(q) > 0)
      .map(([ingredientId, qty]) => ({ ingredientId, qty: Number(qty) }))

    const gourmetFreeChoice =
      customizeItem.category === 'Gourmet' ? customizeGourmetChoice : undefined

    if (customizeEditingLineId) {
      setCart((prev) =>
        prev.map((l) =>
          l.cartLineId === customizeEditingLineId
            ? { ...l, qty: customizeQty, removed, added, gourmetFreeChoice }
            : l,
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
          gourmetFreeChoice,
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

  // Totais incluindo adicionais cobrados
  const calculateLineTotal = (line: CustomerCartLine) => {
    const item = menuById(line.itemId)
    if (!item) return 0
    let lineBase = item.price

    // Soma adicionais
    ;(line.added || []).forEach((a) => {
      const stockItem = stockById(a.ingredientId)
      const ingKey = stockItem?.code || a.ingredientId
      let addPrice = 0
      if (ingKey === 'ing-catupiry' || ingKey.includes('catupiry')) {
        addPrice = catupiryAddPrice
      } else if (ingKey === 'ing-cheddar' || ingKey.includes('cheddar')) {
        addPrice = cheddarAddPrice
      } else {
        const comp = menu.find(
          (m) =>
            m.category === 'Complementos' &&
            m.recipe?.some((r) => r.ingredientId === a.ingredientId || r.ingredientId === ingKey),
        )
        addPrice = comp ? comp.price : 3
      }
      lineBase += addPrice * a.qty
    })

    return lineBase * line.qty
  }

  // Totais precisam existir antes do cálculo do voucher.
  // Antes, discountAmount acessava subtotal antes da inicialização (TDZ), causando tela preta em /loja.
  const subtotal = cart.reduce((sum, line) => sum + calculateLineTotal(line), 0)
  const currentDeliveryFee = deliveryType === 'entrega' ? deliveryFeeValue : 0

  // Desconto calculado por campanhas / vouchers
  const discountAmount = useMemo(() => {
    if (!appliedCampaign) return 0
    if (appliedCampaign.type === 'voucher_10') {
      return Math.round(subtotal * 0.1 * 100) / 100
    }
    if (appliedCampaign.type === 'free_delivery') {
      return deliveryType === 'entrega' ? deliveryFeeValue : 0
    }
    if (appliedCampaign.type === 'product_discount' && appliedCampaign.discountAmount) {
      // Se tiver produto alvo, valida se ele está no carrinho ou aplica o valor diretamente
      if (appliedCampaign.targetProductId) {
        const hasTarget = cart.some((l) => l.itemId === appliedCampaign.targetProductId)
        if (!hasTarget) {
          // Também aceita por compatibilidade com nome do produto
          const hasTargetByName = cart.some((l) => {
            const item = menuById(l.itemId)
            return item?.name === appliedCampaign.targetProductName
          })
          if (!hasTargetByName) return 0
        }
      }
      return Math.min(appliedCampaign.discountAmount, subtotal)
    }
    return 0
  }, [appliedCampaign, subtotal, deliveryType, deliveryFeeValue, cart, menu])

  const finalTotal = Math.max(0, subtotal - discountAmount + currentDeliveryFee)

  const totalItemsCount = cart.reduce((sum, line) => sum + line.qty, 0)

  // Pix Payload gerado em tempo real
  const pixEMV = useMemo(() => {
    return generatePixPayload({
      key: pixKey,
      merchantName: storeName,
      merchantCity: 'Pindamonhangaba',
      amount: finalTotal,
      txid: `PED${Date.now().toString().slice(-6)}`,
    })
  }, [pixKey, storeName, finalTotal])

  const pixQrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixEMV)}`
  }, [pixEMV])

  // Geolocalização do navegador
  const handleGetBrowserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.')
      return
    }
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setDeliveryLat(lat)
        setDeliveryLng(lng)
        setUseMapLocation(true)
        const resolved = resolveDeliveryFee(lat, lng, deliveryFees)
        setDeliveryFeeValue(resolved.fee)
        setSelectedFeeNeighborhood(`${resolved.nearestName} (${resolved.distanceKm} km)`)
        setLocatingUser(false)
      },
      (err) => {
        setLocatingUser(false)
        alert('Não foi possível obter sua localização: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Login e busca de histórico do cliente
  const handleCustomerLogin = async (phone: string, name: string) => {
    const raw = phone.trim()
    try {
      let cust = null
      try {
        cust = await pb.collection('customers').getFirstListItem(`phone="${raw}"`)
      } catch {
        /* intentionally ignored */
      }

      if (!cust) {
        cust = await pb.collection('customers').create({
          phone: raw,
          name: name.trim(),
          totalOrders: 0,
          totalSpent: 0,
        })
      }

      const prof: CustomerProfile = {
        id: cust.id,
        name: cust.name || name,
        phone: cust.phone,
        address: cust.address,
        favoriteItems: cust.favoriteItems || [],
      }
      setCurrentCustomer(prof)
      setCustomerName(prof.name)
      setCustomerPhone(prof.phone)
      if (prof.address && !customerAddress) {
        setCustomerAddress(prof.address)
      }

      // Buscar pedidos anteriores
      try {
        const ords = await pb.collection('orders').getFullList<OrderRecord>({
          filter: `customerPhone="${raw}"`,
          sort: '-created',
        })
        setCustomerOrders(ords)
      } catch {
        /* intentionally ignored */
      }

      // Buscar vouchers
      try {
        const camps = await pb.collection('campaigns').getFullList<CampaignVoucher>({
          filter: `customerPhone="${raw}" && active=true && used=false`,
        })
        setCustomerCampaigns(camps)
      } catch {
        /* intentionally ignored */
      }
    } catch (e: any) {
      console.warn('Erro ao autenticar cliente:', e)
    }
  }

  const handleCustomerLogout = () => {
    setCurrentCustomer(null)
    setCustomerOrders([])
    setCustomerCampaigns([])
    setAppliedCampaign(null)
  }

  const handleApplyVoucherCode = async () => {
    const code = voucherCode.trim().toUpperCase()
    if (!code) return
    try {
      const camps = await pb.collection('campaigns').getFullList<CampaignVoucher>({ filter: 'active=true && used=false' })
      const match = camps.find((camp: any) => {
        const generated = `LOY-${String(camp.id).slice(0, 6).toUpperCase()}`
        const belongs = !camp.customerPhone || camp.customerPhone === customerPhone.trim() || camp.customerPhone === currentCustomer?.phone
        return generated === code && belongs
      })
      if (!match) return setVoucherMessage('Código inválido, já utilizado ou vinculado a outro cliente.')
      setAppliedCampaign(match)
      setVoucherMessage(`Voucher ${code} aplicado.`)
    } catch { setVoucherMessage('Não foi possível validar o código agora.') }
  }

  const handleDeleteCustomerAccount = async () => {
    if (!currentCustomer?.id) return
    if (!confirm('Excluir seu cadastro? O histórico operacional dos pedidos permanece na loja, mas seu perfil e vouchers ativos serão removidos.')) return
    try {
      const related = await pb.collection('campaigns').getFullList({ filter: `customerId="${currentCustomer.id}"` }).catch(() => [])
      await Promise.all(related.map((x:any) => pb.collection('campaigns').delete(x.id).catch(() => null)))
      await pb.collection('customers').delete(currentCustomer.id)
      handleCustomerLogout(); setCustomerName(''); setCustomerPhone(''); setCustomerAddress('')
      setVoucherMessage('Cadastro excluído.')
    } catch (err:any) { setVoucherMessage(err?.message || 'Não foi possível excluir o cadastro.') }
  }

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

    // Formatar itens para backend com indicação da cortesia gourmet
    const items = cart.map((l) => {
      const item = menuById(l.itemId)
      const baseItemPrice = item?.price || 0
      let unitExtra = 0

      ;(l.added || []).forEach((a) => {
        const stockItem = stockById(a.ingredientId)
        const ingKey = stockItem?.code || a.ingredientId
        let addPrice = 0
        if (ingKey === 'ing-catupiry' || ingKey.includes('catupiry')) {
          addPrice = catupiryAddPrice
        } else if (ingKey === 'ing-cheddar' || ingKey.includes('cheddar')) {
          addPrice = cheddarAddPrice
        } else {
          const comp = menu.find(
            (m) =>
              m.category === 'Complementos' &&
              m.recipe?.some((r) => r.ingredientId === a.ingredientId || r.ingredientId === ingKey),
          )
          addPrice = comp ? comp.price : 3
        }
        unitExtra += addPrice * a.qty
      })

      const addedList: { name: string; qty: number }[] = (l.added || []).map((a) => ({
        name: stockById(a.ingredientId)?.name || a.ingredientId,
        qty: a.qty,
      }))

      if (l.gourmetFreeChoice && l.gourmetFreeChoice !== 'none') {
        addedList.unshift({
          name: `${l.gourmetFreeChoice === 'catupiry' ? 'Catupiry' : 'Cheddar'} (cortesia Gourmet grátis)`,
          qty: 1,
        })
      }

      return {
        itemId: l.itemId,
        name: item?.name || 'Item',
        price: baseItemPrice + unitExtra,
        qty: l.qty,
        removed: (l.removed || []).map((id) => stockById(id)?.name || id),
        added: addedList,
        gourmetFreeChoice: l.gourmetFreeChoice,
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
      if (l.gourmetFreeChoice && l.gourmetFreeChoice !== 'none') {
        const freeIngKey = l.gourmetFreeChoice === 'catupiry' ? 'ing-catupiry' : 'ing-cheddar'
        deductions[freeIngKey] = (deductions[freeIngKey] || 0) + l.qty
      }
    })

    const finalPaymentLabel =
      payment === 'Cartão' ? `Cartão (${cardType === 'credito' ? 'Crédito' : 'Débito'})` : payment

    const paymentDetails = {
      method: payment,
      cardType: payment === 'Cartão' ? cardType : undefined,
      changeFor: payment === 'Dinheiro' && changeFor ? Number(changeFor) : undefined,
      changeDue:
        payment === 'Dinheiro' && changeFor && Number(changeFor) > finalTotal
          ? Math.round((Number(changeFor) - finalTotal) * 100) / 100
          : 0,
      pixKey: payment === 'Pix' ? pixKey : undefined,
    }

    const payload = {
      origin: 'online',
      customerName: cleanName,
      customerPhone: cleanPhone,
      deliveryType,
      deliveryLat: deliveryType === 'entrega' ? deliveryLat : undefined,
      deliveryLng: deliveryType === 'entrega' ? deliveryLng : undefined,
      campaignId: appliedCampaign?.id,
      customerAddress:
        deliveryType === 'entrega'
          ? `${customerAddress.trim()}${
              payment === 'Dinheiro' && changeFor
                ? ` (Troco para R$ ${changeFor} - Devolver ${fmtBRL(paymentDetails.changeDue)})`
                : ''
            }`
          : payment === 'Dinheiro' && changeFor
            ? `(Troco para R$ ${changeFor} - Devolver ${fmtBRL(paymentDetails.changeDue)})`
            : '',
      items,
      subtotal,
      discount: discountAmount,
      deliveryFee: currentDeliveryFee,
      total: finalTotal,
      payment: finalPaymentLabel,
      paymentDetails,
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
        setAppliedCampaign(null)
        setCartOpen(false)
        localStorage.removeItem(CART_STORAGE_KEY)
      } else {
        throw new Error('Falha ao registrar pedido.')
      }
    } catch (err: any) {
      console.error('Erro no hook de finalização; verificando fallback seguro:', err)
      try {
        // Evita duplicar pedido caso o hook tenha gravado antes de falhar na resposta.
        const recent = await pb.collection('orders').getFullList<OrderRecord>({
          filter: `customerPhone="${cleanPhone}" && total=${finalTotal}`,
          sort: '-created',
        }).catch(() => [])
        const justCreated = recent.find((o:any) => Date.now() - new Date(o.created || o.createdAt || 0).getTime() < 120000)
        let order = justCreated
        if (!order) {
          order = await pb.collection('orders').create<OrderRecord>({
            ticketNumber: Number(String(Date.now()).slice(-6)),
            items, subtotal, discount: discountAmount, deliveryFee: currentDeliveryFee,
            total: finalTotal, payment: finalPaymentLabel, paymentDetails,
            status: 'pendente', origin: 'online', customerName: cleanName, customerPhone: cleanPhone,
            deliveryType, customerAddress: payload.customerAddress,
            deliveryLat: payload.deliveryLat, deliveryLng: payload.deliveryLng,
            campaignId: appliedCampaign?.id || '',
            invoiceRequested: wantsInvoice,
            invoiceDocument: invoiceDocument.trim(),
            invoiceStatus: wantsInvoice ? 'pendente_emissao' : 'nao_solicitada',
      invoiceRequested: wantsInvoice,
      invoiceDocument: invoiceDocument.trim(),
      invoiceStatus: wantsInvoice ? 'pendente_emissao' : 'nao_solicitada',
          })
          for (const [key, qty] of Object.entries(deductions)) {
            const inv = stockById(key)
            if (inv?.id) await pb.collection('inventory').update(inv.id, { qty: Math.max(0, Number(inv.qty || 0) - Number(qty || 0)) }).catch(()=>null)
          }
          if (appliedCampaign?.id) await pb.collection('campaigns').update(appliedCampaign.id,{used:true,active:false}).catch(()=>null)
        }
        setConfirmedOrder(order as OrderRecord)
        setCart([]); setAppliedCampaign(null); setCartOpen(false); localStorage.removeItem(CART_STORAGE_KEY)
        setErrorMsg('')
      } catch (fallbackErr:any) {
        console.error('Falha também no fallback de finalização:', fallbackErr)
        setErrorMsg(err?.data?.error || fallbackErr?.data?.message || fallbackErr?.message || err?.message || 'Não foi possível registrar o pedido.')
      }
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
              onClick={() => setAuthDrawerOpen(true)}
              className="relative px-3 py-2 rounded-lg bg-[#17171C] hover:bg-[#27272A] border border-[#27272A] text-white flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
              title="Cadastro e Meus Pedidos"
            >
              <User size={15} className="text-[#E10600]" />
              <span className="hidden sm:inline">
                {currentCustomer ? currentCustomer.name.split(' ')[0] : 'Minha Conta'}
              </span>
              {customerCampaigns.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

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

        <StorePromotionCarousel />

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
              const hasRecipe = Boolean(item.recipe && item.recipe.length > 0)
              const recipeDescriptions = hasRecipe
                ? (item.recipe || [])
                    .map((r) => stockById(r?.ingredientId)?.name || '')
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
                              {fmtBRL(calculateLineTotal(line))}
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

                        {line.gourmetFreeChoice && line.gourmetFreeChoice !== 'none' && (
                          <div className="text-[11px] text-amber-300 font-semibold leading-tight">
                            ★ Cortesia Gourmet:{' '}
                            {line.gourmetFreeChoice === 'catupiry'
                              ? 'Catupiry (Grátis)'
                              : 'Cheddar (Grátis)'}
                          </div>
                        )}
                        {line.removed && line.removed.length > 0 && (
                          <div className="text-[11px] text-red-400/90 leading-tight">
                            Sem: {line.removed.join(', ')}
                          </div>
                        )}
                        {line.added && line.added.length > 0 && (
                          <div className="text-[11px] text-emerald-400/90 leading-tight">
                            Adicionais extras:{' '}
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
                      <div className="mt-3 space-y-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                        {/* Seletor de Bairro / Taxa Cadastrada */}
                        <div>
                          <label className="block text-[11px] font-semibold text-[#C0C0C0] mb-1">
                            Bairro para Entrega (Taxa Pré-cadastrada)
                          </label>
                          <select
                            value={selectedFeeNeighborhood}
                            onChange={(e) => {
                              const chosen = deliveryFees.find((f) => f.name === e.target.value)
                              if (chosen) {
                                setSelectedFeeNeighborhood(chosen.name)
                                setDeliveryFeeValue(chosen.fee)
                                if (chosen.lat && chosen.lng) {
                                  setDeliveryLat(chosen.lat)
                                  setDeliveryLng(chosen.lng)
                                }
                              }
                            }}
                            className="w-full bg-[#17171C] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            {deliveryFees.map((fee) => (
                              <option key={fee.id} value={fee.name}>
                                {fee.name} — {fmtBRL(fee.fee)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Botão de Compartilhar Localização com Mapa Real */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400">Localização Precisa</span>
                            <button
                              type="button"
                              onClick={handleGetBrowserLocation}
                              disabled={locatingUser}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E10600]/20 hover:bg-[#E10600]/30 text-[#E10600] border border-[#E10600]/40 text-[11px] font-bold cursor-pointer"
                            >
                              <Compass size={13} className={locatingUser ? 'animate-spin' : ''} />
                              <span>
                                {locatingUser ? 'Obtendo GPS...' : 'Compartilhar localização atual'}
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setUseMapLocation(!useMapLocation)}
                            className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                          >
                            {useMapLocation
                              ? 'Ocultar mapa do endereço'
                              : 'Abrir mapa interativo de entrega'}
                          </button>

                          {useMapLocation && (
                            <DeliveryMapPicker
                              lat={deliveryLat}
                              lng={deliveryLng}
                              onChangeCoords={(lat, lng) => {
                                setDeliveryLat(lat)
                                setDeliveryLng(lng)
                                const resolved = resolveDeliveryFee(lat, lng, deliveryFees)
                                setDeliveryFeeValue(resolved.fee)
                                setSelectedFeeNeighborhood(
                                  `${resolved.nearestName} (${resolved.distanceKm} km)`,
                                )
                              }}
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#C0C0C0] mb-1">
                            Endereço completo (Rua, Nº, Apto, Referência) *
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
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-white">
                      <input type="checkbox" checked={wantsInvoice} onChange={e=>setWantsInvoice(e.target.checked)} />
                      Desejo Nota Fiscal deste pedido
                    </label>
                    {wantsInvoice && <><input value={invoiceDocument} onChange={e=>setInvoiceDocument(e.target.value)} placeholder="CPF/CNPJ para a nota" className="w-full rounded-lg border border-zinc-700 bg-[#17171C] px-3 py-2 text-xs text-white"/><p className="text-[10px] text-zinc-500">A nota incluirá produtos, quantidades, adicionais, remoções, descontos e taxa de entrega. A autorização fiscal será processada pelo emissor fiscal conectado ao estabelecimento.</p></>}
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

                    {payment === 'Pix' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-center">
                        <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                          <QrCode size={14} className="text-[#E10600]" />
                          <span>Pague via Pix Copia e Cola / QR Code Real</span>
                        </div>
                        <img
                          src={pixQrCodeUrl}
                          alt="QR Code Pix"
                          className="w-36 h-36 mx-auto bg-white p-1.5 rounded-lg border border-zinc-700 shadow"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            readOnly
                            value={pixEMV}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 font-mono truncate"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(pixEMV)
                              setPixCopied(true)
                              setTimeout(() => setPixCopied(false), 2000)
                            }}
                            className="px-2.5 py-1 bg-[#E10600] hover:bg-[#9E0400] text-white text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer"
                          >
                            {pixCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Chave Pix: {pixKey} • O operador confirmará o pagamento no painel ao
                          despachar
                        </p>
                      </div>
                    )}

                    {payment === 'Dinheiro' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                        <label className="block text-xs font-semibold text-[#C0C0C0]">
                          Precisa de troco? Para quanto?
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Ex: 50 ou 100"
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#17171C] border border-[#27272A] rounded-lg text-xs text-white placeholder:text-[#9A9CA0] focus:outline-none focus:border-[#E10600]"
                          />
                        </div>
                        {changeFor && Number(changeFor) > finalTotal && (
                          <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                            Troco a ser devolvido pelo entregador:{' '}
                            {fmtBRL(Number(changeFor) - finalTotal)}
                          </div>
                        )}
                      </div>
                    )}

                    {payment === 'Cartão' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                        <label className="block text-xs font-semibold text-[#C0C0C0]">
                          Selecione a função do cartão para a maquininha:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCardType('debito')}
                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                              cardType === 'debito'
                                ? 'bg-[#E10600] border-[#E10600] text-white'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            Cartão de Débito
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardType('credito')}
                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                              cardType === 'credito'
                                ? 'bg-[#E10600] border-[#E10600] text-white'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            Cartão de Crédito
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Footer Carrinho / Botão Enviar */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#27272A] bg-[#121215] space-y-3">
                <div className="rounded-xl border border-[#27272A] bg-[#17171C] p-3 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Voucher, código ou cupom</label>
                  <div className="flex gap-2">
                    <input value={voucherCode} onChange={(e)=>setVoucherCode(e.target.value.toUpperCase())} placeholder="Ex.: LOY-A1B2C3" className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase text-white" />
                    <button type="button" onClick={handleApplyVoucherCode} className="rounded-lg bg-[#E10600] px-3 py-2 text-xs font-bold text-white">Aplicar</button>
                  </div>
                  {voucherMessage && <p className="text-[11px] text-zinc-400">{voucherMessage}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-[#C0C0C0]">
                  <span>Subtotal</span>
                  <span className="font-bold text-white font-mono">{fmtBRL(subtotal)}</span>
                </div>

                {deliveryType === 'entrega' && (
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Taxa de Entrega ({selectedFeeNeighborhood || 'Padrão'})</span>
                    <span className="font-bold text-white font-mono">
                      {fmtBRL(deliveryFeeValue)}
                    </span>
                  </div>
                )}

                {appliedCampaign && discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>Voucher ({appliedCampaign.title})</span>
                    <span>-{fmtBRL(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-zinc-800">
                  <span className="text-white">Total a Pagar</span>
                  <span className="text-white font-mono text-lg">{fmtBRL(finalTotal)}</span>
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
                onClick={() => setShowReceiptModal(true)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Ver Comprovante Detalhado</span>
              </button>

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
        gourmetFreeChoice={customizeGourmetChoice}
        setGourmetFreeChoice={setCustomizeGourmetChoice}
        catupiryExtraPrice={catupiryAddPrice}
        cheddarExtraPrice={cheddarAddPrice}
      />

      {/* 7. Drawer de Autenticação / CRM do Cliente */}
      <CustomerAuthDrawer
        isOpen={authDrawerOpen}
        onClose={() => setAuthDrawerOpen(false)}
        currentCustomer={currentCustomer}
        orders={customerOrders}
        campaigns={customerCampaigns}
        onLogin={handleCustomerLogin}
        onLogout={handleCustomerLogout}
        onDeleteAccount={handleDeleteCustomerAccount}
        onApplyCampaign={(c) => {
          setAppliedCampaign(c)
          setAuthDrawerOpen(false)
          setCartOpen(true)
        }}
        onRepeatOrder={(pastOrder) => {
          // Repete os itens do pedido anterior no carrinho atual
          const newLines: CustomerCartLine[] = (pastOrder.items || []).map((it) => ({
            cartLineId: `repeat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            itemId: it.itemId,
            qty: it.qty,
            removed: it.removed || [],
            added: it.added
              ? it.added.map((a: any) => ({ ingredientId: a.ingredientId || a.name, qty: a.qty }))
              : [],
            gourmetFreeChoice: it.gourmetFreeChoice,
          }))
          setCart((prev) => [...prev, ...newLines])
          setAuthDrawerOpen(false)
          setCartOpen(true)
        }}
      />

      {/* 8. Modal de Comprovante Visual / Impressão */}
      {confirmedOrder && showReceiptModal && (
        <OrderReceiptModal
          order={confirmedOrder}
          onClose={() => setShowReceiptModal(false)}
          storeName={storeName}
          pixQrUrl={pixQrCodeUrl}
          pixCode={pixEMV}
        />
      )}
    </div>
  )
}
