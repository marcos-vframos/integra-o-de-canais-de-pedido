import React, { createContext, useContext, useEffect, useState } from 'react'
type AuthModel = { id: string; email?: string; role?: string; [key: string]: any }
import pb, { backendConfigured } from '@/lib/pocketbase/client'

interface AuthContextType {
  user: AuthModel | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (token: string, password: string, passwordConfirm: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.record)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      if (active) setUser(model)
    })
    if (!backendConfigured) {
      pb.authStore.clear()
      setUser(null)
      setLoading(false)
    } else if (!pb.authStore.hasSession) {
      pb.authStore.clear()
      setUser(null)
      setLoading(false)
    } else {
      // A token from an earlier backend must never unlock the manager.
      pb.collection('users').authRefresh()
        .then(() => { if (active) setUser(pb.authStore.record) })
        .catch((error) => {
          // A temporary network failure must not destroy a renewable session.
          if ([400,401,403].includes(error?.status) || error?.message?.includes('sem autorização')) pb.authStore.clear()
          if (active) setUser(null)
        })
        .finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false; unsubscribe() }
  }, [])

  const login = async (email: string, pass: string) => {
    if (!backendConfigured) throw new Error('Configure o Supabase independente para entrar como operador.')
    await pb.collection('users').authWithPassword(email, pass)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    await pb.collection('users').requestPasswordReset(email)
  }

  const confirmPasswordReset = async (token: string, password: string, passwordConfirm: string) => {
    await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, requestPasswordReset, confirmPasswordReset }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
