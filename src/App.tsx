import {lazy,Suspense} from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LandingProvider } from '@/context/LandingContentContext'
import { ThemeProvider } from '@/context/ThemeContext'
import BackendStatusNotice from '@/components/BackendStatusNotice'
import Index from '@/pages/Index'
const LojaPublica=lazy(()=>import('@/pages/LojaPublica'))

/** Public client-only application. No administrative route or module is exposed here. */
export default function App() {
  return <BrowserRouter>
    <ThemeProvider>
    <LandingProvider>
      <TooltipProvider>
        <BackendStatusNotice />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/loja" element={<Suspense fallback={<p role="status">Carregando loja…</p>}><LojaPublica /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </LandingProvider>
    </ThemeProvider>
  </BrowserRouter>
}
