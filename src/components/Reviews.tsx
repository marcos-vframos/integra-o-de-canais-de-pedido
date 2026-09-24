import { Star, ArrowUpRight } from 'lucide-react'
import { BUSINESS_INFO, VERIFIED_RATINGS } from '@/data/loyolasData'

export default function Reviews() {
  return (
    <section
      id="avaliacoes"
      className="py-24 lg:py-32 bg-[#0C170F] text-white relative overflow-hidden border-b border-white/[0.06]"
      aria-labelledby="avaliacoes-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="editorial-tag block mb-3">03 / Prova Social</span>
          <h2
            id="avaliacoes-heading"
            className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white mb-4"
          >
            Avaliações Oficiais.
          </h2>
          <p className="text-base text-[#C4C4C4] leading-relaxed">
            Sem depoimentos inventados. Dados reais e públicos registrados diretamente pelos
            clientes no Google Meu Negócio e no Facebook.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {VERIFIED_RATINGS.map((item) => (
            <div
              key={item.platform}
              className="bg-[#0D1A11] p-7 sm:p-8 rounded-md border border-white/[0.08] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-white">
                      {item.platform}
                    </h3>
                    <p className="text-xs text-[#C4C4C4] mt-0.5">Canal oficial verificado</p>
                  </div>
                  <span className="text-xs tracking-wider uppercase font-medium text-white/80 bg-white/[0.05] px-2.5 py-1 rounded">
                    {item.badge}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-heading font-extrabold text-4xl sm:text-5xl text-white tabular-nums">
                    {item.rating.toFixed(1).replace('.', ',')}
                  </span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-white text-white" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#C4C4C4] font-medium mb-3">{item.reviewsText}</p>
                <p className="text-sm text-[#C4C4C4] leading-relaxed">{item.description}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-[#C4C4C4]/70">100% positivo</span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-white hover:text-[#C4C4C4] font-medium tracking-wide uppercase transition-colors"
                >
                  <span>{item.ctaText}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-4xl text-xs text-[#C4C4C4]">
          <div>
            <p className="text-white font-medium">Já provou nosso podrão?</p>
            <p className="mt-0.5">
              Deixe sua avaliação espontânea no Google Maps e fortaleça nosso trabalho.
            </p>
          </div>
          <a
            href={BUSINESS_INFO.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-white hover:text-[#C4C4C4] font-medium tracking-wide uppercase transition-colors shrink-0"
          >
            <span>Avaliar no Google Maps</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}
