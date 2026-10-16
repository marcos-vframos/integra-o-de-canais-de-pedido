import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LandingProvider } from '@/context/LandingContentContext'
import BackendStatusNotice from '@/components/BackendStatusNotice'
import Index from '@/pages/Index'
import LojaPublica from '@/pages/LojaPublica'

/** Public client-only application. No administrative route or module is exposed here. */
export default function App() {
  return <BrowserRouter>
    <LandingProvider>
      <TooltipProvider>
        <BackendStatusNotice />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/loja" element={<LojaPublica />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </LandingProvider>
  </BrowserRouter>
}
