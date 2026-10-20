import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2, Pencil, Palette, AlertTriangle, Upload, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import pb, { backendConfigured, backendConfigMessage } from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { AdobeColorPicker } from '@/components/AdobeColorPicker'
import { DEFAULT_THEME_COLORS, type LandingThemeColors, useLandingContent } from '@/context/LandingContentContext'
import { OCCASION_PALETTES } from '@/lib/occasionPalettes'
import { loadPromotionPalettes, savePromotionPalette, type SavedPromotionPalette } from '@/lib/promotionPaletteStore'
import type { MenuItem, InventoryItem } from '@/types/loyolas'

type CampaignOffer = { productId: string; unitPrice?: number; included: { ingredientId: string; qty: number }[] }
interface CampaignRow {
  id: string
  title: string
  badge?: string
  description?: string
  active?: boolean
  startDate?: string
  endDate?: string
  ctaText?: string
  ctaUrl?: string
  palette?: Partial<LandingThemeColors>
  images?: string[]
  media?: string
  offer?: CampaignOffer
  created?: string
}
interface CampaignDraft {
  id?: string
  title: string
  badge: string
  description: string
  active: boolean
  startDate: string
  endDate: string
  ctaText: string
  ctaUrl: string
  imageUrl: string
  palette: LandingThemeColors
  existingMedia?: string
  offer: CampaignOffer
}
const emptyDraft = (): CampaignDraft => ({
  title: '', badge: '', description: '', active: false, startDate: '', endDate: '',
  ctaText: 'Ver oferta', ctaUrl: '#fazer-pedido', imageUrl: '',
  palette: { ...DEFAULT_THEME_COLORS },
  offer: { productId: '', included: [] },
})
const toInputDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
const toPocketBaseDate = (value: string) => value ? new Date(value).toISOString().replace('T',' ') : ''
const fields: { key: keyof LandingThemeColors; label: string; role: string }[] = [
  {key:'bgPrimary', label:'Fundo principal',role:'Overlay e fundo de destaque'},
  {key:'bgSecondary',label:'Fundo secundário',role:'Painel da campanha'},
  {key:'bgCard',label:'Cards',role:'Área da imagem e destaques'},
  {key:'accentVinho',label:'Acento',role:'Botão, selos e chamadas'},
  {key:'accentVinhoHover',label:'Acento hover',role:'Interação dos botões'},
  {key:'accentSilver',label:'Acento claro',role:'Textos e detalhes'},
]
const validCta = (value: string) => value.startsWith('/') || value.startsWith('#') || /^https:\/\//i.test(value)

export default function SeasonalCampaignAdmin() {
  const navigate = useNavigate()
  const { content, saveTheme } = useLandingContent()
  const [items, setItems] = useState<CampaignRow[]>([])
  const [products, setProducts] = useState<MenuItem[]>([])
  const [ingredients, setIngredients] = useState<InventoryItem[]>([])
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft)
  const [savedPromos, setSavedPromos] = useState<SavedPromotionPalette[]>([])
  const [paletteName, setPaletteName] = useState('')
  const [showAdobe, setShowAdobe] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [paletteSaving, setPaletteSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})
  const [success, setSuccess] = useState('')

  const canWrite = backendConfigured && pb.authStore.hasSession
  const load = async () => {
    if (!backendConfigured) { setItems([]); return [] as CampaignRow[] }
    setLoading(true)
    try {
      const rows = await pb.collection('seasonal_campaigns').getFullList({ sort: '-created' })
      const records = rows as unknown as CampaignRow[]
      setItems(records)
      return records
    } catch (e: unknown) {
      setError('Falha ao carregar campanhas: ' + getErrorMessage(e))
      return [] as CampaignRow[]
    } finally { setLoading(false) }
  }
  const reloadPalettes = async () => {
    if (!backendConfigured) return
    try { setSavedPromos(await loadPromotionPalettes()) }
    catch (e: unknown) { setError('Falha ao carregar paletas de promoção: ' + getErrorMessage(e)) }
  }
  useEffect(() => {
    void load(); void reloadPalettes()
    // The selector uses public catalog/projection in demo; saving still requires authorized staff.
    void Promise.all([
      pb.collection('menu').getFullList<MenuItem>({ sort: 'name' }),
      pb.collection('inventory').getFullList<InventoryItem>({ sort: 'name' }),
    ]).then(([menu, stock]) => { setProducts(menu.filter(p => p.active)); setIngredients(stock.filter(s => s.group === 'Ingrediente')) })
      .catch(e => setError('Não foi possível carregar os produtos e ingredientes: '+getErrorMessage(e)))
  }, [])
  useRealtime('seasonal_campaigns', () => { void load() })
  useRealtime('landing_content', () => { void reloadPalettes() })
  useEffect(() => {
    if (!mediaFile) { setLocalPreview(''); return }
    const objectUrl = URL.createObjectURL(mediaFile)
    setLocalPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [mediaFile])

  const update = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))
  const edit = (row: CampaignRow) => {
    setDraft({
      id: row.id, title: row.title || '', badge: row.badge || '', description: row.description || '',
      active: !!row.active, startDate: toInputDate(row.startDate), endDate: toInputDate(row.endDate),
      ctaText: row.ctaText || 'Ver oferta', ctaUrl: row.ctaUrl || '#fazer-pedido',
      imageUrl: Array.isArray(row.images) ? row.images[0] || '' : '',
      existingMedia: row.media ? pb.files.getURL(row, row.media) : '',
      palette: { ...DEFAULT_THEME_COLORS, ...(row.palette || {}) },
      offer: { productId: row.offer?.productId || '', unitPrice: row.offer?.unitPrice, included: Array.isArray(row.offer?.included) ? row.offer.included : [] },
    })
    setMediaFile(null); setError(''); setSuccess(''); setFieldErrors({})
  }
  const palettes = useMemo(() => [
    ...OCCASION_PALETTES.map(p => ({id: p.id, name: p.name, colors: p.colors, group: p.group })),
    ...savedPromos.map(p => ({id: p.id, name: 'Minha paleta: ' + p.name, colors: p.colors, group: 'salvas' })),
    ...content.themePresets.map(p => ({id: p.id, name: 'Interface: ' + p.name, colors: p.colors, group: 'interface' })),
  ], [savedPromos, content.themePresets])
  const changePalette = (key: keyof LandingThemeColors, value: string) => {
    update('palette', { ...draft.palette, [key]: value })
    setSuccess('')
  }
  const saveAsInterface = async () => {
    if (!paletteName.trim()) { setError('Informe o nome da paleta antes de salvar.'); return }
    if (!canWrite) { setError('Não foi possível salvar: ' + backendConfigMessage + ' É necessário conectar o backend e autenticar o Gestor.'); return }
    setPaletteSaving(true); setError(''); setSuccess('')
    try {
      const id = 'interface_' + Date.now()
      await saveTheme(id, draft.palette, [...content.themePresets, {id, name: paletteName.trim(), colors: draft.palette}])
      setSuccess('Paleta salva na área de interface e aplicada à Landing. Atualize a Landing com F5.')
      setPaletteName('')
    } catch (e: unknown) { setError('Falha ao salvar paleta de interface: ' + getErrorMessage(e)) }
    finally { setPaletteSaving(false) }
  }
  const saveAsPromotion = async () => {
    if (!paletteName.trim()) { setError('Informe o nome da paleta antes de salvar.'); return }
    if (!canWrite) { setError('Não foi possível salvar: ' + backendConfigMessage + ' É necessário conectar o backend e autenticar o Gestor.'); return }
    setPaletteSaving(true); setError(''); setSuccess('')
    try {
      const stored = await savePromotionPalette({id: 'promocao_' + Date.now(), name: paletteName.trim(), colors: {...draft.palette}})
      setSavedPromos(stored)
      setSuccess('Paleta salva no catálogo de promoções. Você pode reutilizá-la em outras campanhas.')
      setPaletteName('')
    } catch (e: unknown) { setError(getErrorMessage(e)) }
    finally { setPaletteSaving(false) }
  }

  const save = async () => {
    setError(''); setFieldErrors({}); setSuccess('')
    if (!draft.title.trim()) { setError('Informe o título da campanha.'); return }
    if (draft.startDate && draft.endDate && new Date(draft.endDate) < new Date(draft.startDate)) {
      setError('A data final deve ser posterior à data inicial.'); return
    }
    if (draft.ctaUrl && !validCta(draft.ctaUrl.trim())) {
      setError('O destino do botão deve começar com /, # ou https://.'); return
    }
    if (draft.imageUrl.trim().startsWith('data:')) {
      setError('Imagem em base64 não pode ser salva no campo de URL. Reenvie o arquivo em "Carregar arquivo".')
      return
    }
    if (!backendConfigured) { setError(backendConfigMessage + ' A campanha não foi salva: o Gestor e a Landing ainda não compartilham um banco operacional.'); return }
    if (!pb.authStore.hasSession) {
      setError('Campanha não salva. Para publicar dados reais, entre com uma conta de operador autorizada no Supabase. Você poderá retornar aqui com os dados preenchidos.')
      return
    }
    if (draft.offer.productId) {
      const product = products.find(p => p.id === draft.offer.productId)
      if (!product) { setError('Escolha um produto válido na lista de ofertas.'); return }
      if (draft.offer.unitPrice !== undefined && (!Number.isFinite(draft.offer.unitPrice) || draft.offer.unitPrice < 0 || draft.offer.unitPrice > product.price)) {
        setError('O preço anunciado deve estar entre R$ 0,00 e o preço normal do produto.'); return
      }
      if (draft.offer.included.some(i=>!ingredients.some(s=>s.id===i.ingredientId) || !Number.isInteger(i.qty) || i.qty<1 || i.qty>10)) {
        setError('Verifique os ingredientes gratuitos e quantidades da oferta.'); return
      }
    }
    setSaving(true)
    try {
      const payload = new FormData()
      payload.append('title', draft.title.trim())
      payload.append('badge', draft.badge.trim())
      payload.append('description', draft.description.trim())
      payload.append('active', String(draft.active))
      payload.append('startDate', toPocketBaseDate(draft.startDate))
      payload.append('endDate', toPocketBaseDate(draft.endDate))
      payload.append('ctaText', draft.ctaText.trim() || 'Ver oferta')
      payload.append('ctaUrl', draft.ctaUrl.trim() || '#fazer-pedido')
      payload.append('palette', JSON.stringify(draft.palette))
      payload.append('offer', JSON.stringify(draft.offer.productId ? draft.offer : {}))
      payload.append('images', JSON.stringify(draft.imageUrl.trim() ? [draft.imageUrl.trim()] : []))
      if (mediaFile) payload.append('media', mediaFile)
      const record = draft.id
        ? await pb.collection('seasonal_campaigns').update(draft.id, payload)
        : await pb.collection('seasonal_campaigns').create(payload)
      const rows = await load()
      if (!rows.some(r => r.id === record.id)) throw new Error('O banco não confirmou a campanha criada. Atualize e confira.')
      setDraft(emptyDraft()); setMediaFile(null)
      setSuccess('Campanha salva no Supabase. A oferta vinculada será aplicada ao carrinho sem cobrança dos brindes.')
    } catch (e: unknown) {
      setFieldErrors(extractFieldErrors(e))
      setError('Não foi possível criar a campanha: ' + getErrorMessage(e))
    } finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    if (!confirm('Excluir esta campanha sazonal?')) return
    if (!canWrite) { setError('A exclusão exige backend próprio e autenticação.'); return }
    try {
      await pb.collection('seasonal_campaigns').delete(id)
      if (draft.id === id) setDraft(emptyDraft())
      await load()
      setSuccess('Campanha excluída.')
    } catch (e: unknown) { setError('Falha ao excluir: ' + getErrorMessage(e)) }
  }
  const filename = mediaFile?.name || (draft.existingMedia ? 'Arquivo já cadastrado' : '')
  const preview = localPreview || draft.existingMedia || (draft.imageUrl.startsWith('data:') ? '' : draft.imageUrl)
  const isVideo = mediaFile?.type.startsWith('video/') || /\.(mp4|webm)(\?|$)/i.test(preview)

  return (
    <section className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 shadow-xl space-y-5" aria-label="Editor de campanhas sazonais">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Campanhas sazonais e overlay imersivo</h2>
          <p className="text-xs text-zinc-400">Cada campanha tem paleta individual. Ative o período para exibi-la na Landing.</p>
        </div>
        <button type="button" onClick={() => {setDraft(emptyDraft()); setMediaFile(null); setError(''); setSuccess(''); setFieldErrors({})}} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-white"><Plus size={15}/> Nova campanha</button>
      </div>
      {!backendConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200" role="status">
          <AlertTriangle size={18} className="shrink-0"/> <span><strong>Gestor em modo demonstração.</strong> {backendConfigMessage} Sem um PocketBase próprio, as campanhas não podem ser gravadas nem aparecer em outro domínio. Os seletores podem ser experimentados localmente.</span>
        </div>
      )}
      {backendConfigured && !pb.authStore.hasSession && (
        <p className="rounded-lg border border-amber-500/30 p-3 text-xs text-amber-200">A prévia está disponível, mas salvar campanhas, paletas e imagens exige ativar uma conta de operador autorizada. <Link to="/login?returnTo=/adm-landing" className="font-bold underline ml-1">Ativar edição no Gestor</Link>.</p>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{error}
        {Object.keys(fieldErrors).length > 0 && <ul className="mt-2 list-disc pl-4">{Object.entries(fieldErrors).map(([field,message])=><li key={field}>{field}: {message}</li>)}</ul>}
      </div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 size={17}/>{success}</div>}
      {draft.id && <p className="text-xs text-amber-300">Editando: <strong>{draft.title}</strong> — as alterações são específicas desta campanha.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-zinc-300">Título da campanha<input value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="Ex.: Halloween do Loyola's" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300">Selo<input value={draft.badge} onChange={e=>update('badge',e.target.value)} placeholder="Halloween 2026" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300">Início<input type="datetime-local" value={draft.startDate} onChange={e=>update('startDate',e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300">Fim<input type="datetime-local" value={draft.endDate} onChange={e=>update('endDate',e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300">Texto do botão<input value={draft.ctaText} onChange={e=>update('ctaText',e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300">Destino do botão (URL ou #fazer-pedido)<input value={draft.ctaUrl} onChange={e=>update('ctaUrl',e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <label className="text-xs text-zinc-300 md:col-span-2">Endereço de imagem/vídeo (opcional)<input value={draft.imageUrl} onChange={e=>update('imageUrl',e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white"><Upload size={14}/> Carregar imagem, vídeo ou PDF
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" className="hidden" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&file.size>15*1024*1024){setError('O arquivo ultrapassa 15 MB. Use uma URL externa para arquivos maiores.');return}setMediaFile(file);setError('');}}/>
          </label>
          <span className="text-[11px] text-zinc-400">{filename || 'Nenhum arquivo selecionado'}</span>
          {mediaFile && <button type="button" onClick={()=>setMediaFile(null)} className="text-xs text-zinc-400 underline">Cancelar seleção</button>}
        </div>
        {preview && <div className="md:col-span-2 max-h-48 overflow-hidden rounded-lg border border-zinc-700 bg-black">{isVideo ? <video src={preview} controls className="max-h-48 w-full object-contain"/> : !preview.toLowerCase().endsWith('.pdf') ? <img src={preview} alt="Prévia da campanha" className="max-h-48 w-full object-contain"/> : <span className="p-4 text-xs text-zinc-300">PDF selecionado para a campanha</span>}</div>}
        <label className="md:col-span-2 text-xs text-zinc-300">Descrição<textarea value={draft.description} onChange={e=>update('description',e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
      </div>
      <div className="space-y-3 rounded-xl border border-amber-500/20 bg-zinc-950/70 p-4">
        <h3 className="text-sm font-bold text-white">Oferta vinculada ao carrinho</h3>
        <p className="text-xs text-zinc-400">Configure o produto anunciado e os ingredientes oferecidos sem custo. O checkout confirma preço e cortesia diretamente no banco.</p>
        <label className="block text-xs text-zinc-200">Produto da oferta
          <select value={draft.offer.productId} onChange={e => update('offer',{productId:e.target.value,included:[]})} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white">
            <option value="">Somente campanha institucional (sem produto)</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</option>)}
          </select>
        </label>
        {draft.offer.productId && <>
          <label className="block text-xs text-zinc-200">Preço anunciado por unidade (R$)
            <input type="number" min="0" step="0.01" value={draft.offer.unitPrice ?? products.find(p=>p.id===draft.offer.productId)?.price ?? ''} onChange={e=>update('offer',{...draft.offer,unitPrice:e.target.value===''?undefined:Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white"/>
          </label>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-200">Adicionais incluídos no anúncio — sem custo</div>
            {draft.offer.included.map((entry,idx)=><div key={idx} className="flex flex-wrap items-center gap-2">
              <select value={entry.ingredientId} onChange={e=>update('offer',{...draft.offer,included:draft.offer.included.map((a,i)=>i===idx?{...a,ingredientId:e.target.value}:a)})} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-white">
                <option value="">Escolha um ingrediente</option>
                {ingredients.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" aria-label="Quantidade gratuita por unidade" min="1" max="10" value={entry.qty} onChange={e=>update('offer',{...draft.offer,included:draft.offer.included.map((a,i)=>i===idx?{...a,qty:Number(e.target.value)}:a)})} className="w-16 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-white"/>
              <button type="button" onClick={()=>update('offer',{...draft.offer,included:draft.offer.included.filter((_,i)=>i!==idx)})} className="rounded-lg bg-zinc-800 p-2 text-red-300" aria-label="Remover ingrediente gratuito"><Trash2 size={14}/></button>
            </div>)}
            <button type="button" onClick={()=>update('offer',{...draft.offer,included:[...draft.offer.included,{ingredientId:'',qty:1}]})} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-white"><Plus size={13} className="inline"/> Adicionar ingrediente gratuito</button>
          </div>
          <p className="text-xs text-amber-200">A cortesia integra a descrição e a baixa de estoque, mas não o valor cobrado. Outros adicionais escolhidos fora da oferta seguem o preço normal.</p>
        </>}
      </div>
      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Palette size={16}/> Paleta desta campanha</h3>
          <button type="button" onClick={()=>setShowAdobe(v=>!v)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white">{showAdobe ? 'Recolher seletor Adobe' : 'Editar com seletor estilo Adobe (HSV/HEX/RGB)'}</button>
        </div>
        <label className="block text-xs text-zinc-300">Paletas prontas e salvas
          <select defaultValue="" onChange={e=>{const chosen=palettes.find(p=>p.id===e.target.value);if(chosen){update('palette',{...chosen.colors});setSuccess('Paleta "'+chosen.name+'" aplicada à campanha em edição. Salve a campanha para publicar.') }}} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white">
            <option value="">Escolha uma ocasião (Mães, Pais, Crianças, Natal, Páscoa, férias, estações...)</option>
            {palettes.map(p=><option key={p.group+':'+p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map(f=><label key={f.key} className="min-w-0 space-y-1 text-[11px] text-zinc-300"><span className="block font-semibold">{f.label}</span><span className="block min-h-7 text-[10px] text-zinc-500">{f.role}</span><div className="flex items-center gap-1"><input type="color" value={draft.palette[f.key]} onChange={e=>changePalette(f.key,e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-white/20 bg-transparent"/><span className="truncate font-mono text-[10px]">{draft.palette[f.key]}</span></div></label>)}
        </div>
        {showAdobe && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map(f=><AdobeColorPicker key={f.key} label={f.label+' — '+f.role} color={draft.palette[f.key]} onChange={value=>changePalette(f.key,value)}/>)}</div>}
        <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3 space-y-3">
          <label className="block text-xs text-zinc-300">Salvar paleta com o nome<input value={paletteName} onChange={e=>setPaletteName(e.target.value)} placeholder="Ex.: Halloween Loyola's 2026" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white"/></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={paletteSaving} onClick={saveAsInterface} className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Salvar como paleta da interface</button>
            <button type="button" disabled={paletteSaving} onClick={saveAsPromotion} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Salvar como paleta de promoção</button>
          </div>
          <p className="text-[11px] text-zinc-500">Paleta da interface altera o tema-base da Landing. Paleta de promoção entra no catálogo de campanhas; não muda as demais promoções.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-200"><input type="checkbox" checked={draft.active} onChange={e=>update('active',e.target.checked)}/>Campanha ativa</label>
      <button type="button" disabled={saving || !draft.title.trim()} onClick={() => { if (!pb.authStore.hasSession) { navigate('/login?returnTo=/adm-landing'); return } void save() }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Save size={16}/>{saving?'Salvando...':!pb.authStore.hasSession?'Ativar edição para publicar':draft.id?'Atualizar campanha':'Criar campanha'}</button>
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-xs font-bold uppercase text-zinc-300">Campanhas cadastradas {loading ? '— carregando' : '('+items.length+')'}</h3>
        {items.length>0 && <div className="mt-3 grid gap-3 md:grid-cols-2">{items.map(row=><div key={row.id} className="rounded-xl border border-white/10 bg-zinc-900 p-3"><div className="flex justify-between gap-2"><button type="button" onClick={()=>edit(row)} className="flex-1 text-left"><span className="block text-sm font-bold text-white">{row.title}</span><span className="block text-[11px] text-zinc-400">{row.active?'Ativa':'Inativa'} • {row.startDate?new Date(row.startDate).toLocaleDateString('pt-BR'):'Sem início'} a {row.endDate?new Date(row.endDate).toLocaleDateString('pt-BR'):'sem fim'}</span><span className="mt-1 flex items-center gap-1 text-xs text-emerald-400"><Pencil size={12}/> Editar campanha e cores</span></button><button type="button" aria-label={'Excluir campanha '+row.title} onClick={()=>void remove(row.id)} className="text-zinc-400 hover:text-red-400"><Trash2 size={16}/></button></div></div>)}</div>}
      </div>
    </section>
  )
}
