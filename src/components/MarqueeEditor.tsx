import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { marqueeBlocks, selectedMessages, type MarqueeBlock } from '@/lib/landingCommunications'
import pb from '@/lib/pocketbase/client'
import { useLandingContent } from '@/context/LandingContentContext'

/**
 * Edição isolada da barra de movimento. Salva apenas a seção "marquee":
 * alterações de textos não sobrescrevem o Hero nem outros blocos da Landing.
 */
export default function MarqueeEditor() {
  const { content, saveSection } = useLandingContent()
  const [items, setItems] = useState<MarqueeBlock[]>(() => marqueeBlocks(content.marqueeBlocks, content.marqueeItems))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!dirty) setItems(marqueeBlocks(content.marqueeBlocks, content.marqueeItems))
  }, [content.marqueeItems, content.marqueeBlocks, dirty])

  const change = (next: MarqueeBlock[]) => {
    setItems(next)
    setDirty(true)
    setFeedback(null)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    change(next)
  }

  const save = async () => {
    if (saving) return
    const cleaned = items.map(s => ({...s, text:s.text.trim()}))
    if (cleaned.some(s => !s.text) || cleaned.filter(s => s.selected).length > 12) {
      setFeedback({ ok: false, message: 'Preencha todas as mensagens e selecione no máximo 12.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      await saveSection('marquee', { marqueeBlocks: cleaned, marqueeItems: selectedMessages(cleaned) })
      // Confirma no banco que exatamente os textos enviados foram persistidos.
      const record = await pb.collection('landing_content').getFirstListItem('section="marquee"')
      const stored = (record.data as { marqueeBlocks?: unknown })?.marqueeBlocks
      if (!Array.isArray(stored) || JSON.stringify(stored) !== JSON.stringify(cleaned)) {
        throw new Error('O banco não confirmou as frases salvas. Tente novamente.')
      }
      setItems(cleaned)
      setDirty(false)
      setFeedback({ ok: true, message: 'Faixa atualizada e salva no Supabase. Abra ou atualize a Landing para conferir.' })
    } catch (error: unknown) {
      setFeedback({
        ok: false,
        message: error instanceof Error ? error.message : 'Não foi possível salvar a faixa no Supabase.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 shadow-xl space-y-4" aria-label="Editor da faixa em movimento">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">Barra em movimento — editar frases</h3>
          <p className="mt-1 text-xs text-zinc-400">Edite os blocos salvos e selecione até 12 mensagens para a Landing. As desmarcadas permanecem salvas.</p>
        </div>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar frases da barra'}
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-950/70 p-2">
            <label className="flex items-center gap-1 text-[11px] text-zinc-400">
              <input type="checkbox" aria-label={`Exibir mensagem ${index+1} na barra`} checked={item.selected}
                disabled={saving || (!item.selected && items.filter(x => x.selected).length >= 12)}
                onChange={e => change(items.map((x,i) => i === index ? {...x,selected:e.target.checked} : x))} /> Exibir
            </label>
            <label htmlFor={`marquee-text-${index}`} className="min-w-[60px] text-[11px] text-zinc-400">
              Frase {index + 1}
            </label>
            <input
              id={`marquee-text-${index}`}
              type="text"
              maxLength={160}
              value={item.text}
              disabled={saving}
              onChange={e => change(items.map((text, i) => i === index ? {...text,text:e.target.value} : text))}
              className="min-w-[180px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
            />
            <button type="button" disabled={saving || index === 0} onClick={() => move(index,index-1)} title="Mover para cima" aria-label={`Mover frase ${index + 1} para cima`} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowUp size={15}/></button>
            <button type="button" disabled={saving || index === items.length - 1} onClick={() => move(index,index+1)} title="Mover para baixo" aria-label={`Mover frase ${index + 1} para baixo`} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowDown size={15}/></button>
            <button type="button" disabled={saving || items.length === 1} onClick={() => change(items.filter((_,i) => i !== index))} title="Excluir frase" aria-label={`Excluir frase ${index + 1}`} className="rounded-lg p-2 text-red-400 hover:bg-red-900/20 disabled:opacity-30"><Trash2 size={15}/></button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => change([...items, {id:crypto.randomUUID(),text:'',selected:items.filter(x=>x.selected).length < 12}])} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"><Plus size={14}/> Adicionar frase</button>
        <span className="text-xs text-zinc-400">{items.filter(x=>x.selected).length}/12 selecionadas</span>
        {dirty && <span className="text-xs text-amber-300">Alterações ainda não salvas</span>}
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0D1A11] p-3" aria-label="Prévia das mensagens">
        <span className="block pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Prévia das mensagens</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {selectedMessages(items).map((text,i) => (
            <span key={i} className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-200">{i > 0 && <span className="text-[#8F0F1B]">•</span>}{text}</span>
          ))}
        </div>
      </div>
      {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.message}</p>}
    </section>
  )
}
