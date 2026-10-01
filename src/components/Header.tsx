import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import { BUSINESS_INFO, checkIsOpenNow } from '@/data/loyolasData'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'

interface HeaderProps {
  activeSection?: string
}

const navLinks = [
  { href: '#inicio', label: 'Início', id: 'inicio' },
  { href: '#historia', label: 'Origem', id: 'historia' },
  { href: '#cardapio', label: 'Cardápio', id: 'cardapio' },
  { href: '#avaliacoes', label: 'Avaliações', id: 'avaliacoes' },
  { href: '#instagram', label: 'Instagram', id: 'instagram' },
  { href: '#localizacao', label: 'Horários & Ponto', id: 'localizacao' },
]

export default function Header({ activeSection = 'inicio' }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [status, setStatus] = useState(() => checkIsOpenNow())
  const [isOpenSetting, setIsOpenSetting] = useState<boolean>(true)
  const [forceOpen, setForceOpen] = useState<boolean>(false)
  const [forceClosed, setForceClosed] = useState<boolean>(false)

  const checkStatus = () => {
    setStatus(checkIsOpenNow())
  }

  const loadSettings = () => {
    pb.collection('settings')
      .getFullList()
      .then((records) => {
        const openRec = records.find((r) => r.key === 'is_open')
        const foRec = records.find((r) => r.key === 'force_open')
        const fcRec = records.find((r) => r.key === 'force_closed')
        if (openRec) setIsOpenSetting(openRec.value === 'true')
        setForceOpen(foRec?.value === 'true')
        setForceClosed(fcRec?.value === 'true')
      })
      .catch(() => {})
  }

  useEffect(() => {
    const container = document.getElementById('landing-container')
    const handleScroll = () => {
      const top = container ? container.scrollTop : window.scrollY
      setIsScrolled(top > 40)
    }
    handleScroll()
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

  useEffect(() => {
    checkStatus()
    loadSettings()
    const interval = setInterval(checkStatus, 30000)

    const handleFocus = () => {
      checkStatus()
      loadSettings()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [])

  useRealtime('settings', () => {
    loadSettings()
  })

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const actuallyOpen = forceOpen ? true : forceClosed ? false : status.isOpen && isOpenSetting

  return (
    <>
      <header
        role="banner"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0A150D]/95 backdrop-blur-md border-b border-white/[0.07] py-3.5 shadow-lg shadow-black/40'
            : 'bg-transparent border-b border-transparent py-5 sm:py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a
            href="#inicio"
            onClick={(e) => handleNavClick(e, '#inicio')}
            className="flex flex-col group cursor-pointer focus-visible:outline-none"
            aria-label="Loyolas Lanches - Início"
          >
            <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-white leading-tight">
              Loyolas Lanches
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-[#C4C4C4]/80 transition-colors group-hover:text-white">
              Pindamonhangaba • SP
            </span>
          </a>

          <nav
            role="navigation"
            aria-label="Navegação principal"
            className="hidden lg:flex items-center gap-7 text-xs tracking-wider uppercase font-medium"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`transition-colors py-1 ${
                    isActive ? 'text-white font-semibold' : 'text-[#C4C4C4] hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-4">
            <div className="hidden xl:flex items-center gap-2 text-xs text-[#C4C4C4] border-r border-white/10 pr-4">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  actuallyOpen ? 'bg-[#34D399]' : 'bg-[#8F0F1B]'
                }`}
              />
              <span className="tracking-wide">
                {actuallyOpen ? status.statusText : 'Fechado no momento'}
              </span>
            </div>
            <Link
              to="/loja"
              className="inline-flex items-center gap-2 bg-[#8F0F1B] hover:bg-[#990000] text-white font-heading font-medium text-xs tracking-wide uppercase px-4 py-2.5 rounded-md transition-all duration-200 border border-[#8F0F1B] hover:border-[#990000]"
            >
              <span>Fazer Pedido</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:text-[#C4C4C4] transition-colors focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0A150D]/98 backdrop-blur-lg lg:hidden flex flex-col justify-between pt-24 pb-8 px-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div className="flex flex-col space-y-1">
            <span className="editorial-tag mb-3 block">Navegação</span>
            {navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`text-base font-heading py-3 border-b border-white/[0.06] flex items-center justify-between ${
                    isActive ? 'text-white font-semibold' : 'text-[#C4C4C4]'
                  }`}
                >
                  <span>{link.label}</span>
                  <span className="text-xs text-[#C4C4C4]/50">→</span>
                </a>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 pt-6 border-t border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs text-[#C4C4C4] mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  actuallyOpen ? 'bg-[#34D399]' : 'bg-[#8F0F1B]'
                }`}
              />
              <span>
                {actuallyOpen ? status.statusText : 'Fechado no momento'} • {status.nextInfo}
              </span>
            </div>
            <Link
              to="/loja"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full bg-[#8F0F1B] hover:bg-[#990000] text-white font-heading font-medium text-sm tracking-wide uppercase px-5 py-3 rounded-md text-center transition-colors flex items-center justify-center gap-2"
            >
              <span>Fazer Pedido Online</span>
              <ArrowUpRight className="w-4 h-4 text-white/80" />
            </Link>
            <p className="text-center text-xs text-[#C4C4C4]/70 pt-1">
              Seg a Sáb: 20:00 às 23:30 • Araretama, Pindamonhangaba
            </p>
          </div>
        </div>
      )}
    </>
  )
}
