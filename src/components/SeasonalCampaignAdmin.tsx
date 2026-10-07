import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { DEFAULT_THEME_COLORS, LandingThemeColors } from '@/context/LandingContentContext'

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
}

const emptyDraft = (): CampaignDraft => ({
  title: '', badge: '', description: '', active: false, startDate: '', endDate: '',
  ctaText: 'Ver oferta', ctaUrl: '/loja', imageUrl: '', palette: { ...DEFAULT_THEME_COLORS },
})

export default function SeasonalCampaignAdmin() {
  const [items, setItems] = useState<any[]>([])
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try { setItems(await pb.collection('seasonal_campaigns').getFullList({ sort: '-startDate,-created' })) }
    catch (e) { console.warn('Erro ao carregar campanhas sazonais', e) }
  }
  useEffect(() => { load() }, [])
  useRealtime('seasonal_campaigns', load)

  const edit = (row: any) => setDraft({
    id: row.id, title: row.title || '', badge: row.badge || '', description: row.description || '',
    active: !!row.active, startDate: row.startDate ? String(row.startDate).slice(0,16) : '',
    endDate: row.endDate ? String(row.endDate).slice(0,16) : '', ctaText: row.ctaText || 'Ver oferta',
    ctaUrl: row.ctaUrl || '/loja', imageUrl: Array.isArray(row.images) ? row.images[0] || '' : '',
    palette: { ...DEFAULT_THEME_COLORS, ...(row.palette || {}) },
  })

  const save = async () => {
    if (!draft.title.trim()) return
    setSaving(true)
    const payload = {
      title: draft.title.trim(), badge: draft.badge.trim(), description: draft.description.trim(),
      active: draft.active, startDate: draft.startDate || null, endDate: draft.endDate || null,
      ctaText: draft.ctaText.trim(), ctaUrl: draft.ctaUrl.trim() || '/loja',
      images: draft.imageUrl.trim() ? [draft.imageUrl.trim()] : [], palette: draft.palette,
    }
    try {
      if (draft.id) await pb.collection('seasonal_campaigns').update(draft.id, payload)
      else await pb.collection('seasonal_campaigns').create(payload)
      setDraft(emptyDraft()); await load()
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir esta campanha sazonal?')) return
    await pb.collection('seasonal_campaigns').delete(id)
    if (draft.id === id) setDraft(emptyDraft())
    await load()
  }

  const colorFields: Array<[keyof LandingThemeColors,string]> = [
    ['bgPrimary','Fundo principal'],['bgSecondary','Fundo secundário'],['bgCard','Cards'],
    ['accentVinho','Acento'],['accentVinhoHover','Acento hover'],['accentSilver','Acento claro'],
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div><h2 className="text-sm font-bold uppercase tracking-wider text-white">Campanhas sazonais & overlay imersivo</h2><p className="text-xs text-zinc-400">A campanha ativa e dentro do período assume temporariamente a paleta e abre o overlay na landing.</p></div>
        <button onClick={() => setDraft(emptyDraft())} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Nova campanha</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Título da campanha" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input value={draft.badge} onChange={e=>setDraft({...draft,badge:e.target.value})} placeholder="Selo (ex: Natal 2026)" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input type="datetime-local" value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input type="datetime-local" value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input value={draft.ctaText} onChange={e=>setDraft({...draft,ctaText:e.target.value})} placeholder="Texto do CTA" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input value={draft.ctaUrl} onChange={e=>setDraft({...draft,ctaUrl:e.target.value})} placeholder="/loja" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <input value={draft.imageUrl} onChange={e=>setDraft({...draft,imageUrl:e.target.value})} placeholder="URL da imagem imersiva" className="md:col-span-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
        <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descrição" rows={3} className="md:col-span-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"/>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {colorFields.map(([key,label])=><label key={key} className="text-[11px] text-zinc-400">{label}<div className="mt-1 flex items-center gap-2"><input type="color" value={draft.palette[key]} onChange={e=>setDraft({...draft,palette:{...draft.palette,[key]:e.target.value}})} className="h-8 w-10 rounded border-0 bg-transparent"/><span className="font-mono text-zinc-300">{draft.palette[key]}</span></div></label>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/>Campanha ativa</label>
      <button disabled={saving || !draft.title.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Save className="h-4 w-4"/>{saving?'Salvando...':draft.id?'Atualizar campanha':'Criar campanha'}</button>
      {items.length > 0 && <div className="grid gap-3 md:grid-cols-2">{items.map(row=><div key={row.id} className="rounded-xl border border-white/10 bg-zinc-900 p-4"><div className="flex justify-between gap-3"><button onClick={()=>edit(row)} className="text-left"><strong className="block text-sm text-white">{row.title}</strong><span className="text-[11px] text-zinc-400">{row.active?'Ativa':'Inativa'} • {row.startDate ? String(row.startDate).slice(0,10) : 'sem início'} → {row.endDate ? String(row.endDate).slice(0,10) : 'sem fim'}</span></button><button onClick={()=>remove(row.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button></div></div>)}</div>}
    </div>
  )
}
