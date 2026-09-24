import type { MenuItem, InventoryItem } from '@/types/loyolas'

const MENU_CACHE_KEY = 'loyolas_offline_menu_cache'
const STOCK_CACHE_KEY = 'loyolas_offline_stock_cache'
const TICKET_CACHE_KEY = 'loyolas_offline_last_ticket_counter'
const SETTINGS_CACHE_KEY = 'loyolas_offline_settings_cache'

export interface CachedSettings {
  storeName: string
  isOpen: boolean
  ticketCounter: number
  storeCnpj?: string
  storePhone?: string
  storeAddress?: string
}

export function saveMenuCache(menu: MenuItem[]): void {
  try {
    if (menu && menu.length > 0) {
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu))
    }
  } catch (err) {
    console.warn('Falha ao salvar cache de cardápio:', err)
  }
}

export function getMenuCache(): MenuItem[] | null {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveStockCache(stock: InventoryItem[]): void {
  try {
    if (stock && stock.length > 0) {
      localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(stock))
    }
  } catch (err) {
    console.warn('Falha ao salvar cache de estoque:', err)
  }
}

export function getStockCache(): InventoryItem[] | null {
  try {
    const raw = localStorage.getItem(STOCK_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveTicketCounterCache(counter: number): void {
  try {
    if (counter >= 1) {
      localStorage.setItem(TICKET_CACHE_KEY, String(counter))
    }
  } catch (err) {
    console.warn('Falha ao salvar cache de contador de comandas:', err)
  }
}

export function resetTicketCounterCache(): void {
  try {
    localStorage.setItem(TICKET_CACHE_KEY, '1')
  } catch (err) {
    console.warn('Falha ao resetar cache de contador de comandas:', err)
  }
}

export function getTicketCounterCache(): number | null {
  try {
    const raw = localStorage.getItem(TICKET_CACHE_KEY)
    if (!raw) return null
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

export function saveSettingsCache(settings: CachedSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('Falha ao salvar cache de configurações:', err)
  }
}

export function getSettingsCache(): CachedSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
