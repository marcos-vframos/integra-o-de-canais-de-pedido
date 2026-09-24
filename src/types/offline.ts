import type { OrderItem } from '@/types/loyolas'

export interface OfflineOrderPayload {
  items: OrderItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  payment: 'Dinheiro' | 'Pix' | 'Cartão'
  deductions: Record<string, number>
  origin?: 'balcao' | 'online'
  customerName?: string
  customerPhone?: string
  deliveryType?: 'retirada' | 'entrega'
  customerAddress?: string
}

export type OfflineOrderStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface OfflineOrderItem {
  id: string
  provisionalTicket: string
  provisionalTicketNumber: number
  createdAt: string
  payload: OfflineOrderPayload
  status: OfflineOrderStatus
  errorMessage?: string
  lastAttemptAt?: string
  retryCount: number
  syncedOrder?: {
    id: string
    ticketNumber: number
    created: string
  }
}
