import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import type { MenuItem } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'

export default function FeaturedMenu() {
  const [activeTab, setActiveTab] = useState<'todos' | 'lanches' | 'dogs' | 'porcoes'>('todos')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const loadMenuAndSettings = () => {
    Promise.all([
      pb.collection('menu').getFullList<MenuItem>({
        filter: 'active = true',
        sort: 'category,name',
      }),
      pb
        .collection('settings')
        .getFirstListItem('key="is_open"')
        .catch(() => null),
    ])
      .then(([items, openRec]) => {
        setMenuItems(items)
        if (openRec) {
          setIsOpen(openRec.value === 'true')
        }
      })
      .catch((err) => {
        console.warn('Falha ao carregar menu canônico para a landing:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadMenuAndSettings()
  }, [])

  useRealtime('menu', () => {
    pb.collection('menu')
      .getFullList<MenuItem>({ filter: 'active = true', sort: 'category,name' })
      .then(setMenuItems)
      .catch(() => {})
  })

  useRealtime('settings', (e) => {
    if (e.record && (e.record as any).key === 'is_open') {
      setIsOpen((e.record as any).value === 'true')
    }
  })

  // Mapeamento canônico para as tabs existentes da landing
  // Hambúrgueres -> Carnes, Frango, Gourmet, Especial
  // Hot Dogs -> Hot-Dog
  // Porções -> Combos, Complementos, Bebidas
  const filteredItems = menuItems.filter((item) => {
    if (activeTab === 'todos') return true
    if (activeTab === 'lanches') {
      return ['Carnes', 'Frango', 'Gourmet', 'Especial'].includes(item.category)
    }
    if (activeTab === 'dogs') {
      return item.category === 'Hot-Dog'
    }
    if (activeTab === 'porcoes') {
      return ['Combos', 'Complementos', 'Bebidas'].includes(item.category)
    }
    return true
  })

  // Imagens associadas por categoria ou nome para manter o visual premium
  const getImageForItem = (item: MenuItem) => {
    const nameLower = item.name.toLowerCase()
    if (nameLower.includes('dog') || item.category === 'Hot-Dog') {
      return 'https://img.usecurling.com/p/800/600?q=hot+dog+gourmet'
    }
    if (nameLower.includes('batata') || nameLower.includes('fritas')) {
      return 'https://img.usecurling.com/p/800/600?q=french+fries+cheese+bacon'
    }
    if (
      nameLower.includes('refri') ||
      nameLower.includes('suco') ||
      nameLower.includes('água') ||
      item.category === 'Bebidas'
    ) {
      return 'https://img.usecurling.com/p/800/600?q=cold+soda+can'
    }
    if (nameLower.includes('bacon')) {
      return 'https://img.usecurling.com/p/800/600?q=bacon+cheeseburger'
    }
    if (nameLower.includes('gourmet') || nameLower.includes('especial')) {
      return 'https://img.usecurling.com/p/800/600?q=gourmet+burger+bacon'
    }
    if (nameLower.includes('misto') || nameLower.includes('bauru')) {
      return 'https://img.usecurling.com/p/800/600?q=grilled+cheese+sandwich'
    }
    return 'https://img.usecurling.com/p/800/600?q=cheeseburger+melted+cheese'
  }

  return (
    <section
      id="cardapio"
      className="py-24 lg:py-32 bg-[#0A150D] text-white relative overflow-hidden border-b border-white/[0.06]"
      aria-labelledby="cardapio-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="editorial-tag block mb-3">02 / Seleção da Casa</span>
          <h2
            id="cardapio-heading"
            className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white mb-4"
          >
            Cardápio em Destaque.
          </h2>
          <p className="text-base text-[#C4C4C4] leading-relaxed">
            Preparo artesanal na hora. Feito com carinho, muito sabor e os molhos exclusivos da
            casa. Preços atualizados diretamente da nossa cozinha em tempo real.
          </p>

          {!isOpen && (
            <div className="mt-4 p-3.5 rounded-md bg-[#132419] border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle size={17} className="text-amber-400 shrink-0" />
              <span>
                <b>Fechado no momento</b> — veja o cardápio e peça quando reabrirmos.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-6 border-b border-white/[0.08]">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'lanches', label: 'Hambúrgueres' },
              { id: 'dogs', label: 'Hot Dogs' },
              { id: 'porcoes', label: 'Porções & Bebidas' },
            ].map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`pb-3 text-xs tracking-wider uppercase font-semibold transition-colors relative cursor-pointer ${
                    active ? 'text-white' : 'text-[#C4C4C4] hover:text-white'
                  }`}
                >
                  {tab.label}
                  {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#8F0F1B]" />}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#C4C4C4]">Carregando cardápio atualizado...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-[#C4C4C4] text-sm">
            Nenhum item disponível nesta categoria no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group bg-[#0D1A11] rounded-md overflow-hidden border border-white/[0.08] hover:border-white/[0.18] transition-all flex flex-col justify-between"
              >
                <div className="relative h-52 sm:h-56 overflow-hidden bg-[#0A150D]">
                  <img
                    src={getImageForItem(item)}
                    alt={item.name}
                    className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 filter contrast-[1.03]"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 bg-[#0A150D]/90 text-[10px] tracking-wider uppercase font-medium text-white px-2.5 py-1 rounded border border-white/10">
                    {item.category}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="font-heading font-semibold text-lg text-white group-hover:text-white transition-colors">
                        {item.name}
                      </h3>
                      <span className="font-heading font-semibold text-base text-white tabular-nums shrink-0">
                        {fmtBRL(item.price)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#C4C4C4] leading-relaxed">
                      Lanche chapeado artesanalmente com ingredientes frescos e sabor incomparável.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-[#C4C4C4]/70">Feito na chapa</span>
                    <Link
                      to="/loja"
                      className="inline-flex items-center gap-1.5 text-xs text-white hover:text-[#C4C4C4] font-medium tracking-wide uppercase transition-colors"
                      aria-label={`Pedir ${item.name} na loja`}
                    >
                      <span>Pedir</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
