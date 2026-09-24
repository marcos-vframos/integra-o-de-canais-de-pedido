import { useState, useEffect } from 'react'
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

export default function Index() {
  const [activeSection, setActiveSection] = useState('inicio')

  useEffect(() => {
    const sectionIds = ['inicio', 'historia', 'cardapio', 'avaliacoes', 'instagram', 'localizacao']
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 220
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
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-scope w-full overflow-x-hidden min-h-screen bg-[#07140B] text-[#F3F4F6]">
      {/* 1. Header Fixo com status e botão para /loja */}
      <Header activeSection={activeSection} />

      {/* 2. Hero 100vh com efeito fumaça & CTA para /loja */}
      <main>
        <Hero />
        {/* 3. Faixa Marquee contínua */}
        <Marquee />
        {/* 4. História e Tradição */}
        <Story />
        {/* 5. Cardápio em Destaque conectado ao menu do PocketBase em tempo real */}
        <FeaturedMenu />
        {/* 6. Avaliações dos Clientes & Prova Social */}
        <Reviews />
        {/* 7. Seção Instagram Oficial (@loyolass_lanches) */}
        <InstagramSection />
        {/* 8. CTA de Conversão direto para /loja */}
        <OrderCTA />
        {/* 9. Localização (Google Maps Embed) & Horários Dinâmicos */}
        <LocationHours />
      </main>

      {/* 10. Rodapé com link para painel de gestão */}
      <Footer />
    </div>
  )
}
