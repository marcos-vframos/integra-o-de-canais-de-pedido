import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { BUSINESS_INFO } from '@/data/loyolasData'

import { useLandingContent } from '@/context/LandingContentContext'

export default function Footer() {
  const { content } = useLandingContent()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const currentYear = new Date().getFullYear()
  const footerDesc =
    content.footerDesc ||
    'O autêntico podrão brasileiro com mais de 18 anos de tradição. Fartura, saboroso, feito com carinho e ingredientes selecionados com capricho.'
  const addressText = content.addressText || BUSINESS_INFO.address
  const phoneText = content.phoneText || BUSINESS_INFO.phoneDisplay

  useEffect(() => {
    const container = document.getElementById('landing-container')
    const handleScroll = () => {
      const top = container ? container.scrollTop : window.scrollY
      setShowBackToTop(top > 400)
    }
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    const mainContainer = document.getElementById('landing-container')
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <footer
      id="rodape"
      className="min-h-screen w-full bg-[#07100A] text-white border-t border-white/[0.08] py-20 lg:py-24 relative snap-start flex items-center"
      role="contentinfo"
      aria-label="Rodapé do Loyolas Lanches"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-white/[0.06]">
          <div className="space-y-4">
            <div>
              <span className="font-heading font-extrabold text-lg tracking-tight text-white block">
                Loyolas Lanches
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#C4C4C4]/70">
                Pindamonhangaba • SP
              </span>
            </div>
            <p className="text-xs text-[#C4C4C4] leading-relaxed">{footerDesc}</p>
            <div className="flex items-center gap-4 text-xs">
              <a
                href={BUSINESS_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4C4C4] hover:text-white transition-colors"
              >
                Instagram
              </a>
              <span className="text-white/20">•</span>
              <a
                href={BUSINESS_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4C4C4] hover:text-white transition-colors"
              >
                Facebook
              </a>
              <span className="text-white/20">•</span>
              <a
                href={BUSINESS_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4C4C4] hover:text-white transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <span className="editorial-tag block text-white/90">Navegação</span>
            <ul className="space-y-2 text-[#C4C4C4]">
              <li>
                <a
                  href="#inicio"
                  onClick={(e) => handleNavClick(e, '#inicio')}
                  className="hover:text-white transition-colors"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#historia"
                  onClick={(e) => handleNavClick(e, '#historia')}
                  className="hover:text-white transition-colors"
                >
                  Origem & Tradição
                </a>
              </li>
              <li>
                <a
                  href="#cardapio"
                  onClick={(e) => handleNavClick(e, '#cardapio')}
                  className="hover:text-white transition-colors"
                >
                  Cardápio
                </a>
              </li>
              <li>
                <a
                  href="#avaliacoes"
                  onClick={(e) => handleNavClick(e, '#avaliacoes')}
                  className="hover:text-white transition-colors"
                >
                  Avaliações Verificadas
                </a>
              </li>
              <li>
                <a
                  href="#instagram"
                  onClick={(e) => handleNavClick(e, '#instagram')}
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="#localizacao"
                  onClick={(e) => handleNavClick(e, '#localizacao')}
                  className="hover:text-white transition-colors"
                >
                  Horários & Localização
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-xs text-[#C4C4C4]">
            <span className="editorial-tag block text-white/90">Ponto de Atendimento</span>
            <p className="leading-relaxed">{addressText}</p>
            <p className="pt-1">
              WhatsApp:{' '}
              <a
                href={BUSINESS_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                {phoneText}
              </a>
            </p>
          </div>

          <div className="space-y-3 text-xs text-[#C4C4C4]">
            <span className="editorial-tag block text-white/90">Canais & Acesso</span>
            <p className="text-white font-medium">Segunda a Sábado: 20:00 às 23:30</p>
            <p className="text-[#8F0F1B]">Domingo: Encerrado</p>
            <div className="pt-3 space-y-1.5 border-t border-white/[0.08]">
              <Link
                to="/loja"
                className="block text-[#E2E8F0] hover:text-white font-medium transition-colors"
              >
                → Peça pelo App do Cliente (/loja)
              </Link>
              <Link
                to="/gestao"
                className="block text-[#C4C4C4]/70 hover:text-white transition-colors"
                title="Acesso exclusivo ao painel do operador"
              >
                ⚙ Painel de Gestão (Operador)
              </Link>
              <Link
                to="/adm-landing"
                className="block text-[#C4C4C4]/50 hover:text-white transition-colors text-[11px]"
                title="Área Administrativa da Landing Page"
              >
                ✎ Editor da Landing Page (/adm-landing)
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#C4C4C4]/70">
          <p>© {currentYear} Loyolas Lanches. Todos os direitos reservados.</p>
          <p>Pindamonhangaba - SP</p>
        </div>
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-2.5 rounded bg-[#0D1A11] hover:bg-[#8F0F1B] text-white border border-white/10 transition-colors"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </footer>
  )
}
