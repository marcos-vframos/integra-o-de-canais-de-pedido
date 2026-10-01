import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, Sparkles, ChevronDown } from 'lucide-react'

// Conjunto de imagens para o crossfade suave em loop contínuo
const HERO_SLIDES = [
  {
    image: 'https://img.usecurling.com/p/800/850?q=juicy+cheeseburger+bacon',
    title: 'X-Tudo Especial',
    price: 'R$ 26,00',
    tag: 'Destaque da Casa',
    subtitle: 'Hambúrguer bovino, bacon crocante, presunto, queijo derretido, ovo e milho',
  },
  {
    image: 'https://img.usecurling.com/p/800/850?q=gourmet+burger+bacon',
    title: 'X-Contra-Filé Tudo',
    price: 'R$ 32,00',
    tag: 'Mais Pedido',
    subtitle: 'Contra-filé fatiado na chapa, queijo, calabresa, bacon crocante e molho especial',
  },
  {
    image: 'https://img.usecurling.com/p/800/850?q=hot+dog+gourmet',
    title: 'Dogão Prensado Especial',
    price: 'R$ 18,00',
    tag: 'Tradição da Praça',
    subtitle: '2 salsichas, purê artesanal da casa, batata palha e queijo derretido',
  },
  {
    image: 'https://img.usecurling.com/p/800/850?q=cheeseburger+melted+cheese',
    title: 'X-Bacon Supremo',
    price: 'R$ 24,00',
    tag: 'Sabor Incomparável',
    subtitle: 'Fartura de bacon artesanal chapeado na hora com queijo cremoso',
  },
]

// Textos alternados do Hero que trocam automaticamente com animação suave
const HERO_HEADLINES = [
  {
    prefix: 'O autêntico podrão',
    highlight: 'de Pindamonhangaba.',
    description:
      'A fartura e a essência do autêntico lanche de carrinho brasileiro. Saboroso, feito com carinho e acompanhado dos nossos molhos exclusivos para degustação no local — uma experiência única que virou referência em Pindamonhangaba.',
    badge: 'Melhor Hamburgueria de Pindamonhangaba',
  },
  {
    prefix: 'Fartura na chapa,',
    highlight: 'sabor inesquecível.',
    description:
      'Ingredientes selecionados todos os dias, carnes generosas no ponto ideal e aquele pão tostado quentinho na manteiga que só quem conhece sabe o valor.',
    badge: 'Mais de 18 anos de história e tradição',
  },
  {
    prefix: 'Molhos artesanais',
    highlight: 'e capricho de verdade.',
    description:
      'Da maionese temperada da casa até o clássico podrão prensado: cada pedido é montado na hora com dedicação e aquele respeito incondicional a cada mordida.',
    badge: 'Nota máxima 5,0 no Google e Facebook',
  },
  {
    prefix: 'Do nosso balcão',
    highlight: 'direto para você.',
    description:
      'Ponto acolhedor no Araretama para comer com a família e amigos, ou delivery rápido e seguro entregue quentinho onde você estiver.',
    badge: 'Entrega rápida em Pindamonhangaba',
  },
]

import { useLandingContent } from '@/context/LandingContentContext'

export default function Hero() {
  const { content } = useLandingContent()
  const headlines = content.headlines?.length > 0 ? content.headlines : HERO_HEADLINES
  const slides = content.heroSlides?.length > 0 ? content.heroSlides : HERO_SLIDES
  const chips =
    content.heroSubtitleChips?.length > 0
      ? content.heroSubtitleChips
      : [
          'Eleito melhor hamburgueria de Pindamonhangaba',
          'Pão tostado na hora',
          'Molho artesanal da casa',
        ]

  const [slideIndex, setSlideIndex] = useState(0)
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')

  // Alterna o headline com transição suave
  useEffect(() => {
    if (headlines.length === 0) return
    const textInterval = setInterval(() => {
      setFadeState('out')
      setTimeout(() => {
        setHeadlineIndex((prev) => (prev + 1) % headlines.length)
        setFadeState('in')
      }, 400)
    }, 5500)

    return () => clearInterval(textInterval)
  }, [headlines.length])

  // Alterna o slide de imagens com crossfade contínuo a cada 4.5s
  useEffect(() => {
    if (slides.length === 0) return
    const slideInterval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length)
    }, 4500)

    return () => clearInterval(slideInterval)
  }, [slides.length])

  const handleScrollToMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.querySelector('#cardapio')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const safeHeadlineIndex = headlineIndex < headlines.length ? headlineIndex : 0
  const currentHeadline = headlines[safeHeadlineIndex] || HERO_HEADLINES[0]
  const traditionBadge = content.traditionBadge || 'TRADIÇÃO & ESSÊNCIA'

  return (
    <section
      id="inicio"
      className="relative min-h-screen w-full bg-[#0A150D] text-white flex items-center justify-center pt-24 pb-12 lg:py-0 overflow-hidden snap-start"
      aria-label="Apresentação principal"
    >
      {/* Luz ambiente oliva/vinho no fundo */}
      <div className="absolute top-1/4 right-1/4 w-[550px] h-[550px] bg-[#1a3321]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-[#8F0F1B]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-8 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Lado Esquerdo: Textos alternados */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 sm:space-y-7">
            {/* Tag solicitada no item 3: TRADIÇÃO & ESSÊNCIA */}
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] uppercase font-semibold text-[#C4C4C4]">
              <span className="w-8 h-px bg-[#8F0F1B]" />
              <span className="text-[#E2E8F0] tracking-[0.24em]">{traditionBadge}</span>
              <span className="w-2 h-2 rounded-full bg-[#8F0F1B]/80 animate-pulse" />
            </div>

            {/* Headline com troca automática e transição fluida */}
            <div className="min-h-[170px] sm:min-h-[190px] lg:min-h-[210px] flex flex-col justify-center">
              <div
                className={`transition-all duration-500 ease-out transform ${
                  fadeState === 'in'
                    ? 'opacity-100 translate-y-0 filter blur-0'
                    : 'opacity-0 -translate-y-2 filter blur-[2px]'
                }`}
              >
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white">
                  {currentHeadline.prefix} <br />
                  <span className="text-[#E2E8F0] font-bold underline decoration-[#8F0F1B]/60 decoration-wavy decoration-2 underline-offset-8">
                    {currentHeadline.highlight}
                  </span>
                </h1>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-[#C4C4C4] max-w-xl leading-relaxed font-normal">
                  {currentHeadline.description}
                </p>
              </div>
            </div>

            {/* Indicadores de frases alternadas */}
            <div className="flex items-center gap-2 pt-1">
              {headlines.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setFadeState('out')
                    setTimeout(() => {
                      setHeadlineIndex(i)
                      setFadeState('in')
                    }, 250)
                  }}
                  aria-label={`Ver mensagem ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    safeHeadlineIndex === i
                      ? 'w-8 bg-[#8F0F1B]'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
              <span className="ml-2 text-[11px] uppercase tracking-wider text-[#C4C4C4]/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#E2E8F0]" />
                {currentHeadline?.badge}
              </span>
            </div>

            {/* Selos de destaque */}
            <div className="text-xs text-[#C4C4C4]/90 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              {chips.map((chip, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-white/30">•</span>}
                  <span className={idx === 0 ? 'text-white font-medium' : ''}>{chip}</span>
                </React.Fragment>
              ))}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                to="/loja"
                className="inline-flex items-center justify-center gap-2.5 bg-[#8F0F1B] hover:bg-[#990000] text-white font-heading font-medium text-sm tracking-wide uppercase px-7 py-3.5 rounded-md transition-all duration-200 shadow-lg shadow-[#8F0F1B]/30 hover:shadow-[#8F0F1B]/50 hover:scale-[1.02] active:scale-[0.99]"
              >
                <span>Fazer Pedido</span>
                <ArrowRight className="w-4 h-4 text-white/90" />
              </Link>

              <a
                href="#cardapio"
                onClick={handleScrollToMenu}
                className="inline-flex items-center justify-center gap-2 text-sm text-[#E2E8F0] hover:text-white font-medium px-4 py-3 rounded-md transition-colors group border border-white/10 hover:border-white/30 bg-white/[0.03]"
              >
                <span>Conhecer o cardápio</span>
                <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>

            {/* Avaliação social */}
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

          {/* Lado Direito: Carrossel com CROSSFADE suave entre imagens em loop */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-xl overflow-hidden border border-white/[0.12] bg-[#0E1B11] shadow-2xl h-[380px] sm:h-[460px] lg:h-[500px]">
              {slides.map((slide, idx) => {
                const isActive = slideIndex === idx
                return (
                  <div
                    key={idx}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className={`w-full h-full object-cover object-center filter contrast-[1.05] transition-transform duration-[6000ms] ease-out ${
                        isActive ? 'scale-105' : 'scale-100'
                      }`}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />

                    {/* Gradiente escuro para legibilidade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A150D]/95 via-[#0A150D]/40 to-transparent" />

                    {/* Card de informações sobreposto */}
                    <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="editorial-tag text-emerald-400 font-bold bg-[#0A150D]/80 px-2.5 py-1 rounded border border-white/10">
                          {slide.tag}
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-[#C4C4C4] block">
                            a partir de
                          </span>
                          <span className="font-heading font-extrabold text-[#F3F4F6] text-lg sm:text-xl tabular-nums">
                            {slide.price}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-heading font-bold text-white text-lg sm:text-xl">
                          {slide.title}
                        </h3>
                        <p className="text-xs text-[#C4C4C4] line-clamp-1 mt-0.5">
                          {slide.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Botões seletores de imagem na parte superior */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#0A150D]/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      slideIndex === i ? 'w-5 bg-[#8F0F1B]' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Dica de rolagem sutil no Hero */}
            <div className="hidden lg:flex items-center justify-center gap-2 mt-4 text-[11px] uppercase tracking-widest text-[#C4C4C4]/50">
              <span>Role para explorar tela a tela</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
