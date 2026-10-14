import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Marquee from '@/components/Marquee'
import Story from '@/components/Story'
import FeaturedMenu from '@/components/FeaturedMenu'
import Reviews from '@/components/Reviews'
import InstagramSection from '@/components/InstagramSection'
import OrderCTA from '@/components/OrderCTA'
import LocationHours from '@/components/LocationHours'
import Footer from '@/components/Footer'
import SeasonalCampaignOverlay from '@/components/SeasonalCampaignOverlay'

export default function Index() {
  const [activeSection, setActiveSection] = useState('inicio')

  useEffect(() => {
    const sectionIds = ['inicio', 'historia', 'cardapio', 'avaliacoes', 'instagram', 'localizacao']
    const container = document.getElementById('landing-container')

    const handleScroll = () => {
      const scrollPosition = (container ? container.scrollTop : window.scrollY) + 260
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i]
        const element = document.getElementById(id)
        if (element) {
          const top = element.offsetTop
          if (scrollPosition >= top) {
            setActiveSection(id)
            break
          }
        }
      }
    }

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div
      id="landing-container"
      className="landing-scope w-full min-h-screen overflow-x-hidden text-[#F3F4F6] overscroll-y-auto"
      style={{ backgroundColor: 'var(--landing-bg-primary, #07140B)' }}
    >
      <SeasonalCampaignOverlay />
      {/* Atalho administrativo com o ícone original de fachada, sem engrenagem nem segundo botão. */}
      <Link
        to="/adm-landing"
        aria-label="Abrir ADM da Landing"
        title="ADM da Landing"
        className="fixed bottom-5 left-5 z-50 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-[#101114] text-zinc-300 shadow-lg transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Store size={19} strokeWidth={1.7} aria-hidden="true" />
      </Link>

      {/* 1. Header Fixo com status e botão para /loja */}
      <Header activeSection={activeSection} />

      {/* 2. Hero 100vh com textos alternados e crossfade de imagens */}
      <main className="w-full">
        <Hero />
        {/* 3. Faixa Marquee contínua fixada entre o topo ou na transição da história */}
        <Marquee />
        {/* 4. História e Tradição (100vh) */}
        <Story />
        {/* 5. Cardápio em Destaque conectado ao menu do PocketBase em tempo real (100vh) */}
        <FeaturedMenu />
        {/* 6. Avaliações dos Clientes & Prova Social (100vh) */}
        <Reviews />
        {/* 7. Seção Instagram Oficial (@loyolass_lanches) (100vh) */}
        <InstagramSection />
        {/* 8. CTA de Conversão direto para /loja (100vh) */}
        <OrderCTA />
        {/* 9. Localização (Google Maps Embed) & Horários Dinâmicos (100vh) */}
        <LocationHours />
        {/* 10. Rodapé da Landing Page (100vh snap-start) */}
        <Footer />
      </main>
    </div>
  )
}