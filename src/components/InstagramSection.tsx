import { ArrowUpRight } from 'lucide-react'
import { BUSINESS_INFO } from '@/data/loyolasData'

interface FeedPost {
  id: string
  image: string
  alt: string
  caption: string
}

const FEED_POSTS: FeedPost[] = [
  {
    id: 'post-1',
    image: 'https://img.usecurling.com/p/600/600?q=gourmet+burger+bacon',
    alt: 'X-Tudo artesanal do Loyolas Lanches',
    caption: 'X-Tudo tradicional com ingredientes selecionados, feito com carinho.',
  },
  {
    id: 'post-2',
    image: 'https://img.usecurling.com/p/600/600?q=cheeseburger+melted+cheese',
    alt: 'Hambúrguer com blend bovino suculento e queijo',
    caption: 'Preparo artesanal na hora. Muito sabor no ponto exato.',
  },
  {
    id: 'post-3',
    image: 'https://img.usecurling.com/p/600/600?q=hot+dog+gourmet',
    alt: 'Cachorro-quente prensado tradicional',
    caption: 'Dogão prensado com purê artesanal e 2 salsichas.',
  },
  {
    id: 'post-4',
    image: 'https://img.usecurling.com/p/600/600?q=french+fries+cheese+bacon',
    alt: 'Batata frita crocante com cheddar e cubinhos de bacon',
    caption: 'Porção de fritas sequinha e crocante.',
  },
  {
    id: 'post-5',
    image: 'https://img.usecurling.com/p/600/600?q=bacon+cheeseburger',
    alt: 'X-Bacon artesanal com fatias de bacon',
    caption: 'Bacon tostadinho e hambúrguer no ponto.',
  },
  {
    id: 'post-6',
    image: 'https://img.usecurling.com/p/600/600?q=grilled+cheese+sandwich',
    alt: 'Misto quente da praça dourado',
    caption: 'Clássico da praça com queijo saboroso.',
  },
]

export default function InstagramSection() {
  return (
    <section
      id="instagram"
      className="py-24 lg:py-32 bg-[#0C170F] text-white relative overflow-hidden border-b border-white/[0.06]"
      aria-labelledby="instagram-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div className="max-w-xl">
            <span className="editorial-tag block mb-3">04 / Redes Sociais</span>
            <h2
              id="instagram-heading"
              className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white"
            >
              @loyolass_lanches
            </h2>
            <p className="text-base text-[#C4C4C4] mt-3 leading-relaxed">
              Acompanhe os bastidores da nossa cozinha, os lanches da noite e novidades no Instagram
              oficial.
            </p>
          </div>

          <a
            href={BUSINESS_INFO.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-heading font-medium tracking-wide uppercase text-white hover:text-[#C4C4C4] transition-colors self-start sm:self-auto"
          >
            <span>Seguir no Instagram</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {FEED_POSTS.map((post) => (
            <a
              key={post.id}
              href={BUSINESS_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group aspect-square rounded-md overflow-hidden bg-[#0A150D] border border-white/[0.08] hover:border-white/[0.2] transition-colors relative"
              aria-label={post.caption}
            >
              <img
                src={post.image}
                alt={post.alt}
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 filter contrast-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#0A150D]/80 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-left">
                <p className="text-[11px] text-white line-clamp-3 leading-snug">{post.caption}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
