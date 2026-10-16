import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { demoGestaoMode } from '@/lib/pocketbase/client'

/** Route-level access control for the separate administrative app. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  // No user account is needed to explore the isolated demo; never bypass auth with a real backend.
  if (demoGestaoMode) return <>{children}</>
  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-200 bg-[#09090B]">Verificando acesso…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
