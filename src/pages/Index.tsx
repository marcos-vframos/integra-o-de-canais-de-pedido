import {lazy,Suspense} from 'react'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import StorePromotionCarousel from '@/components/StorePromotionCarousel'
import Marquee from '@/components/Marquee'
import Story from '@/components/Story'
import FeaturedMenu from '@/components/FeaturedMenu'
const LojaPublica=lazy(()=>import('@/pages/LojaPublica'))
import Reviews from '@/components/Reviews'
import InstagramSection from '@/components/InstagramSection'
import OrderCTA from '@/components/OrderCTA'
import LocationHours from '@/components/LocationHours'
import Footer from '@/components/Footer'
import SeasonalCampaignOverlay from '@/components/SeasonalCampaignOverlay'

export default function Index() {
  const [activeSection, setActiveSection] = useState('inicio')

  useEffect(() => {
    const ids=['inicio','historia','cardapio','avaliacoes','instagram','localizacao']
    let frame=0
    const measure=()=>{frame=0;let active='inicio';for(const id of ids){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=160)active=id}setActiveSection(active)}
    const update=()=>{if(!frame)frame=requestAnimationFrame(measure)}
    // Capture nested scroll containers as well as the document; offsetTop is not a viewport coordinate.
    document.addEventListener('scroll',update,true);window.addEventListener('resize',update)
    measure()
    return()=>{document.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);cancelAnimationFrame(frame)}
  }, [])

  return (
    <div
      id="landing-container"
      className="landing-scope w-full min-h-screen overflow-x-hidden text-[#F3F4F6] overscroll-y-auto"
      style={{ backgroundColor: 'var(--landing-bg-primary, #07140B)' }}
    >
      <SeasonalCampaignOverlay />
      {/* 1. Header Fixo com acesso ao cardápio nativo */}
      <Header activeSection={activeSection} />

      {/* 2. Hero 100vh com textos alternados e crossfade de imagens */}
      <main className="w-full">
        <Hero />
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6"><StorePromotionCarousel /></div>
        {/* 3. Faixa Marquee contínua fixada entre o topo ou na transição da história */}
        <Marquee />
        {/* 4. História e Tradição (100vh) */}
        <Story />
        {/* 5. Cardápio em Destaque conectado ao menu do PocketBase em tempo real (100vh) */}
        <FeaturedMenu />
        {/* O motor da loja vive na propria landing: sem segundo catalogo nem outra rota. */}
        <Suspense fallback={<p role="status">Carregando loja…</p>}><LojaPublica embedded /></Suspense>
        {/* 6. Avaliações dos Clientes & Prova Social (100vh) */}
        <Reviews />
        {/* 7. Seção Instagram Oficial (@loyolass_lanches) (100vh) */}
        <InstagramSection />
        {/* 8. CTA de Conversão para o cardápio nativo (100vh) */}
        <OrderCTA />
        {/* 9. Localização (Google Maps Embed) & Horários Dinâmicos (100vh) */}
        <LocationHours />
        {/* 10. Rodapé da Landing Page (100vh snap-start) */}
        <Footer />
      </main>
    </div>
  )
}