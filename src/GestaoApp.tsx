import {PilotRuntimeProvider} from '@/context/PilotRuntimeContext'
import {lazy,Suspense} from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { LandingProvider } from '@/context/LandingContentContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import BackendStatusNotice from '@/components/BackendStatusNotice'
import Layout from '@/components/Layout'
const Gestao=lazy(()=>import('@/pages/Gestao'))
const ControlPanel=lazy(()=>import('@/pages/ControlPanel'))
const ActivatePilotPage=lazy(()=>import('@/pages/ActivatePilot'))
const Config=lazy(()=>import('@/pages/Config'))
const AdmLanding=lazy(()=>import('@/pages/AdmLanding'))
import Login from '@/pages/Login'
const ForgotPassword=lazy(()=>import('@/pages/ForgotPassword'))
const ResetPassword=lazy(()=>import('@/pages/ResetPassword'))
const VerifyEmail=lazy(()=>import('@/pages/VerifyEmail'))
const ConfirmEmailChange=lazy(()=>import('@/pages/ConfirmEmailChange'))

/** Dedicated administrator PWA. This output must be deployed on its own domain. */
export default function GestaoApp() {
  return <BrowserRouter>
    <AuthProvider><PilotRuntimeProvider>
      <ThemeProvider>
        <LandingProvider>
          <TooltipProvider>
            <BackendStatusNotice />
            <Toaster />
            <Sonner />
            <Suspense fallback={<p className="p-6 text-sm" role="status">Carregando módulo…</p>}><Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/gestao" element={<Gestao />} />
                <Route path="/ativar-piloto" element={<ActivatePilotPage />} />
                <Route path="/config" element={<Config />} />
                <Route path="/painel-de-controle" element={<ControlPanel />} />
                <Route path="/painel-de-controle/configuracoes" element={<Config panel />} />
                <Route path="/adm-landing" element={<AdmLanding />} />
              </Route>
              <Route path="*" element={<Navigate to="/gestao" replace />} />
            </Routes></Suspense>
          </TooltipProvider>
        </LandingProvider>
      </ThemeProvider>
    </PilotRuntimeProvider></AuthProvider>
  </BrowserRouter>
}
