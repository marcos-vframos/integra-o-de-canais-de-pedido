import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { CartProvider } from '@/context/CartContext'
import { LandingProvider } from '@/context/LandingContentContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Páginas dos 3 canais integrados
import Index from '@/pages/Index'
import LojaPublica from '@/pages/LojaPublica'
import AdmLanding from '@/pages/AdmLanding'
import Gestao from '@/pages/Gestao'
import Config from '@/pages/Config'

// Páginas de autenticação mantidas
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <LandingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Canal 1: Landing Page Pública */}
                <Route path="/" element={<Index />} />

                {/* Canal 2: Loja do Cliente (App de pedidos online) */}
                <Route path="/loja" element={<LojaPublica />} />

                {/* Canal 2.5: Área Administrativa da Landing Page */}
                <Route path="/adm-landing" element={<AdmLanding />} />

                {/* Canal 3: App de Gestão Operacional / PDV (com abas e caixa) */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/gestao" element={<Gestao />} />
                  <Route path="/config" element={<Config />} />
                </Route>

                {/* Autenticação do sistema */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

                {/* Redirecionamentos e 404 */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </LandingProvider>
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
