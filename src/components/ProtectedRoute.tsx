import React from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Autenticação temporariamente desativada a pedido do usuário.
  // Permite acesso direto a todas as rotas operacionais sem login.
  return <>{children}</>
}
