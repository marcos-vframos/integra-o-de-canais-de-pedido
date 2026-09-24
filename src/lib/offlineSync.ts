import pb from '@/lib/pocketbase/client'
import type { OrderRecord } from '@/types/loyolas'
import type { OfflineOrderItem } from '@/types/offline'
import { getOfflineQueue, updateOfflineOrderItem, removeOfflineOrderItem } from './offlineQueue'
import { saveTicketCounterCache } from './offlineCache'

let isSyncing = false

export interface SyncResult {
  totalProcessed: number
  succeeded: number
  failedNetwork: number
  failedPermanent: number
  syncedOrders: OrderRecord[]
  lowStockWarnings: string[]
}

async function sendSingleOrder(item: OfflineOrderItem): Promise<{
  order: OrderRecord
  lowStockWarnings: string[]
}> {
  try {
    const res = await pb.send<{
      success: boolean
      order: OrderRecord
      lowStockWarnings: string[]
    }>('/backend/v1/orders/finalize', {
      method: 'POST',
      body: item.payload,
    })

    if (!res || !res.order) {
      throw new Error('Resposta inválida do servidor ao sincronizar pedido')
    }

    return {
      order: res.order,
      lowStockWarnings: res.lowStockWarnings || [],
    }
  } catch (err: any) {
    const status = err?.status || err?.response?.status || err?.data?.code
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const serverMsg = err?.data?.error || err?.message || 'Erro de validação do pedido'
      const permErr = new Error(serverMsg)
      ;(permErr as any).isPermanent = true
      throw permErr
    }
    throw err
  }
}

export async function processOfflineQueue(options?: {
  onOrderSynced?: (syncedOrder: OrderRecord, offlineId: string) => void
  onLowStock?: (warnings: string[]) => void
}): Promise<SyncResult> {
  if (isSyncing) {
    return {
      totalProcessed: 0,
      succeeded: 0,
      failedNetwork: 0,
      failedPermanent: 0,
      syncedOrders: [],
      lowStockWarnings: [],
    }
  }

  isSyncing = true
  window.dispatchEvent(
    new CustomEvent('loyolas_sync_status_changed', { detail: { isSyncing: true } }),
  )

  const result: SyncResult = {
    totalProcessed: 0,
    succeeded: 0,
    failedNetwork: 0,
    failedPermanent: 0,
    syncedOrders: [],
    lowStockWarnings: [],
  }

  try {
    const queue = getOfflineQueue()
    const toProcess = queue.filter(
      (i) => i.status === 'pending' || i.status === 'syncing' || i.status === 'failed',
    )

    for (const item of toProcess) {
      result.totalProcessed++

      updateOfflineOrderItem(item.id, (prev) => ({
        ...prev,
        status: 'syncing',
        lastAttemptAt: new Date().toISOString(),
        retryCount: prev.retryCount + 1,
      }))

      try {
        const { order, lowStockWarnings } = await sendSingleOrder(item)

        removeOfflineOrderItem(item.id)
        result.succeeded++
        result.syncedOrders.push(order)

        if (lowStockWarnings.length > 0) {
          result.lowStockWarnings.push(...lowStockWarnings)
        }

        if (order.ticketNumber) {
          saveTicketCounterCache(order.ticketNumber + 1)
        }

        if (options?.onOrderSynced) {
          options.onOrderSynced(order, item.id)
        }
      } catch (err: any) {
        if (err?.isPermanent) {
          result.failedPermanent++
          updateOfflineOrderItem(item.id, (prev) => ({
            ...prev,
            status: 'failed',
            errorMessage: err?.message || 'Erro definitivo ao registrar pedido no servidor',
          }))
        } else {
          result.failedNetwork++
          updateOfflineOrderItem(item.id, (prev) => ({
            ...prev,
            status: 'pending',
            errorMessage: 'Falha de conexão com a internet. Tentaremos novamente.',
          }))
          break
        }
      }
    }

    if (result.lowStockWarnings.length > 0 && options?.onLowStock) {
      options.onLowStock(result.lowStockWarnings)
    }
  } finally {
    isSyncing = false
    window.dispatchEvent(
      new CustomEvent('loyolas_sync_status_changed', { detail: { isSyncing: false, result } }),
    )
  }

  return result
}

export function isCurrentlySyncing(): boolean {
  return isSyncing
}
