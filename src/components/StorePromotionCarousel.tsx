import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Tag } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { notifyOffer, type CampaignOffer } from '@/lib/campaignOffer'
import { campaignDestination, campaignMediaIsVideo, isCampaignLive } from '@/lib/campaignDisplay'
import useRealtime from '@/hooks/use-realtime'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { fmtBRL } from '@/lib/seeds'

interface Promo {
  id: string; title: string; badge?: string; description?: string; active?: boolean
  startDate?: string; endDate?: string; ctaText?: string; ctaUrl?: string; images?: string[]
  palette?: { accentVinho?: string; bgCard?: string; accentSilver?: string }
  media?: string
  offer?: CampaignOffer
}
type CatalogEntry = { id: string; name: string; price?: number }
const mediaFor = (campaign: Promo) => campaign.media
  ? pb.files.getURL(campaign, campaign.media)
  : campaign.images?.find(Boolean) || ''
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value))

export default function StorePromotionCarousel() {
  const [items, setItems] = useState<Promo[]>([])
  const [index, setIndex] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [ingredients, setIngredients] = useState<CatalogEntry[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const load = async () => {
    try {
      const rows = await pb.collection('seasonal_campaigns').getFullList({ sort: '-startDate,-created' })
      setItems(rows as unknown as Promo[])
      setNow(Date.now())
      setError('')
    } catch {
      setError('Não foi possível atualizar as campanhas.')
    }
  }
  useEffect(() => { void load() }, [])
  useRealtime('seasonal_campaigns', load)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000)
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(query.matches)
    change()
    query.addEventListener('change', change)
    return () => { clearInterval(timer); query.removeEventListener('change', change) }
  }, [])

  const promos = items.filter(campaign => isCampaignLive(campaign, now))
  const currentIndex = promos.length ? index % promos.length : 0
  const current = promos[currentIndex]
  const selected = promos.find(campaign => campaign.id === selectedId)
  const selectedProductId = selected?.offer?.productId
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selectedId, selected])
  useEffect(() => {
    if (!selectedProductId) return
    let alive = true
    setCatalog([])
    setIngredients([])
    Promise.allSettled([
      pb.collection('menu').getFullList<CatalogEntry>(),
      pb.collection('inventory').getFullList<CatalogEntry>(),
    ]).then(([products, stock]) => {
      if (!alive) return
      if (products.status === 'fulfilled') setCatalog(products.value)
      if (stock.status === 'fulfilled') setIngredients(stock.value)
    })
    return () => { alive = false }
  }, [selectedProductId])

  useEffect(() => {
    if (promos.length < 2 || paused || hovered || focused || selectedId || reducedMotion) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex(value => (value + 1) % promos.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [promos.length, paused, hovered, focused, selectedId, reducedMotion])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (paused || hovered || focused || selectedId || reducedMotion) video.pause()
    else void video.play().catch(() => { /* Browsers may block autoplay. */ })
  }, [current?.id, paused, hovered, focused, selectedId, reducedMotion])

  const move = (offset: number) => setIndex((currentIndex + offset + promos.length) % promos.length)
  if (!current) return error ? <p role="status" className="mb-4 text-sm text-amber-200">{error} <button type="button" className="underline" onClick={() => void load()}>Tentar novamente</button></p> : null
  const media = mediaFor(current)
  const selectedMedia = selected ? mediaFor(selected) : ''
  const product = catalog.find(item => item.id === selectedProductId)
  const offerPrice = selected?.offer?.unitPrice ?? product?.price
  const destination = campaignDestination(selected?.ctaUrl)
  const accent = current.palette?.accentVinho || '#E10600'

  return <>
    <section aria-label="Campanhas ativas" aria-roledescription="carrossel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false) }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#121215]">
      <button ref={triggerRef} type="button" aria-label={`Ver detalhes da campanha ${current.title}`}
        onTouchStart={event => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; swiped.current = false }}
        onTouchEnd={event => {
          const point = event.changedTouches[0], start = touch.current
          touch.current = null
          if (start && Math.abs(point.clientX - start.x) > 50 && Math.abs(point.clientX - start.x) > Math.abs(point.clientY - start.y) && promos.length > 1) {
            swiped.current = true
            move(point.clientX < start.x ? 1 : -1)
          }
        }}
        onClick={() => { if (swiped.current) { swiped.current = false; return }; setSelectedId(current.id) }}
        className="relative block min-h-[190px] w-full overflow-hidden p-5 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:p-7">
        {media && (campaignMediaIsVideo(media)
          ? <video ref={videoRef} key={current.id} src={media} muted loop playsInline autoPlay={!reducedMotion && !paused && !hovered && !focused && !selectedId} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40" />
          : <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />)}
        <span className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />
        <span className="relative z-10 block max-w-2xl">
          <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}><Tag size={12} />{current.badge || 'Campanha ativa'}</span>
          <span className="block text-xl font-black sm:text-2xl">{current.title}</span>
          {current.description && <span className="mt-2 block line-clamp-2 text-sm text-zinc-200">{current.description}</span>}
          <span className="mt-4 inline-block rounded-md px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}>Ver campanha e benefícios</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <span className="text-xs text-zinc-300">{currentIndex + 1} de {promos.length} {promos.length === 1 ? 'campanha ativa' : 'campanhas ativas'}</span>
        {promos.length > 1 && <div className="flex max-w-full flex-wrap items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Campanha anterior" className="rounded-full bg-white/10 p-2 text-white"><ChevronLeft size={18} /></button>
          {promos.map((campaign, position) => <button key={campaign.id} type="button"
            onClick={() => setIndex(position)} aria-label={`Mostrar campanha ${position + 1}: ${campaign.title}`}
            aria-current={position === currentIndex ? 'true' : undefined}
            className={`h-3 w-3 rounded-full ${position === currentIndex ? 'bg-white' : 'bg-white/30'}`} />)}
          <button type="button" onClick={() => move(1)} aria-label="Próxima campanha" className="rounded-full bg-white/10 p-2 text-white"><ChevronRight size={18} /></button>
          <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Retomar carrossel' : 'Pausar carrossel'} className="rounded-full bg-white/10 p-2 text-white">{paused ? <Play size={16} /> : <Pause size={16} />}</button>
        </div>}
      </div>
      {error && <p role="status" className="px-4 pb-3 text-xs text-amber-200">{error}</p>}
    </section>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null) }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-2xl rounded-2xl border-white/15 bg-[#121215] p-5 text-white sm:p-7"
        onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }}>
        {selected && <>
          {selected.badge && <span className="pr-8 text-xs font-bold uppercase tracking-widest text-zinc-300">{selected.badge}</span>}
          <DialogTitle className="pr-6 text-2xl font-black">{selected.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">{selected.description || 'Confira abaixo os detalhes desta campanha.'}</DialogDescription>
          {selectedMedia && (campaignMediaIsVideo(selectedMedia)
            ? <video src={selectedMedia} controls playsInline className="max-h-72 w-full rounded-xl object-contain" />
            : <img src={selectedMedia} alt={selected.title} className="max-h-72 w-full rounded-xl object-contain" />)}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <p className="font-semibold">O que a campanha oferece</p>
            {selectedProductId && <p>Produto: {product?.name || 'Produto selecionado na oferta'}</p>}
            {typeof offerPrice === 'number' && <p>Preço da oferta: <strong>{fmtBRL(offerPrice)}</strong></p>}
            {!!selected.offer?.included?.length && <ul className="space-y-1">
              {selected.offer.included.map((item, position) => <li key={`${item.ingredientId}-${position}`}>{item.qty} × {ingredients.find(ingredient => ingredient.id === item.ingredientId)?.name || 'Adicional da oferta'} — cortesia, sem cobrança adicional</li>)}
            </ul>}
            {!selectedProductId && <p className="text-zinc-300">Consulte as condições na descrição acima. Esta campanha ainda não possui um produto configurado para inclusão automática no carrinho.</p>}
            {selected.startDate && <p>Início: {dateLabel(selected.startDate)}</p>}
            {selected.endDate ? <p>Válida até: {dateLabel(selected.endDate)} (horário de Brasília)</p> : <p>Sem data final cadastrada.</p>}
          </div>
          {selectedProductId ? <button type="button" onClick={() => {
            if (!isCampaignLive(selected)) { setNow(Date.now()); return }
            notifyOffer(selected); setSelectedId(null)
          }} className="rounded-lg bg-[#E10600] px-5 py-3 text-sm font-bold text-white">Adicionar oferta ao carrinho</button>
          : <a href={destination} target={destination.startsWith('https:') ? '_blank' : undefined}
              rel={destination.startsWith('https:') ? 'noopener noreferrer' : undefined}
              onClick={event => {
                setSelectedId(null)
                if (destination.startsWith('#')) {
                  event.preventDefault()
                  document.getElementById(destination.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }} className="rounded-lg bg-[#E10600] px-5 py-3 text-center text-sm font-bold text-white">{selected.ctaText || 'Ver cardápio'}</a>}
        </>}
      </DialogContent>
    </Dialog>
  </>
}
