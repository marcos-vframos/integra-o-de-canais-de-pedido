import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Save,
  RotateCcw,
  Palette,
  Type,
  ImageIcon,
  Store,
  Clock,
  Sparkles,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react'
import { useLandingContent, LandingThemeColors, LandingSlide, LandingFeedPost, DEFAULT_THEME_COLORS } from '@/context/LandingContentContext'
import {useBusinessProfile} from '@/context/BusinessProfileContext'
import ThemePresetCard from '@/components/ThemePresetCard'
import ThemeAdobeMenu from '@/components/ThemeAdobeMenu'
import { ImageUploadField } from '@/components/ImageUploadField'
import { MultiImageField } from '@/components/MultiImageField'
import SeasonalCampaignAdmin from '@/components/SeasonalCampaignAdmin'
import { loadPromotionPalettes, savePromotionPalette, type SavedPromotionPalette } from '@/lib/promotionPaletteStore'
import { themePaletteCatalog, isCatalogThemeRegistered, registerCatalogTheme, duplicateThemePreset } from '@/lib/themePaletteCatalog'
import pb, { backendConfigured } from '@/lib/pocketbase/client'
import LandingStoriesAdmin from '@/components/LandingStoriesAdmin'
import MarqueeEditor from '@/components/MarqueeEditor'
import useRealtime from '@/hooks/use-realtime'
import { checkIsOpenNow } from '@/data/loyolasData'

export default function AdmLanding() {
  const business = useBusinessProfile()
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: unknown } | null)?.returnTo
  // Restrict return destinations to known internal management routes.
  const returnTo = requestedReturn === '/gestao' || requestedReturn === '/config' ? requestedReturn : '/'
  const returnLabel = returnTo === '/gestao' ? 'Voltar ao Gestor' : returnTo === '/config' ? 'Voltar às Configurações' : 'Voltar à Landing Page'
  const draftTouched = useRef(false)
  const { content, loading: contentLoading, saveSection } = useLandingContent()
  const [activeTab, setActiveTab] = useState<'textos' | 'imagens' | 'temas' | 'loja' | 'stories'>('textos')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [allHeadlines, setAllHeadlines] = useState(content.headlines)

  // Status da loja (controle manual e horário automático)
  const [forceOpen, setForceOpen] = useState(false)
  const [forceClosed, setForceClosed] = useState(false)
  const [autoStatus, setAutoStatus] = useState(() => checkIsOpenNow())

  // Estado dos textos locais editáveis
  const [formText, setFormText] = useState({
    traditionBadge: content.traditionBadge,
    // Hero Headlines
    headline0Prefix: content.headlines[0]?.prefix || '',
    headline0Highlight: content.headlines[0]?.highlight || '',
    headline0Desc: content.headlines[0]?.description || '',
    headline0Badge: content.headlines[0]?.badge || '',

    headline1Prefix: content.headlines[1]?.prefix || '',
    headline1Highlight: content.headlines[1]?.highlight || '',
    headline1Desc: content.headlines[1]?.description || '',
    headline1Badge: content.headlines[1]?.badge || '',

    // Hero chips
    chip0: content.heroSubtitleChips[0] || '',
    chip1: content.heroSubtitleChips[1] || '',
    chip2: content.heroSubtitleChips[2] || '',

    // Story
    storyHeadingPrefix: content.storyHeadingPrefix,
    storyHeadingHighlight: content.storyHeadingHighlight,
    storyP1: content.storyP1,
    storyP2: content.storyP2,
    storyQuote: content.storyQuote,
    storyQuoteAuthor: content.storyQuoteAuthor,
    storyCard1Title: content.storyCard1Title,
    storyCard1Desc: content.storyCard1Desc,
    storyCard2Title: content.storyCard2Title,
    storyCard2Desc: content.storyCard2Desc,

    // Featured Menu
    menuTag: content.menuTag,
    menuHeading: content.menuHeading,
    menuSubtitle: content.menuSubtitle,

    // Reviews
    reviewsTag: content.reviewsTag,
    reviewsHeading: content.reviewsHeading,
    reviewsSubtitle: content.reviewsSubtitle,

    // Instagram
    instagramTag: content.instagramTag,
    instagramHeading: content.instagramHeading,
    instagramSubtitle: content.instagramSubtitle,

    // Order CTA
    ctaTag: content.ctaTag,
    ctaHeading: content.ctaHeading,
    ctaDescription: content.ctaDescription,
    ctaButtonText: content.ctaButtonText,

    // Location / Hours
    locationTag: content.locationTag,
    locationHeading: content.locationHeading,
    locationSubtitle: content.locationSubtitle,
    addressText: content.addressText,
    phoneText: content.phoneText,

    // Footer
    footerDesc: content.footerDesc,
  })

  // Slides hero e posts instagram
  const [heroSlides, setHeroSlides] = useState<LandingSlide[]>(content.heroSlides)
  const [instagramPosts, setInstagramPosts] = useState<LandingFeedPost[]>(content.instagramPosts)
  const [storyImages, setStoryImages] = useState<string[]>(
    content.storyImages || (content.storyImage ? [content.storyImage] : []),
  )
  const [ctaImages, setCtaImages] = useState<string[]>(content.ctaImages || [])

  // Cores do tema ativo
  const [customColors, setCustomColors] = useState<LandingThemeColors>(
    content.activeColors || DEFAULT_THEME_COLORS,
  )
  const [newPresetName, setNewPresetName] = useState('')
  const [savedPalettes, setSavedPalettes] = useState<SavedPromotionPalette[]>([])
  const [themeBusy, setThemeBusy] = useState(false)
  const themeSaving = useRef(false)
  const [themeMessage, setThemeMessage] = useState('')
  const [themeError, setThemeError] = useState('')
  const palettes = themePaletteCatalog(savedPalettes)

  useEffect(() => {
    if (activeTab !== 'temas') return
    let current = true
    loadPromotionPalettes().then(rows => { if (current) setSavedPalettes(rows) }).catch(() => {
      if (current) setThemeError('Não foi possível carregar as paletas salvas. As paletas prontas continuam disponíveis.')
    })
    return () => { current = false }
  }, [activeTab])

  const persistThemeAction = async (action: () => Promise<void>, message: string) => {
    if (themeSaving.current || contentLoading) return
    themeSaving.current = true
    setThemeBusy(true); setThemeError(''); setThemeMessage('')
    try { await action(); setThemeMessage(message) }
    catch (error: unknown) { setThemeError(error instanceof Error ? error.message : 'Não foi possível salvar o tema. Tente novamente.') }
    finally { themeSaving.current = false; setThemeBusy(false) }
  }

  const handleRegisterPalette = (key: string) => {
    const palette = palettes.find(p => p.key === key)
    if (!palette) return
    const updated = registerCatalogTheme(content.themePresets, palette)
    if (updated === content.themePresets) return
    void persistThemeAction(() => saveSection('theme', { themePresets: updated }),
      `Tema “${palette.name}” salvo. Use o botão do cartão para ativá-lo.`)
  }

  // Carregar configurações de settings (force_open e force_closed)
  const loadStoreSettings = async () => {
    try {
      const records = await pb.collection('settings').getFullList()
      const fo = records.find((r) => r.key === 'force_open')?.value === 'true'
      const fc = records.find((r) => r.key === 'force_closed')?.value === 'true'
      setForceOpen(fo)
      setForceClosed(fc)
      setAutoStatus(checkIsOpenNow())
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadStoreSettings()
    const timer = setInterval(() => {
      setAutoStatus(checkIsOpenNow())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useRealtime('settings', () => {
    loadStoreSettings()
  })

  // Atualizações externas não substituem o rascunho que está sendo editado.
  useEffect(() => {
    if (contentLoading || draftTouched.current) return
    setFormText({
      traditionBadge: content.traditionBadge,
      headline0Prefix: content.headlines[0]?.prefix || '',
      headline0Highlight: content.headlines[0]?.highlight || '',
      headline0Desc: content.headlines[0]?.description || '',
      headline0Badge: content.headlines[0]?.badge || '',

      headline1Prefix: content.headlines[1]?.prefix || '',
      headline1Highlight: content.headlines[1]?.highlight || '',
      headline1Desc: content.headlines[1]?.description || '',
      headline1Badge: content.headlines[1]?.badge || '',

      chip0: content.heroSubtitleChips[0] || '',
      chip1: content.heroSubtitleChips[1] || '',
      chip2: content.heroSubtitleChips[2] || '',

      storyHeadingPrefix: content.storyHeadingPrefix,
      storyHeadingHighlight: content.storyHeadingHighlight,
      storyP1: content.storyP1,
      storyP2: content.storyP2,
      storyQuote: content.storyQuote,
      storyQuoteAuthor: content.storyQuoteAuthor,
      storyCard1Title: content.storyCard1Title,
      storyCard1Desc: content.storyCard1Desc,
      storyCard2Title: content.storyCard2Title,
      storyCard2Desc: content.storyCard2Desc,

      menuTag: content.menuTag,
      menuHeading: content.menuHeading,
      menuSubtitle: content.menuSubtitle,

      reviewsTag: content.reviewsTag,
      reviewsHeading: content.reviewsHeading,
      reviewsSubtitle: content.reviewsSubtitle,

      instagramTag: content.instagramTag,
      instagramHeading: content.instagramHeading,
      instagramSubtitle: content.instagramSubtitle,

      ctaTag: content.ctaTag,
      ctaHeading: content.ctaHeading,
      ctaDescription: content.ctaDescription,
      ctaButtonText: content.ctaButtonText,

      locationTag: content.locationTag,
      locationHeading: content.locationHeading,
      locationSubtitle: content.locationSubtitle,
      addressText: content.addressText,
      phoneText: content.phoneText,

      footerDesc: content.footerDesc,
    })
    setHeroSlides(content.heroSlides)
    setInstagramPosts(content.instagramPosts)
    setStoryImages(content.storyImages || (content.storyImage ? [content.storyImage] : []))
    setCtaImages(content.ctaImages || [])
    setCustomColors(content.activeColors || DEFAULT_THEME_COLORS)
    setAllHeadlines(content.headlines)
  }, [content, contentLoading])

  // Salvar textos no backend
  const handleSaveAllTexts = async () => {
    setIsSaving(true)
    try {
      // 1. Hero
      const updatedHeadlines = [...allHeadlines]

      await saveSection('hero', {
        traditionBadge: formText.traditionBadge,
        headlines: updatedHeadlines,
        heroSlides,
        heroSubtitleChips: [formText.chip0, formText.chip1, formText.chip2].filter(Boolean),
      })

      // 2. Story
      await saveSection('story', {
        storyHeadingPrefix: formText.storyHeadingPrefix,
        storyHeadingHighlight: formText.storyHeadingHighlight,
        storyP1: formText.storyP1,
        storyP2: formText.storyP2,
        storyQuote: formText.storyQuote,
        storyQuoteAuthor: formText.storyQuoteAuthor,
        storyCard1Title: formText.storyCard1Title,
        storyCard1Desc: formText.storyCard1Desc,
        storyCard2Title: formText.storyCard2Title,
        storyCard2Desc: formText.storyCard2Desc,
        storyImages,
      })

      // 3. Menu header
      await saveSection('menu_header', {
        menuTag: formText.menuTag,
        menuHeading: formText.menuHeading,
        menuSubtitle: formText.menuSubtitle,
      })

      // 4. Reviews
      await saveSection('reviews', {
        reviewsTag: formText.reviewsTag,
        reviewsHeading: formText.reviewsHeading,
        reviewsSubtitle: formText.reviewsSubtitle,
      })

      // 5. Instagram
      await saveSection('instagram', {
        instagramTag: formText.instagramTag,
        instagramHeading: formText.instagramHeading,
        instagramSubtitle: formText.instagramSubtitle,
        instagramPosts,
      })

      // 6. Order CTA
      await saveSection('order_cta', {
        ctaTag: formText.ctaTag,
        ctaHeading: formText.ctaHeading,
        ctaDescription: formText.ctaDescription,
        ctaButtonText: formText.ctaButtonText,
        ctaImages,
      })

      // 7. Location & Hours
      await saveSection('location_hours', {
        locationTag: formText.locationTag,
        locationHeading: formText.locationHeading,
        locationSubtitle: formText.locationSubtitle,
        addressText: formText.addressText,
        phoneText: formText.phoneText,
      })

      // 8. Footer
      await saveSection('footer', {
        footerDesc: formText.footerDesc,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err?.message || 'Tente novamente.'))
    } finally {
      setIsSaving(false)
    }
  }

  // Upload de imagem específica
  const handleUploadStoryImage = async (file: File) => {
    await saveSection(
      'story',
      {
        storyHeadingPrefix: formText.storyHeadingPrefix,
        storyHeadingHighlight: formText.storyHeadingHighlight,
        storyP1: formText.storyP1,
        storyP2: formText.storyP2,
        storyQuote: formText.storyQuote,
        storyQuoteAuthor: formText.storyQuoteAuthor,
      },
      file,
    )
  }

  const handleUploadSlideImage = async (slideIndex: number, file: File) => {
    // Para simplificar e garantir persistência direta via PocketBase, salvamos na landing_content com chave slide_X
    const sectionName = `slide_${slideIndex}`
    await saveSection(sectionName, { title: heroSlides[slideIndex]?.title }, file)

    // Recupera a URL recém-criada
    const record = await pb
      .collection('landing_content')
      .getFirstListItem(`section="${sectionName}"`)
    const newUrl = pb.files.getURL(record, record.image)

    const updated = [...heroSlides]
    if (updated[slideIndex]) {
      updated[slideIndex] = { ...updated[slideIndex], image: newUrl }
      setHeroSlides(updated)
      await saveSection('hero', {
        traditionBadge: formText.traditionBadge,
        heroSlides: updated,
      })
    }
  }

  const handleUploadInstagramImage = async (postIndex: number, file: File) => {
    const sectionName = `insta_${postIndex}`
    await saveSection(sectionName, { caption: instagramPosts[postIndex]?.caption }, file)
    const record = await pb
      .collection('landing_content')
      .getFirstListItem(`section="${sectionName}"`)
    const newUrl = pb.files.getURL(record, record.image)

    const updated = [...instagramPosts]
    if (updated[postIndex]) {
      updated[postIndex] = { ...updated[postIndex], image: newUrl }
      setInstagramPosts(updated)
      await saveSection('instagram', {
        instagramPosts: updated,
      })
    }
  }

  // Controle manual da loja (abrir/fechar sobrepondo horário)
  const setStoreManualMode = async (mode: 'auto' | 'force_open' | 'force_closed') => {
    const isFo = mode === 'force_open'
    const isFc = mode === 'force_closed'
    setForceOpen(isFo)
    setForceClosed(isFc)

    // Atualiza ou cria em settings
    const upsertSetting = async (key: string, val: string) => {
      try {
        const item = await pb.collection('settings').getFirstListItem(`key="${key}"`)
        await pb.collection('settings').update(item.id, { value: val })
      } catch (_) {
        await pb.collection('settings').create({ key, value: val })
      }
    }

    await upsertSetting('force_open', isFo ? 'true' : 'false')
    await upsertSetting('force_closed', isFc ? 'true' : 'false')

    // Se em modo automático, recalcula is_open com base no horário real
    if (mode === 'auto') {
      const nowAuto = checkIsOpenNow().isOpen
      await upsertSetting('is_open', nowAuto ? 'true' : 'false')
    } else {
      await upsertSetting('is_open', isFo ? 'true' : 'false')
    }
  }

  // Salvar novo preset de cores Adobe
  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return
    const newPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      colors: customColors,
    }
    const updatedPresets = [...content.themePresets, newPreset]
    await persistThemeAction(async () => {
      await saveSection('theme', { themePresets: updatedPresets })
      setNewPresetName('')
    }, 'Novo tema salvo. Use o botão do cartão para ativá-lo.')
  }

  const handleSaveAdobeForPromotion = async () => {
    if (!newPresetName.trim()) { alert('Informe o nome da paleta.'); return }
    if (!backendConfigured || !pb.authStore.hasSession) {
      alert('Ainda não é possível salvar paletas compartilhadas: configure o Supabase e autentique um operador.')
      return
    }
    try {
      const saved = await savePromotionPalette({
        id: 'promocao_' + Date.now(),
        name: newPresetName.trim(),
        colors: { ...customColors },
      })
      setSavedPalettes(saved)
      alert('Paleta salva no catálogo de promoções. Abra a seção Campanhas Sazonais para selecioná-la.')
      setNewPresetName('')
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar a paleta de promoção.')
    }
  }

  const handleDeletePreset = async (id: string) => {
    if (id === 'padrao') return
    const updated = content.themePresets.filter((p) => p.id !== id)
    await persistThemeAction(() => saveSection('theme', { themePresets: updated }), 'Tema removido do catálogo.')
  }

  // Adicionar / Remover slides do hero dinamicamente
  const handleAddHeroSlide = () => {
    const newSlide: LandingSlide = {
      image: 'https://img.usecurling.com/p/800/850?q=gourmet+burger',
      title: 'Novo Destaque da Casa',
      price: 'R$ 28,00',
      tag: 'Especial',
      subtitle: 'Ingredientes selecionados preparados com carinho na chapa',
    }
    const updated = [...heroSlides, newSlide]
    setHeroSlides(updated)
  }

  const handleRemoveHeroSlide = (idx: number) => {
    if (heroSlides.length <= 1) {
      alert('É necessário manter pelo menos 1 slide.')
      return
    }
    const updated = heroSlides.filter((_, i) => i !== idx)
    setHeroSlides(updated)
  }

  const handleUpdateSlideField = (idx: number, field: keyof LandingSlide, val: string) => {
    const updated = [...heroSlides]
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], [field]: val }
      setHeroSlides(updated)
    }
  }

  const isStoreCurrentlyOpen = forceOpen ? true : forceClosed ? false : autoStatus.isOpen

  return (
    <div onClickCapture={e=>{if(!contentLoading && (e.target as HTMLElement).closest('button'))draftTouched.current=true}} onChangeCapture={() => { draftTouched.current = true }} className="min-h-screen bg-[#090a0f] text-[#f3f4f6] font-sans">
      {/* Barra de Topo do Painel Administrativo */}
      <header className="sticky top-0 z-50 bg-[#12141c]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={returnTo}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title={returnLabel}
            aria-label={returnLabel}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Área Administrativa • Landing Page
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CMS PocketBase
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Edite textos, fotos e paletas de cores Adobe em tempo real
            </p>
          </div>
        </div>

        {/* Status da Loja em tempo real com indicador */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStoreCurrentlyOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="font-semibold">
              {forceOpen
                ? 'Aberto (Manual)'
                : forceClosed
                  ? 'Fechado (Manual)'
                  : autoStatus.isOpen
                    ? 'Aberto (Horário)'
                    : 'Fechado (Horário)'}
            </span>
          </div>

          <a
            href={import.meta.env.VITE_LANDING_URL || 'https://integracao-de-canais-de-pedido-git-feat-su-4e4eaa-sync-squad-hq.vercel.app/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            <span>Ver Landing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Acesso de visualização continua livre; escrita exige operador vinculado ao tenant. */}
      {!pb.authStore.hasSession && <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <b>Publicação protegida:</b> você pode visualizar tudo sem login, mas salvar imagens e mudanças exige um operador cadastrado e vinculado à empresa no Supabase.
            {' '}<Link to="/login?returnTo=/adm-landing" className="font-bold underline">Entrar no Gestor</Link>.
            {' '}Para criar a primeira conta, abra <a href="https://supabase.com/dashboard/project/awgqpfdfsyslpqpfzoul/auth/users" target="_blank" rel="noopener noreferrer" className="font-bold underline">Supabase → Authentication → Users</a>; depois associe o usuário à empresa.
          </span>
        </div>
      </div>}

      {/* Depois de autenticar, o banner desaparece e os campos gravam normalmente. */}
            {/* Navegação por Abas do Painel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setActiveTab('stories')} className={'rounded-lg px-4 py-2 text-xs font-semibold ' + (activeTab === 'stories' ? 'bg-[#8F0F1B] text-white' : 'bg-zinc-900 text-zinc-400')}>Stories da Landing</button>
            <button
              type="button"
              onClick={() => setActiveTab('textos')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'textos'
                  ? 'bg-[#8F0F1B] text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Textos & Conteúdo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('imagens')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'imagens'
                  ? 'bg-[#8F0F1B] text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Imagens & Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('temas')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'temas'
                  ? 'bg-[#8F0F1B] text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Paleta de Cores Adobe & Temas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('loja')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'loja'
                  ? 'bg-[#8F0F1B] text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Controle Aberto / Fechado</span>
            </button>
          </div>

          {activeTab === 'textos' && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAllTexts}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvo com sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* ================= ABA 1: TEXTOS ================= */}
        {activeTab === 'textos' && (
          <div className="space-y-8">
            {/* Seção Hero */}
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Hero (Destaque Principal)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Selo superior, todas as frases alternadas e chips de destaque
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Selo Superior (Selo de Tradição)
                  </label>
                  <input
                    type="text"
                    value={formText.traditionBadge}
                    onChange={(e) => setFormText({ ...formText, traditionBadge: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                    placeholder="TRADIÇÃO & ESSÊNCIA"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Chip 1 (Destaque)
                  </label>
                  <input
                    type="text"
                    value={formText.chip0}
                    onChange={(e) => setFormText({ ...formText, chip0: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Chip 2 (Destaque)
                  </label>
                  <input
                    type="text"
                    value={formText.chip1}
                    onChange={(e) => setFormText({ ...formText, chip1: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Chip 3 (Destaque)
                  </label>
                  <input
                    type="text"
                    value={formText.chip2}
                    onChange={(e) => setFormText({ ...formText, chip2: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Frase Alternada 1
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">Prefixo</label>
                    <input
                      type="text"
                      value={formText.headline0Prefix}
                      onChange={(e) =>
                        setFormText({ ...formText, headline0Prefix: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Destaque em Itálico
                    </label>
                    <input
                      type="text"
                      value={formText.headline0Highlight}
                      onChange={(e) =>
                        setFormText({ ...formText, headline0Highlight: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={formText.headline0Desc}
                    onChange={(e) => setFormText({ ...formText, headline0Desc: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Todas as frases do Hero</h3>
              <p className="text-xs text-zinc-400">Edite título, destaque, descrição e selo de cada slide. Salve pelo botão Salvar Textos.</p>
              {allHeadlines.map((item, index) => <div key={index} className="rounded-xl border border-zinc-700 p-3 space-y-2">
                <strong className="text-xs text-amber-400">Mensagem {index + 1}</strong>
                {(['prefix','highlight','description','badge'] as const).map(field => <label key={field} className="block text-xs text-zinc-300">{field === 'prefix' ? 'Título' : field === 'highlight' ? 'Destaque' : field === 'description' ? 'Descrição' : 'Selo'}
                  <textarea rows={field === 'description' ? 3 : 1} value={item[field] || ''} onChange={e => setAllHeadlines(prev => prev.map((h,i) => i === index ? {...h,[field]:e.target.value} : h))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white"/>
                </label>)}
              </div>)}
            </div>

            {/* Editor independente: aplica somente a barra móvel, sem sobrescrever outras seções. */}
            <MarqueeEditor />

            {/* Seção História */}
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  01 / História & Origem
                </h2>
                <p className="text-xs text-zinc-400">
                  Parágrafos, citação e destaques da trajetória
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Título - Prefixo
                  </label>
                  <input
                    type="text"
                    value={formText.storyHeadingPrefix}
                    onChange={(e) =>
                      setFormText({ ...formText, storyHeadingPrefix: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Título - Destaque
                  </label>
                  <input
                    type="text"
                    value={formText.storyHeadingHighlight}
                    onChange={(e) =>
                      setFormText({ ...formText, storyHeadingHighlight: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Parágrafo 1</label>
                <textarea
                  rows={2}
                  value={formText.storyP1}
                  onChange={(e) => setFormText({ ...formText, storyP1: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Parágrafo 2</label>
                <textarea
                  rows={2}
                  value={formText.storyP2}
                  onChange={(e) => setFormText({ ...formText, storyP2: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Citação</label>
                  <input
                    type="text"
                    value={formText.storyQuote}
                    onChange={(e) => setFormText({ ...formText, storyQuote: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Autor da Citação
                  </label>
                  <input
                    type="text"
                    value={formText.storyQuoteAuthor}
                    onChange={(e) => setFormText({ ...formText, storyQuoteAuthor: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Seções Cardápio, Avaliações, Instagram, CTA e Rodapé */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cardápio em Destaque */}
              <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  02 / Cabeçalho do Cardápio
                </h2>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Título</label>
                  <input
                    type="text"
                    value={formText.menuHeading}
                    onChange={(e) => setFormText({ ...formText, menuHeading: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Subtítulo</label>
                  <textarea
                    rows={2}
                    value={formText.menuSubtitle}
                    onChange={(e) => setFormText({ ...formText, menuSubtitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Avaliações */}
              <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  03 / Avaliações Oficiais
                </h2>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Título</label>
                  <input
                    type="text"
                    value={formText.reviewsHeading}
                    onChange={(e) => setFormText({ ...formText, reviewsHeading: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Subtítulo</label>
                  <textarea
                    rows={2}
                    value={formText.reviewsSubtitle}
                    onChange={(e) => setFormText({ ...formText, reviewsSubtitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Chamada para Pedido CTA */}
              <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  05 / Bloco de Pedido CTA
                </h2>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Título</label>
                  <input
                    type="text"
                    value={formText.ctaHeading}
                    onChange={(e) => setFormText({ ...formText, ctaHeading: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={formText.ctaDescription}
                    onChange={(e) => setFormText({ ...formText, ctaDescription: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={formText.ctaButtonText}
                    onChange={(e) => setFormText({ ...formText, ctaButtonText: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Localização & Rodapé */}
              <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  06 / Contato & Rodapé
                </h2>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Endereço de Exibição
                  </label>
                  <input
                    type="text"
                    value={formText.addressText}
                    onChange={(e) => setFormText({ ...formText, addressText: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formText.phoneText}
                    onChange={(e) => setFormText({ ...formText, phoneText: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Texto Institucional do Rodapé
                  </label>
                  <textarea
                    rows={2}
                    value={formText.footerDesc}
                    onChange={(e) => setFormText({ ...formText, footerDesc: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 2: IMAGENS COM UPLOAD ================= */}
        {activeTab === 'imagens' && (
          <div className="space-y-8">
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="border-b border-white/10 pb-3 mb-6 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Hero: Slides & Fotos em Transição Contínua (Crossfade)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Adicione, edite e remova os slides do topo da landing com fotos, título, preço e
                    legenda
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddHeroSlide}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Novo Slide ao Hero</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {heroSlides.map((slide, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Slide #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHeroSlide(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1 text-xs"
                        title="Remover slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ImageUploadField
                      label={`Imagem do Slide #${idx + 1}`}
                      currentUrl={slide.image}
                      onUpload={(file) => handleUploadSlideImage(idx, file)}
                      aspectRatio="h-44"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-0.5">
                          Título do Lanche
                        </label>
                        <input
                          type="text"
                          value={slide.title}
                          onChange={(e) => handleUpdateSlideField(idx, 'title', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-0.5">
                          Preço Exibido
                        </label>
                        <input
                          type="text"
                          value={slide.price}
                          onChange={(e) => handleUpdateSlideField(idx, 'price', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-0.5">Selo / Tag</label>
                        <input
                          type="text"
                          value={slide.tag}
                          onChange={(e) => handleUpdateSlideField(idx, 'tag', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-0.5">
                          Legenda / Ingredientes
                        </label>
                        <input
                          type="text"
                          value={slide.subtitle}
                          onChange={(e) => handleUpdateSlideField(idx, 'subtitle', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-imagem: Seção História */}
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  01 / Galeria & Carrossel da Seção História
                </h2>
                <p className="text-xs text-zinc-400">
                  Adicione mais fotos: quando houver 2 ou mais, a área vira um carrossel automático
                  com transição suave.
                </p>
              </div>

              <MultiImageField
                label="Fotos da Seção Nossa História"
                images={storyImages}
                onChange={async (imgs) => {
                  await saveSection('story', {
                    storyHeadingPrefix: formText.storyHeadingPrefix,
                    storyHeadingHighlight: formText.storyHeadingHighlight,
                    storyP1: formText.storyP1,
                    storyP2: formText.storyP2,
                    storyQuote: formText.storyQuote,
                    storyQuoteAuthor: formText.storyQuoteAuthor,
                    storyImage: imgs[0] || '',
                    storyImages: imgs,
                  })
                  setStoryImages(imgs)
                }}
              />
            </div>

            {/* Multi-imagem: CTA de Pedidos */}
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  05 / Fundo Dinâmico do Banner de Pedidos (CTA)
                </h2>
                <p className="text-xs text-zinc-400">
                  Imagens de fundo em transição suave para dar imersão ao bloco de pedidos.
                </p>
              </div>

              <MultiImageField
                label="Fotos de Fundo do CTA de Pedidos"
                images={ctaImages}
                onChange={async (imgs) => {
                  await saveSection('order_cta', {
                    ctaTag: formText.ctaTag,
                    ctaHeading: formText.ctaHeading,
                    ctaDescription: formText.ctaDescription,
                    ctaButtonText: formText.ctaButtonText,
                    ctaImages: imgs,
                  })
                  setCtaImages(imgs)
                }}
              />
            </div>

            {/* Fotos do Instagram */}
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="border-b border-white/10 pb-3 mb-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  04 / Fotos do Feed Instagram (@loyolass_lanches)
                </h2>
                <p className="text-xs text-zinc-400">
                  Atualize as fotos da grade do Instagram diretamente
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {instagramPosts.map((post, idx) => (
                  <div key={post.id || idx} className="space-y-1.5">
                    <ImageUploadField
                      label={`Post #${idx + 1}`}
                      currentUrl={post.image}
                      onUpload={(file) => handleUploadInstagramImage(idx, file)}
                      aspectRatio="aspect-square"
                    />
                    <input
                      type="text"
                      value={post.caption || ''}
                      placeholder="Legenda..."
                      onChange={(e) => {
                        const updated = [...instagramPosts]
                        if (updated[idx]) {
                          updated[idx] = { ...updated[idx], caption: e.target.value }
                          setInstagramPosts(updated)
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 3: TEMAS E PALETA ADOBE ================= */}
        {activeTab === 'temas' && (
          <div className="space-y-8">
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="relative border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    Seletor de Cores Estilo Adobe & Presets de Temas
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Crie ocasiões especiais (Promoções, Natal, Eventos) com paleta HSV/RGB/HEX
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <ThemeAdobeMenu colors={customColors} onChange={setCustomColors} busy={themeBusy} onSave={name => persistThemeAction(async () => {
                    const source = content.themePresets.find(p=>p.id===content.activeThemeId) || content.themePresets[0]
                    const updated = duplicateThemePreset(content.themePresets, source, name, customColors, 'preset_'+crypto.randomUUID())
                    await saveSection('theme', {themePresets:updated})
                  }, 'Novo cartão salvo. Use o botão do cartão para ativá-lo.')} />

                  <label className="block min-w-0 flex-1 text-xs text-zinc-300 sm:min-w-[280px]">Paletas prontas e salvas
                    <select value="" disabled={themeBusy || contentLoading} onChange={e => handleRegisterPalette(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white disabled:opacity-50">
                      <option value="">Selecione para criar um cartão permanente</option>
                      {palettes.map(p => {
                        const registered = isCatalogThemeRegistered(content.themePresets, p)
                        return <option key={p.key} value={p.key} disabled={registered}>{p.source === 'promotion' ? 'Minha paleta: ' : ''}{p.name}{registered ? ' — já cadastrada' : ''}</option>
                      })}
                    </select>
                  </label>
                </div>
              </div>

              {themeError && <p role="alert" className="text-xs text-red-300">{themeError}</p>}
              {themeMessage && <p role="status" className="text-xs text-emerald-300">{themeMessage}</p>}
              {/* Presets Salvos */}
              <div>
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-3">
                  Temas e Ocasiões Cadastradas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {content.themePresets.map(preset => <ThemePresetCard key={preset.id} preset={preset} active={content.activeThemeId===preset.id} busy={themeBusy}
                    onDelete={()=>void handleDeletePreset(preset.id)}
                    onActivate={()=>void persistThemeAction(async()=>{
                      const colors=content.activeThemeId===preset.id ? customColors : preset.colors
                      const themePresets=content.themePresets.map(p=>p.id===preset.id?{...p,colors:{...colors}}:p)
                      await saveSection('theme',{activeThemeId:preset.id,activeColors:colors,themePresets})
                      setCustomColors(colors)
                    }, `Tema “${preset.name}” ativado.`)}
                    onDuplicate={(name,colors)=>persistThemeAction(async()=>{
                      const themePresets=duplicateThemePreset(content.themePresets,preset,name,colors,'preset_'+crypto.randomUUID())
                      await saveSection('theme',{themePresets})
                    }, 'Cópia salva sem alterar o tema original.')} />)}
                </div>

                {/* Criar novo preset */}
                <div className="mt-4 p-4 rounded-xl bg-zinc-900/60 border border-white/10 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-zinc-400 font-medium">
                    Salvar cores atuais como:
                  </span>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Ex: Noite de Hambúrguer, Festival de Queijo..."
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400 flex-1 min-w-[200px]"
                  />
                  <button
                    type="button"
                    disabled={!newPresetName.trim() || themeBusy}
                    onClick={handleCreatePreset}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar como paleta da interface</span>
                  </button>
                  <button
                    type="button"
                    disabled={!newPresetName.trim()}
                    onClick={handleSaveAdobeForPromotion}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Salvar como paleta de promoção</span>
                  </button>
                </div>
              </div>


            </div>
          </div>
        )}

        {activeTab === 'temas' && <SeasonalCampaignAdmin />}
        {activeTab === 'stories' && <LandingStoriesAdmin />}

        {/* ================= ABA 4: ABERTO / FECHADO ================= */}
        {activeTab === 'loja' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-[#12141c] p-4 text-xs text-zinc-300" aria-label="Sincronização Google Meu Negócio">
              <h2 className="font-bold text-white">Google Meu Negócio · localização e horários</h2>
              <p className="mt-2">{business.profile ? `Última consulta: ${new Date(business.profile.fetchedAt).toLocaleString('pt-BR')}${business.stale?' · aguardando atualização':''}. Atualização automática a cada 15 minutos enquanto o sistema está aberto.` : business.configured ? 'Conexão configurada, aguardando consulta ao Google.' : 'Conexão pendente. O projeto Google e a conta administradora do estabelecimento precisam ser autorizados.'}</p>
              <p className="mt-2 text-zinc-400">A integração lê o endereço, telefone e horários semanais e especiais. Sem conexão, as informações cadastradas continuam em uso.</p>
            </section>

            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-400" />
                    Controle de Abertura & Horário de Funcionamento
                  </h2>
                  <p className="text-xs text-zinc-400">
                    O status muda em tempo real simultaneamente em todos os canais (/loja, /gestao,
                    /)
                  </p>
                </div>
              </div>

              {/* Status Atual Resumo */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      isStoreCurrentlyOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Status Vigente: {isStoreCurrentlyOpen ? 'ABERTO AGORA' : 'FECHADO NO MOMENTO'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {forceOpen
                        ? 'Sobrescrito manualmente para SEMPRE ABERTO'
                        : forceClosed
                          ? 'Sobrescrito manualmente para SEMPRE FECHADO (pausa/sazonalidade)'
                          : `Horário automático ativo: ${autoStatus.nextInfo}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {autoStatus.statusText}
                  </span>
                </div>
              </div>

              {/* Interruptor de Controle Manual */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Escolha o Modo de Operação
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStoreManualMode('auto')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      !forceOpen && !forceClosed
                        ? 'bg-amber-500/10 border-amber-400 shadow-md'
                        : 'bg-zinc-900 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Horário Automático
                      </span>
                      {!forceOpen && !forceClosed && (
                        <span className="text-[10px] text-amber-300 font-bold">ATIVO</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Segue rigidamente os horários semanais cadastrados (Qua a Seg das 19h às
                      23h30).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreManualMode('force_open')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      forceOpen
                        ? 'bg-emerald-500/15 border-emerald-400 shadow-md'
                        : 'bg-zinc-900 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Forçar ABERTO Manual
                      </span>
                      {forceOpen && (
                        <span className="text-[10px] text-emerald-300 font-bold">ATIVO</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Mantém a loja aberta para pedidos imediatamente, independente do horário.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreManualMode('force_closed')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      forceClosed
                        ? 'bg-red-500/15 border-red-400 shadow-md'
                        : 'bg-zinc-900 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                        Forçar FECHADO Manual
                      </span>
                      {forceClosed && (
                        <span className="text-[10px] text-red-300 font-bold">ATIVO</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Pausa os pedidos para sazonalidade, chuva, evento interno ou manutenção.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
