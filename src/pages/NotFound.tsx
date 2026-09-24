import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: Rota não encontrada:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07140B] text-[#C4C4C4] px-4 font-sans">
      <div className="text-center max-w-md p-8 rounded-2xl bg-[#0D1A11] border border-white/10 shadow-2xl">
        <h1 className="text-6xl font-heading font-black mb-3 text-white">404</h1>
        <p className="text-base text-[#C4C4C4] mb-6">Página não encontrada!</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#8F0F1B] hover:bg-[#990000] text-white font-medium text-xs tracking-wider uppercase transition-all shadow"
          >
            Início
          </Link>
          <Link
            to="/loja"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#141418] hover:bg-[#27272A] border border-[#27272A] text-white font-medium text-xs tracking-wider uppercase transition-all"
          >
            Pedir no App
          </Link>
          <Link
            to="/gestao"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#141418] hover:bg-[#27272A] border border-[#27272A] text-[#C4C4C4] hover:text-white font-medium text-xs tracking-wider uppercase transition-all"
          >
            Painel de Gestão
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
