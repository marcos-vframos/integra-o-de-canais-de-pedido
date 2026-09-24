import { Award, CheckCircle2 } from 'lucide-react'

export default function Story() {
  return (
    <section
      id="historia"
      className="py-24 lg:py-32 bg-[#0C170F] text-white relative overflow-hidden border-b border-white/[0.06]"
      aria-labelledby="historia-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-5">
            <div className="relative rounded-lg overflow-hidden border border-white/[0.1] bg-[#0E1B11] shadow-xl">
              <img
                src="https://img.usecurling.com/p/800/1000?q=street+food+cart+grill"
                alt="Trajetória e dedicação no preparo do Loyolas Lanches em Araretama"
                className="w-full h-[460px] sm:h-[520px] object-cover filter contrast-[1.03]"
                loading="lazy"
              />
              <div className="p-4 bg-[#0A150D]/95 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#C4C4C4]">
                <span className="font-medium text-white">Araretama, Pindamonhangaba</span>
                <span>Mais de 18 anos de história</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col space-y-7">
            <div className="flex items-center gap-3">
              <span className="editorial-tag">01 / Origem & Filosofia</span>
            </div>

            <h2
              id="historia-heading"
              className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight"
            >
              A essência do lanche de carrinho, <br />
              <span className="text-[#C4C4C4] font-normal">com o rigor que você merece.</span>
            </h2>

            <div className="space-y-5 text-base sm:text-lg text-[#C4C4C4] leading-relaxed font-normal">
              <p>
                Há mais de 18 anos, o{' '}
                <strong className="text-white font-medium">Loyolas Lanches</strong> constrói sua
                história no coração do Araretama. Para nós, tradição é um selo insuperável: não se
                compra nem se inventa da noite para o dia, se conquista servindo com o mesmo
                respeito a cada pedido.
              </p>
              <p>
                Cada lanche carrega um sabor marcante, nascido da combinação entre ingredientes de
                verdade, fartura sem economia e receitas caseiras aperfeiçoadas ao longo de quase
                duas décadas. O capricho e a dedicação são nosso legado diário para quem confia na
                nossa cozinha.
              </p>
            </div>

            <blockquote className="pl-5 border-l-2 border-[#8F0F1B] py-1 text-base italic text-[#E2E8F0] font-serif">
              “Com aquele sabor que faz você se sentir abraçado, reunimos gerações em torno do
              autêntico podrão de Pindamonhangaba.”
              <span className="block not-italic text-xs font-semibold tracking-wider uppercase text-[#C4C4C4] mt-2 font-sans">
                — Família Loyolas Lanches
              </span>
            </blockquote>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-md card-premium">
                <div className="flex items-center gap-2.5 text-white mb-1.5">
                  <Award className="w-4 h-4 text-white/80" />
                  <h3 className="font-heading font-semibold text-sm">Eleito Melhor Hamburgueria</h3>
                </div>
                <p className="text-xs text-[#C4C4C4] leading-relaxed">
                  Reconhecido pela comunidade de Pindamonhangaba pelo sabor e fartura.
                </p>
              </div>

              <div className="p-5 rounded-md card-premium">
                <div className="flex items-center gap-2.5 text-white mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-white/80" />
                  <h3 className="font-heading font-semibold text-sm">Classificação 5,0 Real</h3>
                </div>
                <p className="text-xs text-[#C4C4C4] leading-relaxed">
                  Avaliação máxima comprovada e espontânea no Google e Facebook.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
