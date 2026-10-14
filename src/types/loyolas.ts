export interface MenuItem {
  id: string
  code?: string
  name: string
  price: number
  category:
    | 'Carnes'
    | 'Frango'
    | 'Hot-Dog'
    | 'Gourmet'
    | 'Especial'
    | 'Combos'
    | 'Bebidas'
    | 'Complementos'
  active: boolean
  recipe?: { ingredientId: string; qty: number }[]
  created?: string
  updated?: string
}

export interface InventoryItem {
  id: string
  code?: string
  name: string
  unit: 'un' | 'porção' | 'fatia' | 'rolo' | 'g' | 'kg' | 'ml' | 'l'
  qty: number
  min: number
  group: 'Ingrediente' | 'Operacional'
  created?: string
  updated?: string
}

export interface OrderItem {
  itemId?: string
  name: string
  price: number
  qty: number
  removed?: string[]
  added?: { name: string; qty: number }[]
  gourmetFreeChoice?: 'catupiry' | 'cheddar' | 'none'
}

export interface OrderRecord {
  id: string
  ticketNumber: number
  items: OrderItem[]
  subtotal?: number
  discount?: number
  deliveryFee?: number
  deliveryFeeRegion?: string
  total: number
  payment: 'Dinheiro' | 'Pix' | 'Cartão'
  status?: string
  origin?: 'balcao' | 'online'
  customerName?: string
  customerPhone?: string
  deliveryType?: 'retirada' | 'entrega'
  customerAddress?: string
  motoboyId?: string
  motoboyName?: string
  invoiceRequested?: boolean
  invoiceDocument?: string
  invoiceStatus?: 'nao_solicitada' | 'pendente_emissao' | 'emitida' | 'erro'
  created?: string
  updated?: string
}

export interface ClosureRecord {
  id: string
  openedAt?: string
  closedAt: string
  dateLabel: string
  grossTotal: number
  discount: number
  netTotal: number
  byPayment: Record<string, number>
  ordersCount: number
  productBreakdown: { name: string; qty: number; total: number }[]
  byOriginCount?: Record<string, number>
  byOriginTotals?: Record<string, number>
  created?: string
  updated?: string
}

export interface CartLine {
  cartLineId: string
  itemId: string
  qty: number
  removed: string[] // ingredient codes/ids
  added: { ingredientId: string; qty: number }[]
  gourmetFreeChoice?: 'catupiry' | 'cheddar' | 'none'
}
