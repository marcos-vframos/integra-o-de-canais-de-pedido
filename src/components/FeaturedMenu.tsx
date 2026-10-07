import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import type { MenuItem } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'

import { useLandingContent } from '@/context/LandingContentContext'

export default function FeaturedMenu() {
  const { content } = useLandingContent()
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  // As categorias vêm da coleção categories ou menu do PocketBase
  const [categoriesList, setCategoriesList] = useState<string[]>([])

  const loadCategories = () => {
    pb.collection('categories')
      .getFullList({ filter: 'active = true', sort: 'order' })
      .then((cats) => {
        const names = cats
          .map((c: any) => c.name)
          .filter((n: string) => n !== 'Complementos' && n !== 'Todos')
        if (names.length > 0) {
          setCategoriesList(names)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useRealtime('categories', () => {
    loadCategories()
  })

  const availableCategories =
    categoriesList.length > 0
      ? categoriesList
      : Array.from(new Set(menuItems.map((item) => String(item.category)).filter(Boolean))).filter(
          (cat) => cat !== 'Complementos' && cat !== 'Todos',
        )

  // Se nenhuma categoria estiver selecionada e existirem categorias, seleciona a primeira
  const currentCategory: string =
    activeCategory && availableCategories.includes(activeCategory)
      ? activeCategory
      : availableCategories[0] || ''

  const loadMenuAndSettings = () => {
    Promise.all([
      pb.collection('menu').getFullList<MenuItem>({
        filter: 'active = true',
        sort: 'category,name',
      }),
      pb
        .collection('settings')
        .getFullList()
        .catch(() => []),
    ])
      .then(([items, settingsList]) => {
        setMenuItems(items)
        const openRec = (settingsList as any[]).find((s) => s.key === 'is_open')
        const forceOpenRec = (settingsList as any[]).find((s) => s.key === 'force_open')
        const forceClosedRec = (settingsList as any[]).find((s) => s.key === 'force_closed')

        if (forceOpenRec?.value === 'true') {
          setIsOpen(true)
        } else if (forceClosedRec?.value === 'true') {
          setIsOpen(false)
        } else if (openRec) {
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

  useRealtime('settings', () => {
    loadMenuAndSettings()
  })

  // Itens da categoria selecionada (excluindo Complementos do cardápio exibido)
  const filteredItems = menuItems.filter((item) => {
    if (item.category === 'Complementos') return false
    return item.category === currentCategory
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
      className="min-h-screen w-full bg-[#0A150D] text-white relative overflow-y-auto overflow-x-hidden border-b border-white/[0.06] snap-start flex items-center py-20 lg:py-24"
      aria-labelledby="cardapio-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="editorial-tag block mb-3">
            {content.menuTag || '02 / Seleção da Casa'}
          </span>
          <h2
            id="cardapio-heading"
            className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white mb-4"
          >
            {content.menuHeading || 'Cardápio em Destaque.'}
          </h2>
          <p className="text-base text-[#C4C4C4] leading-relaxed">
            {content.menuSubtitle ||
              'Preparo artesanal na hora. Feito com carinho, muito sabor e os molhos exclusivos da casa.'}
          </p>

          {!isOpen && (
            <div className="mt-4 p-3.5 rounded-md bg-[#132419] border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle size={17} className="text-amber-400 shrink-0" />
              <span>
                <b>Fechado no momento</b> — veja o cardápio e peça quando reabrirmos.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 pt-6 border-b border-white/[0.08] overflow-x-auto pb-2 scrollbar-none">
            {availableCategories.map((cat) => {
              const active = currentCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`pb-3 px-3 sm:px-4 text-xs tracking-wider uppercase font-semibold transition-colors relative whitespace-nowrap cursor-pointer rounded-t ${
                    active ? 'text-white bg-white/[0.04]' : 'text-[#C4C4C4] hover:text-white'
                  }`}
                >
                  {cat}
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
