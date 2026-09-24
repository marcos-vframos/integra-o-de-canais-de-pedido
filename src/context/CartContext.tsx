import React, { createContext, useContext, useState, useEffect } from 'react'
import type { MenuItem } from '@/types/loyolas'

export interface CustomerCartItem {
  cartLineId: string
  item: MenuItem
  qty: number
  removed: string[]
  added: { name: string; qty: number }[]
}

interface CartContextType {
  cart: CustomerCartItem[]
  addToCart: (
    item: MenuItem,
    qty?: number,
    removed?: string[],
    added?: { name: string; qty: number }[],
  ) => void
  removeFromCart: (cartLineId: string) => void
  updateQuantity: (cartLineId: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'loyolas_cart_v1'

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CustomerCartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    }
    return []
  })

  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  const addToCart = (
    item: MenuItem,
    qty = 1,
    removed: string[] = [],
    added: { name: string; qty: number }[] = [],
  ) => {
    setCart((prev) => {
      // Se não tem customização, acumula na mesma linha
      if (removed.length === 0 && added.length === 0) {
        const existingIdx = prev.findIndex(
          (line) =>
            line.item.id === item.id && line.removed.length === 0 && line.added.length === 0,
        )
        if (existingIdx > -1) {
          const updated = [...prev]
          updated[existingIdx].qty += qty
          return updated
        }
      }
      return [
        ...prev,
        {
          cartLineId: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          item,
          qty,
          removed,
          added,
        },
      ]
    })
  }

  const removeFromCart = (cartLineId: string) => {
    setCart((prev) => prev.filter((item) => item.cartLineId !== cartLineId))
  }

  const updateQuantity = (cartLineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartLineId)
      return
    }
    setCart((prev) =>
      prev.map((item) => (item.cartLineId === cartLineId ? { ...item, qty: quantity } : item)),
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const totalItems = cart.reduce((acc, it) => acc + it.qty, 0)
  const subtotal = cart.reduce((acc, it) => acc + (it.item.price || 0) * it.qty, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider')
  }
  return context
}
