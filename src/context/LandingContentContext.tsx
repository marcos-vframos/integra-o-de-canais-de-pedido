import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { BUSINESS_INFO, VERIFIED_RATINGS } from '@/data/loyolasData'

export interface LandingSlide {
  image: string
  title: string
  price: string
  tag: string
  subtitle: string
}

export interface LandingHeadline {
  prefix: string
  highlight: string
  description: string
  badge: string
}

export interface LandingFeedPost {
  id: string
  image: string
  alt: string
  caption: string
}

export interface LandingThemeColors {
  bgPrimary: string // default: #07140B
  bgSecondary: string // default: #0A150D
  bgCard: string // default: #0D1A11
  accentVinho: string // default: #8F0F1B
  accentVinhoHover: string // default: #990000
  accentSilver: string // default: #C4C4C4
}

export interface LandingThemePreset {
  id: string
  name: string
  colors: LandingThemeColors
}

export interface LandingContentState {
  // Hero
  traditionBadge: string
  headlines: LandingHeadline[]
  heroSlides: LandingSlide[]
  heroSubtitleChips: string[]

  // Story
  storyHeadingPrefix: string
  storyHeadingHighlight: string
  storyP1: string
  storyP2: string
  storyQuote: string
  storyQuoteAuthor: string
  storyImage: string
  storyImages?: string[]
  storyCard1Title: string
  storyCard1Desc: string
  storyCard2Title: string
  storyCard2Desc: string

  // Featured menu section
  menuTag: string
  menuHeading: string
  menuSubtitle: string

  // Reviews
  reviewsTag: string
  reviewsHeading: string
  reviewsSubtitle: string
  reviewsItems: typeof VERIFIED_RATINGS

  // Instagram
  instagramTag: string
  instagramHeading: string
  instagramSubtitle: string
  instagramPosts: LandingFeedPost[]

  // Order CTA
  ctaTag: string
  ctaHeading: string
  ctaDescription: string
  ctaButtonText: string
  ctaImages?: string[]

  // Location / Hours
  locationTag: string
  locationHeading: string
  locationSubtitle: string
  addressText: string
  phoneText: string

  // Footer
  footerDesc: string

  // Themes
  activeThemeId: string
  activeColors: LandingThemeColors
  themePresets: LandingThemePreset[]
}

export const DEFAULT_THEME_COLORS: LandingThemeColors = {
  bgPrimary: '#07140B',
  bgSecondary: '#0A150D',
  bgCard: '#0D1A11',
  accentVinho: '#8F0F1B',
  accentVinhoHover: '#990000',
  accentSilver: '#C4C4C4',
}

export const DEFAULT_THEME_PRESETS: LandingThemePreset[] = [
  {
    id: 'padrao',
    name: 'Padrão (Oliva / Vinho / Prata)',
    colors: DEFAULT_THEME_COLORS,
  },
  {
    id: 'promocao',
    name: 'Promoção Quente (Vermelho Intenso)',
    colors: {
      bgPrimary: '#140707',
      bgSecondary: '#1C0B0B',
      bgCard: '#240F0F',
      accentVinho: '#DC2626',
      accentVinhoHover: '#B91C1C',
      accentSilver: '#FCA5A5',
    },
  },
  {
    id: 'natal',
    name: 'Natal & Festas (Dourado & Vinho)',
    colors: {
      bgPrimary: '#0D1610',
      bgSecondary: '#142018',
      bgCard: '#1B2A20',
      accentVinho: '#9B111E',
      accentVinhoHover: '#7F0D18',
      accentSilver: '#D4AF37',
    },
  },
  {
    id: 'black-friday',
    name: 'Black Especial (Total Escuro & Amarelo)',
    colors: {
      bgPrimary: '#050505',
      bgSecondary: '#0F0F0F',
      bgCard: '#181818',
      accentVinho: '#EAB308',
      accentVinhoHover: '#CA8A04',
      accentSilver: '#E5E5E5',
    },
  },
]

export const DEFAULT_LANDING_CONTENT: LandingContentState = {
  traditionBadge: 'TRADIÇÃO & ESSÊNCIA',
  headlines: [
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
  ],
  heroSlides: [
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
  ],
  heroSubtitleChips: [
    'Eleito melhor hamburgueria de Pindamonhangaba',
    'Pão tostado na hora',
    'Molho artesanal da casa',
  ],

  // Story
  storyHeadingPrefix: 'A essência do lanche de carrinho,',
  storyHeadingHighlight: 'com o rigor que você merece.',
  storyP1:
    'Há mais de 18 anos, o Loyolas Lanches constrói sua história no coração do Araretama. Para nós, tradição é um selo insuperável: não se compra nem se inventa da noite para o dia, se conquista servindo com o mesmo respeito a cada pedido.',
  storyP2:
    'Cada lanche carrega um sabor marcante, nascido da combinação entre ingredientes de verdade, fartura sem economia e receitas caseiras aperfeiçoadas ao longo de quase duas décadas. O capricho e a dedicação são nosso legado diário para quem confia na nossa cozinha.',
  storyQuote:
    '“Com aquele sabor que faz você se sentir abraçado, reunimos gerações em torno do autêntico podrão de Pindamonhangaba.”',
  storyQuoteAuthor: '— Família Loyolas Lanches',
  storyImage: 'https://img.usecurling.com/p/800/1000?q=street+food+cart+grill',
  storyImages: [
    'https://img.usecurling.com/p/800/1000?q=street+food+cart+grill',
    'https://img.usecurling.com/p/800/1000?q=grill+burger+flames',
  ],
  storyCard1Title: 'Eleito Melhor Hamburgueria',
  storyCard1Desc: 'Reconhecido pela comunidade de Pindamonhangaba pelo sabor e fartura.',
  storyCard2Title: 'Classificação 5,0 Real',
  storyCard2Desc: 'Avaliação máxima comprovada e espontânea no Google e Facebook.',

  // Featured Menu
  menuTag: '02 / Seleção da Casa',
  menuHeading: 'Cardápio em Destaque.',
  menuSubtitle:
    'Preparo artesanal na hora. Feito com carinho, muito sabor e os molhos exclusivos da casa.',

  // Reviews
  reviewsTag: '03 / Prova Social',
  reviewsHeading: 'Avaliações Oficiais.',
  reviewsSubtitle:
    'Sem depoimentos inventados. Dados reais e públicos registrados diretamente pelos clientes no Google Meu Negócio e no Facebook.',
  reviewsItems: VERIFIED_RATINGS,

  // Instagram
  instagramTag: '04 / Redes Sociais',
  instagramHeading: '@loyolass_lanches',
  instagramSubtitle:
    'Acompanhe os bastidores da nossa cozinha, os lanches da noite e novidades no Instagram oficial.',
  instagramPosts: [
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
  ],

  // Order CTA
  ctaTag: '05 / Pedidos & Delivery',
  ctaHeading: 'Pronto para provar o verdadeiro podrão?',
  ctaDescription:
    'Peça diretamente pelo nosso aplicativo de pedidos. Atendimento rápido, lanche chapeado na hora e entrega em Pindamonhangaba.',
  ctaButtonText: 'Fazer Pedido Agora',
  ctaImages: [
    'https://img.usecurling.com/p/800/600?q=juicy+cheeseburger+bacon',
    'https://img.usecurling.com/p/800/600?q=french+fries+cheese+bacon',
  ],

  // Location / Hours
  locationTag: '06 / Ponto & Atendimento',
  locationHeading: 'Localização e Horários.',
  locationSubtitle:
    'Ponto físico no Araretama e atendimento delivery em Pindamonhangaba via aplicativo e WhatsApp.',
  addressText: BUSINESS_INFO.address,
  phoneText: BUSINESS_INFO.phoneDisplay,

  // Footer
  footerDesc:
    'O autêntico podrão brasileiro com mais de 18 anos de tradição. Fartura, saboroso, feito com carinho e ingredientes selecionados com capricho.',

  // Themes
  activeThemeId: 'padrao',
  activeColors: DEFAULT_THEME_COLORS,
  themePresets: DEFAULT_THEME_PRESETS,
}

interface LandingContextValue {
  content: LandingContentState
  loading: boolean
  refresh: () => Promise<void>
  saveSection: (section: string, data: any, imageFile?: File | null) => Promise<void>
  saveTheme: (
    themeId: string,
    colors: LandingThemeColors,
    presets?: LandingThemePreset[],
  ) => Promise<void>
  applyPreset: (presetId: string) => Promise<void>
  getFileUrl: (record: any, filename: string) => string
}

const LandingContext = createContext<LandingContextValue | null>(null)

export function LandingProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<LandingContentState>(DEFAULT_LANDING_CONTENT)
  const [loading, setLoading] = useState(true)

  const getFileUrl = (record: any, filename: string) => {
    if (!record || !filename) return ''
    return pb.files.getURL(record, filename)
  }

  const loadContent = async () => {
    try {
      const records = await pb.collection('landing_content').getFullList({
        sort: 'section',
      })

      if (records.length === 0) {
        setLoading(false)
        return
      }

      setContent((prev) => {
        const next: LandingContentState = { ...prev }

        records.forEach((rec) => {
          const section = rec.section
          const data = (rec.data || {}) as any
          const imageFilename = rec.image

          if (section === 'hero') {
            if (data.traditionBadge) next.traditionBadge = data.traditionBadge
            if (Array.isArray(data.headlines) && data.headlines.length > 0) {
              next.headlines = data.headlines
            }
            if (Array.isArray(data.heroSlides) && data.heroSlides.length > 0) {
              next.heroSlides = data.heroSlides
            }
            if (Array.isArray(data.heroSubtitleChips)) {
              next.heroSubtitleChips = data.heroSubtitleChips
            }
          } else if (section === 'story') {
            if (data.storyHeadingPrefix) next.storyHeadingPrefix = data.storyHeadingPrefix
            if (data.storyHeadingHighlight) next.storyHeadingHighlight = data.storyHeadingHighlight
            if (data.storyP1) next.storyP1 = data.storyP1
            if (data.storyP2) next.storyP2 = data.storyP2
            if (data.storyQuote) next.storyQuote = data.storyQuote
            if (data.storyQuoteAuthor) next.storyQuoteAuthor = data.storyQuoteAuthor
            if (imageFilename) {
              next.storyImage = pb.files.getURL(rec, imageFilename)
            } else if (data.storyImage) {
              next.storyImage = data.storyImage
            }
            if (Array.isArray(data.storyImages) && data.storyImages.length > 0) {
              next.storyImages = data.storyImages
            } else if (next.storyImage) {
              next.storyImages = [next.storyImage]
            }
            if (data.storyCard1Title) next.storyCard1Title = data.storyCard1Title
            if (data.storyCard1Desc) next.storyCard1Desc = data.storyCard1Desc
            if (data.storyCard2Title) next.storyCard2Title = data.storyCard2Title
            if (data.storyCard2Desc) next.storyCard2Desc = data.storyCard2Desc
          } else if (section === 'menu_header') {
            if (data.menuTag) next.menuTag = data.menuTag
            if (data.menuHeading) next.menuHeading = data.menuHeading
            if (data.menuSubtitle) next.menuSubtitle = data.menuSubtitle
          } else if (section === 'reviews') {
            if (data.reviewsTag) next.reviewsTag = data.reviewsTag
            if (data.reviewsHeading) next.reviewsHeading = data.reviewsHeading
            if (data.reviewsSubtitle) next.reviewsSubtitle = data.reviewsSubtitle
          } else if (section === 'instagram') {
            if (data.instagramTag) next.instagramTag = data.instagramTag
            if (data.instagramHeading) next.instagramHeading = data.instagramHeading
            if (data.instagramSubtitle) next.instagramSubtitle = data.instagramSubtitle
            if (Array.isArray(data.instagramPosts) && data.instagramPosts.length > 0) {
              next.instagramPosts = data.instagramPosts
            }
          } else if (section === 'order_cta') {
            if (data.ctaTag) next.ctaTag = data.ctaTag
            if (data.ctaHeading) next.ctaHeading = data.ctaHeading
            if (data.ctaDescription) next.ctaDescription = data.ctaDescription
            if (data.ctaButtonText) next.ctaButtonText = data.ctaButtonText
            if (Array.isArray(data.ctaImages) && data.ctaImages.length > 0) {
              next.ctaImages = data.ctaImages
            }
          } else if (section === 'location_hours') {
            if (data.locationTag) next.locationTag = data.locationTag
            if (data.locationHeading) next.locationHeading = data.locationHeading
            if (data.locationSubtitle) next.locationSubtitle = data.locationSubtitle
            if (data.addressText) next.addressText = data.addressText
            if (data.phoneText) next.phoneText = data.phoneText
          } else if (section === 'footer') {
            if (data.footerDesc) next.footerDesc = data.footerDesc
          } else if (section === 'theme') {
            if (data.activeThemeId) next.activeThemeId = data.activeThemeId
            if (data.activeColors) next.activeColors = data.activeColors
            if (Array.isArray(data.themePresets) && data.themePresets.length > 0) {
              next.themePresets = data.themePresets
            }
          }
        })

        return next
      })
    } catch (err) {
      console.warn('Erro ao carregar landing_content:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
  }, [])

  useRealtime('landing_content', () => {
    loadContent()
  })

  // Aplica as variáveis CSS dinâmicas para o tema no elemento raiz ou escopo
  useEffect(() => {
    const colors = content.activeColors || DEFAULT_THEME_COLORS
    const root = document.documentElement
    root.style.setProperty('--landing-bg-primary', colors.bgPrimary)
    root.style.setProperty('--landing-bg-secondary', colors.bgSecondary)
    root.style.setProperty('--landing-bg-card', colors.bgCard)
    root.style.setProperty('--landing-vinho', colors.accentVinho)
    root.style.setProperty('--landing-vinho-hover', colors.accentVinhoHover)
    root.style.setProperty('--landing-silver', colors.accentSilver)
  }, [content.activeColors])

  const saveSection = async (section: string, data: any, imageFile?: File | null) => {
    let existingRecord: any = null
    try {
      existingRecord = await pb
        .collection('landing_content')
        .getFirstListItem(`section="${section}"`)
    } catch (_) {
      existingRecord = null
    }

    const formData = new FormData()
    formData.append('section', section)
    formData.append('data', JSON.stringify(data))

    if (imageFile) {
      formData.append('image', imageFile)
    }

    if (existingRecord) {
      await pb.collection('landing_content').update(existingRecord.id, formData)
    } else {
      await pb.collection('landing_content').create(formData)
    }
    await loadContent()
  }

  const saveTheme = async (
    themeId: string,
    colors: LandingThemeColors,
    presets?: LandingThemePreset[],
  ) => {
    const nextPresets = presets || content.themePresets
    const themeData = {
      activeThemeId: themeId,
      activeColors: colors,
      themePresets: nextPresets,
    }
    await saveSection('theme', themeData)
  }

  const applyPreset = async (presetId: string) => {
    const preset = content.themePresets.find((p) => p.id === presetId)
    if (!preset) return
    await saveTheme(preset.id, preset.colors)
  }

  const value = useMemo(
    () => ({
      content,
      loading,
      refresh: loadContent,
      saveSection,
      saveTheme,
      applyPreset,
      getFileUrl,
    }),
    [content, loading],
  )

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>
}

export function useLandingContent() {
  const ctx = useContext(LandingContext)
  if (!ctx) {
    throw new Error('useLandingContent must be used within a LandingProvider')
  }
  return ctx
}
