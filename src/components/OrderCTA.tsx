import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import { useLandingContent } from '@/context/LandingContentContext'

export default function OrderCTA() {
  const { content } = useLandingContent()
  const handleScrollToMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.querySelector('#cardapio')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const ctaTag = content.ctaTag || '05 / Pedidos & Delivery'
  const ctaHeading = content.ctaHeading || 'Pronto para provar o verdadeiro podrão?'
  const ctaDescription =
    content.ctaDescription ||
    'Peça diretamente pelo nosso aplicativo de pedidos. Atendimento rápido, lanche chapeado na hora e entrega em Pindamonhangaba.'
  const ctaButtonText = content.ctaButtonText || 'Fazer Pedido Agora'

  return (
    <section
      className="min-h-screen w-full bg-[#0A150D] text-white border-b border-white/[0.06] snap-start flex items-center justify-center py-20 lg:py-24"
      aria-labelledby="order-cta-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 my-auto">
        <span className="editorial-tag block">{ctaTag}</span>
        <h2
          id="order-cta-heading"
          className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight"
        >
          {ctaHeading}
        </h2>
        <p className="text-base sm:text-lg text-[#C4C4C4] max-w-xl mx-auto leading-relaxed font-normal">
          {ctaDescription}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
          <Link
            to="/loja"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#8F0F1B] hover:bg-[#990000] text-white font-heading font-medium text-sm tracking-wide uppercase px-8 py-3.5 rounded-md transition-colors duration-200"
          >
            <span>{ctaButtonText}</span>
            <ArrowUpRight className="w-4 h-4 text-white/80" />
          </Link>

          <a
            href="#cardapio"
            onClick={handleScrollToMenu}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm text-[#C4C4C4] hover:text-white font-medium px-6 py-3.5 transition-colors group"
          >
            <span>Rever Cardápio</span>
            <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>

        <div className="pt-10 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-2xl mx-auto text-xs text-[#C4C4C4]">
          <div>
            <span className="font-heading font-semibold text-white block mb-0.5">
              Preparo na Hora
            </span>
            <span>Feito com capricho a cada pedido.</span>
          </div>
          <div>
            <span className="font-heading font-semibold text-white block mb-0.5">
              Pagamento Simples
            </span>
            <span>Pix, cartões ou dinheiro na entrega.</span>
          </div>
          <div>
            <span className="font-heading font-semibold text-white block mb-0.5">
              Entrega em Pinda
            </span>
            <span>Araretama e bairros vizinhos.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
