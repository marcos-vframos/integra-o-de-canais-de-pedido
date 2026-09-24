import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  const handleScrollToMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.querySelector('#cardapio')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section
      id="inicio"
      className="relative min-h-[90vh] lg:min-h-screen bg-[#0A150D] text-white flex items-center pt-32 pb-20 lg:py-28 overflow-hidden"
      aria-label="Apresentação principal"
    >
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a3321]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 flex flex-col items-start space-y-7">
            <div className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-semibold text-[#C4C4C4]">
              <span className="w-6 h-px bg-white/20" />
              <span>Tradição & Fartura • Araretama</span>
            </div>

            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white">
              O autêntico podrão <br />
              <span className="text-[#E2E8F0] font-bold">de Pindamonhangaba.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#C4C4C4] max-w-xl leading-relaxed font-normal">
              A fartura e a essência do autêntico lanche de carrinho brasileiro. Saboroso, feito com
              carinho e acompanhado dos nossos molhos exclusivos para degustação no local — uma
              experiência única que virou referência em Pindamonhangaba.
            </p>

            <div className="text-xs text-[#C4C4C4]/90 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              <span className="text-white font-medium">
                Eleito melhor hamburgueria de Pindamonhangaba
              </span>
              <span className="text-white/30">•</span>
              <span>Pão tostado na hora</span>
              <span className="text-white/30">•</span>
              <span>Molho artesanal da casa</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                to="/loja"
                className="inline-flex items-center justify-center gap-2.5 bg-[#8F0F1B] hover:bg-[#990000] text-white font-heading font-medium text-sm tracking-wide uppercase px-7 py-3.5 rounded-md transition-colors duration-200"
              >
                <span>Fazer Pedido</span>
                <ArrowRight className="w-4 h-4 text-white/80" />
              </Link>

              <a
                href="#cardapio"
                onClick={handleScrollToMenu}
                className="inline-flex items-center justify-center gap-2 text-sm text-[#E2E8F0] hover:text-white font-medium px-4 py-3 rounded-md transition-colors group"
              >
                <span>Conhecer o cardápio</span>
                <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>

            <div className="pt-4 border-t border-white/[0.08] w-full flex items-center gap-3 text-xs text-[#C4C4C4]">
              <div className="flex items-center gap-1 text-white font-semibold">
                <span className="tabular-nums">5,0</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-white text-white" />
                  ))}
                </div>
              </div>
              <span className="text-white/30">|</span>
              <span>Classificação máxima comprovada no Google e Facebook</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-lg overflow-hidden border border-white/[0.1] bg-[#0E1B11] shadow-2xl">
              <img
                src="https://img.usecurling.com/p/800/850?q=juicy+cheeseburger+bacon"
                alt="Lanche artesanal e suculento do Loyolas Lanches"
                className="w-full h-[400px] sm:h-[480px] object-cover object-center filter contrast-[1.03]"
                loading="eager"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-[#0A150D]/95 via-[#0A150D]/60 to-transparent flex items-end justify-between">
                <div>
                  <span className="editorial-tag text-white/70 block">Destaque da Casa</span>
                  <span className="font-heading font-bold text-white text-base">
                    X-Tudo Especial
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#C4C4C4] block">a partir de</span>
                  <span className="font-heading font-semibold text-white text-base tabular-nums">
                    R$ 26,00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
