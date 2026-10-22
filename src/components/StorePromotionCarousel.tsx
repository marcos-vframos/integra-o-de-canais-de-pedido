import { useEffect, useRef, useState } from 'react'
import { Tag } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { eligibleProductIds, notifyOffer, type CampaignOffer } from '@/lib/campaignOffer'
import { campaignScheduleLabel, type CampaignSchedule, campaignDestination, campaignMediaIsVideo, isCampaignLive } from '@/lib/campaignDisplay'
import useRealtime from '@/hooks/use-realtime'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { fmtBRL } from '@/lib/seeds'

interface Promo {
  id: string; title: string; badge?: string; description?: string; active?: boolean
  startDate?: string; endDate?: string; ctaText?: string; ctaUrl?: string; images?: string[]
  palette?: { accentVinho?: string; bgCard?: string; accentSilver?: string }
  media?: string
  schedule?: CampaignSchedule
  offer?: CampaignOffer
}
type CatalogEntry = { id: string; name: string; price?: number; active?: boolean }
const mediaFor = (campaign: Promo) => campaign.media
  ? pb.files.getURL(campaign, campaign.media)
  : campaign.images?.find(Boolean) || ''
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value))

export default function StorePromotionCarousel() {
  const [items, setItems] = useState<Promo[]>([])
  const [now, setNow] = useState(Date.now)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [ingredients, setIngredients] = useState<CatalogEntry[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)

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
    return () => clearInterval(timer)
  }, [])

  const promos = items.filter(campaign => isCampaignLive(campaign, now))
  const selected = promos.find(campaign => campaign.id === selectedId)
  const selectedProductIds = eligibleProductIds(selected?.offer)
  const selectedProductKey = selectedProductIds.join(',')
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selectedId, selected])
  useEffect(() => {
    if (!selectedProductKey) return
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
      if (products.status === 'rejected') setError('Não foi possível carregar os produtos participantes. Tente novamente.')
    })
    return () => { alive = false }
  }, [selectedProductKey])

  useEffect(() => {
    const open = (event: Event) => {
      const id = (event as CustomEvent<{campaignId: string}>).detail?.campaignId
      if (id) { setSelectedId(id); setNow(Date.now()) }
    }
    window.addEventListener('loyolas:open-offer', open)
    return () => window.removeEventListener('loyolas:open-offer', open)
  }, [])

  if (!promos.length) return error ? <p role="status" className="mb-4 text-sm text-amber-200">{error} <button type="button" className="underline" onClick={() => void load()}>Tentar novamente</button></p> : null
  const selectedMedia = selected ? mediaFor(selected) : ''
  const destination = campaignDestination(selected?.ctaUrl)

  return <>
    <section aria-label="Campanhas ativas" className="mb-5">
      <h2 className="mb-4 text-xl font-black text-white">Campanhas e benefícios</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map(campaign => {
          const media = mediaFor(campaign)
          const accent = campaign.palette?.accentVinho || '#E10600'
          return <button key={campaign.id} type="button"
            aria-label={`Ver detalhes da campanha ${campaign.title}`}
            onClick={event => { triggerRef.current = event.currentTarget; setSelectedId(campaign.id) }}
            className="relative flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121215] p-5 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {media && (campaignMediaIsVideo(media)
              ? <video src={media} muted playsInline preload="metadata" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40" />
              : <img src={media} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" />)}
            <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-black/30" />
            <span className="relative z-10 flex h-full flex-1 flex-col">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}><Tag size={12} />{campaign.badge || 'Campanha ativa'}</span>
              <span className="block text-xl font-black">{campaign.title}</span>
              {campaign.description && <span className="mb-4 mt-2 block line-clamp-3 text-sm text-zinc-200">{campaign.description}</span>}
              <span className="mt-auto self-start rounded-md px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}>Ver campanha e benefícios</span>
            </span>
          </button>
        })}
      </div>
      {error && <p role="status" className="pt-3 text-xs text-amber-200">{error}</p>}
    </section>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null) }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-h-[90dvh] overflow-y-auto max-w-2xl rounded-2xl border-white/15 bg-[#121215] p-5 text-white sm:p-7"
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
            {!!selectedProductIds.length && <p>Escolha um dos produtos participantes abaixo. A cortesia acompanha cada unidade.</p>}
            {!!selected.offer?.included?.length && <ul className="space-y-1">
              {selected.offer.included.map((item, position) => <li key={`${item.ingredientId}-${position}`}>{item.qty} × {ingredients.find(ingredient => ingredient.id === item.ingredientId)?.name || 'Adicional da oferta'} — cortesia, sem cobrança adicional</li>)}
            </ul>}
            {!selectedProductIds.length && <p className="text-zinc-300">Consulte as condições na descrição acima. Esta campanha ainda não possui um produto configurado para inclusão automática no carrinho.</p>}
            <p>{campaignScheduleLabel(selected.schedule)}</p>
            {selected.startDate && <p>Início: {dateLabel(selected.startDate)}</p>}
            {selected.endDate ? <p>Válida até: {dateLabel(selected.endDate)} (horário de Brasília)</p> : <p>Sem data final cadastrada.</p>}
          </div>
          {selectedProductIds.length ? <div className="space-y-2">
            <h3 className="font-bold">Produtos participantes</h3>
            {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
            {selectedProductIds.map(id => {
              const product = catalog.find(p => p.id === id)
              const unavailable = !product || product.active === false || typeof product.price !== 'number'
              return <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                <div className="min-w-0"><p className="text-sm font-semibold">{product?.name || 'Carregando produto…'}</p>
                  {product && <p className="text-xs text-zinc-300">{fmtBRL(selected.offer?.unitPrice ?? product.price ?? 0)}{selected.offer?.included?.length ? ' · cortesia incluída' : ''}</p>}
                  {product?.active === false && <p className="text-xs text-amber-200">Indisponível</p>}
                </div>
                <button type="button" disabled={unavailable} aria-label={'Adicionar oferta: ' + (product?.name || id)} onClick={() => {
                  if (!isCampaignLive(selected)) {setNow(Date.now()); return}
                  notifyOffer(selected, id); setSelectedId(null)
                }} className="shrink-0 rounded-lg bg-[#E10600] px-3 py-2 text-xs font-bold disabled:opacity-40">Adicionar</button>
              </div>
            })}
          </div>
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
