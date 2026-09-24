import type { OfflineOrderItem, OfflineOrderPayload } from '@/types/offline'
import { getTicketCounterCache, saveTicketCounterCache } from './offlineCache'
import { uid } from './seeds'

const QUEUE_STORAGE_KEY = 'loyolas_offline_orders_queue_v1'

export function getOfflineQueue(): OfflineOrderItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Erro ao ler fila offline:', err)
    return []
  }
}

export function saveOfflineQueue(queue: OfflineOrderItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent('loyolas_offline_queue_changed', { detail: queue }))
  } catch (err) {
    console.error('Erro ao salvar fila offline:', err)
  }
}

export function enqueueOfflineOrder(
  payload: OfflineOrderPayload,
  lastKnownTicketNumber: number,
): OfflineOrderItem {
  const queue = getOfflineQueue()

  let highestTicket = lastKnownTicketNumber || getTicketCounterCache() || 1
  for (const item of queue) {
    if (item.provisionalTicketNumber && item.provisionalTicketNumber >= highestTicket) {
      highestTicket = item.provisionalTicketNumber + 1
    }
  }

  const provisionalTicketNumber = highestTicket
  const provisionalTicket = `##${String(provisionalTicketNumber).padStart(4, '0')} (pendente)`

  const newOfflineOrder: OfflineOrderItem = {
    id: uid('off-order'),
    provisionalTicket,
    provisionalTicketNumber,
    createdAt: new Date().toISOString(),
    payload,
    status: 'pending',
    retryCount: 0,
  }

  const updatedQueue = [...queue, newOfflineOrder]
  saveOfflineQueue(updatedQueue)
  saveTicketCounterCache(provisionalTicketNumber + 1)

  return newOfflineOrder
}

export function updateOfflineOrderItem(
  id: string,
  updater: (item: OfflineOrderItem) => OfflineOrderItem,
): void {
  const queue = getOfflineQueue()
  const updated = queue.map((item) => (item.id === id ? updater(item) : item))
  saveOfflineQueue(updated)
}

export function removeOfflineOrderItem(id: string): void {
  const queue = getOfflineQueue()
  const filtered = queue.filter((item) => item.id !== id && item.syncedOrder?.id !== id)
  saveOfflineQueue(filtered)
}

export function findOfflineOrderItem(idOrSyncedId: string): OfflineOrderItem | undefined {
  const queue = getOfflineQueue()
  return queue.find((item) => item.id === idOrSyncedId || item.syncedOrder?.id === idOrSyncedId)
}

export function clearSyncedFromQueue(): void {
  const queue = getOfflineQueue()
  const remaining = queue.filter((item) => item.status !== 'synced')
  saveOfflineQueue(remaining)
}
