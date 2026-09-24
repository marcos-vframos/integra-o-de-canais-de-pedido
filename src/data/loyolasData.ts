export interface MenuItemLanding {
  id: string
  name: string
  category: 'lanches' | 'dogs' | 'porcoes'
  description: string
  price: string
  badge?: string
  image: string
  popular?: boolean
}

export interface ReviewItem {
  id: string
  author: string
  rating: number
  date: string
  source: 'Google' | 'Facebook'
  comment: string
  avatarSeed: number
}

export interface BusinessDayHours {
  dayName: string
  dayIndex: number
  open: string
  close: string
  isOpenToday: boolean
}

export const BUSINESS_INFO = {
  name: 'Loyolas Lanches',
  tagline: 'O Verdadeiro Podrão de Pindamonhangaba',
  subheadline:
    'O autêntico lanche de carrinho brasileiro, preparado com ingredientes de verdade, fartura e o capricho de quem tem tradição.',
  address:
    'Av. Prefeito, Av. Nicanor Ramos Nogueira - Conj. Res. Araretama, Pindamonhangaba - SP, 12423-010',
  phoneDisplay: '(12) 99159-1915',
  phoneRaw: '5512991591915',
  whatsappUrl:
    'https://wa.me/5512991591915?text=Ol%C3%A1!%20Vi%20o%20site%20do%20Loyolas%20Lanches%20e%20quero%20fazer%20um%20pedido.',
  instagramHandle: '@loyolass_lanches',
  instagramName: 'André Loyola',
  instagramBio:
    'hambúrgueres artesanal e lanches especiais !! eleito melhor hamburgueria Pindamonhangaba, SP • Delivery | link na bio',
  honorableTitle: 'eleito melhor hamburgueria Pindamonhangaba, SP',
  facebookUrl: 'https://www.facebook.com/loyolaslanches/',
  instagramUrl: 'https://www.instagram.com/loyolass_lanches/',
  googleReviewUrl: 'https://www.google.com/maps/search/Loyolas+Lanches+Pindamonhangaba',
  googleRating: 5.0,
  googleReviewCount: 1,
  facebookRating: 5.0,
  facebookVoteCount: 7,
  hoursSchedule: [
    { dayIndex: 1, dayName: 'Segunda-feira', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 2, dayName: 'Terça-feira', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 3, dayName: 'Quarta-feira', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 4, dayName: 'Quinta-feira', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 5, dayName: 'Sexta-feira', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 6, dayName: 'Sábado', hours: '20:00 – 23:30', closed: false },
    { dayIndex: 0, dayName: 'Domingo', hours: 'Encerrado', closed: true },
  ],
}

export const VERIFIED_RATINGS = [
  {
    platform: 'Google Meu Negócio',
    rating: 5.0,
    maxRating: 5.0,
    reviewsText: '1 avaliação oficial no Google Maps',
    badge: 'Nota Máxima 5,0',
    iconLetter: 'G',
    link: 'https://www.google.com/maps/search/Loyolas+Lanches+Pindamonhangaba',
    ctaText: 'Ver no Google Maps',
    description:
      'Perfil comercial verificado com classificação máxima 5,0 estrelas pela comunidade.',
  },
  {
    platform: 'Facebook',
    rating: 5.0,
    maxRating: 5.0,
    reviewsText: '100% de recomendação (7 votos registrados)',
    badge: '5 / 5 Estrelas',
    iconLetter: 'f',
    link: 'https://www.facebook.com/loyolaslanches/',
    ctaText: 'Página no Facebook',
    description:
      'Avaliação espontânea da comunidade no Facebook com 100% de recomendação positiva.',
  },
]

export const MARQUEE_ITEMS = [
  'Lanche na Chapinha',
  'Pão Quentinho & Crocante',
  'Molho Especial da Casa',
  'Atendimento 5 Estrelas',
  'Tradição de Família',
  'O Verdadeiro Podrão Raiz',
  'Bacon Sequinho e Crocante',
  'Entrega Rápida em Pinda',
]

export function checkIsOpenNow(date = new Date()): {
  isOpen: boolean
  statusText: string
  nextInfo: string
} {
  const brOffset = -3 * 60
  const localOffset = date.getTimezoneOffset()
  const diffMinutes = brOffset + localOffset
  const brDate = new Date(date.getTime() + diffMinutes * 60 * 1000)
  const day = brDate.getDay()
  const hours = brDate.getHours()
  const minutes = brDate.getMinutes()
  const currentTotalMinutes = hours * 60 + minutes
  const openMinutes = 20 * 60
  const closeMinutes = 23 * 60 + 30

  if (day === 0) {
    return {
      isOpen: false,
      statusText: 'Fechado hoje (Domingo)',
      nextInfo: 'Abre segunda-feira às 20:00',
    }
  }

  if (currentTotalMinutes >= openMinutes && currentTotalMinutes <= closeMinutes) {
    const minutesLeft = closeMinutes - currentTotalMinutes
    const hoursLeft = Math.floor(minutesLeft / 60)
    const remMins = minutesLeft % 60
    const timeRemaining = hoursLeft > 0 ? `${hoursLeft}h ${remMins}min` : `${remMins}min`
    return {
      isOpen: true,
      statusText: 'Aberto agora',
      nextInfo: `Fecha às 23:30 (restam aprox. ${timeRemaining})`,
    }
  }

  if (currentTotalMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: 'Fechado no momento',
      nextInfo: 'Abre hoje às 20:00',
    }
  }

  if (day === 6) {
    return {
      isOpen: false,
      statusText: 'Fechado',
      nextInfo: 'Fechado no domingo. Abre segunda-feira às 20:00',
    }
  }

  return {
    isOpen: false,
    statusText: 'Fechado por hoje',
    nextInfo: 'Abre amanhã às 20:00',
  }
}
