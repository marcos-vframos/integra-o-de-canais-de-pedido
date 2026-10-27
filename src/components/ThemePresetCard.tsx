import { useState } from 'react'
import { Trash2, X, Copy } from 'lucide-react'
import type { LandingThemePreset, LandingThemeColors } from '@/context/LandingContentContext'
import { THEME_COLOR_FIELDS } from '@/lib/themePaletteCatalog'
import { AdobeColorPicker } from './AdobeColorPicker'

export default function ThemePresetCard({preset,active,busy,onActivate,onDelete,onDuplicate}:{
 preset:LandingThemePreset;active:boolean;busy:boolean;onActivate:()=>void;onDelete:()=>void;
 onDuplicate:(name:string,colors:LandingThemeColors)=>Promise<void>;
}) {
 const [editing,setEditing]=useState<keyof LandingThemeColors|null>(null)
 const [colors,setColors]=useState({...preset.colors})
 const [name,setName]=useState(preset.name+' — cópia')
 return <article aria-label={'Tema '+preset.name} className={'p-3.5 rounded-xl border flex flex-col gap-3 '+(active?'bg-amber-500/10 border-amber-400':'bg-zinc-900 border-white/10')}>
  <div className="flex justify-between items-start gap-2"><span className="text-xs font-bold text-white">{preset.name}</span>{preset.id!=='padrao'&&<button type="button" disabled={busy||active} onClick={onDelete} aria-label={'Remover tema '+preset.name} className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30"><Trash2 size={14}/></button>}</div>
  <div className="space-y-1.5">{THEME_COLOR_FIELDS.map(field=><button key={field.key} type="button" disabled={busy} onClick={()=>{if(!editing)setColors({...preset.colors});setEditing(field.key)}} aria-label={`Editar ${field.label} de ${preset.name}`} className="flex w-full items-center gap-2 text-left text-[11px] text-zinc-300 hover:text-white">
   <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{background:editing?colors[field.key]:preset.colors[field.key]}}/><span>{field.label}</span>
  </button>)}</div>
  {editing&&<div className="rounded-lg border border-zinc-700 p-2 space-y-3">
   <div className="flex items-center justify-between text-xs text-white"><span>Editar uma cópia</span><button type="button" aria-label="Fechar editor de cores" onClick={()=>setEditing(null)} className="p-1"><X size={13}/></button></div>
   <AdobeColorPicker compact label={THEME_COLOR_FIELDS.find(f=>f.key===editing)!.label} color={colors[editing]} onChange={hex=>setColors(prev=>({...prev,[editing]:hex}))}/>
   <label className="block text-[11px] text-zinc-300">Nome da nova versão<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-xs text-white"/></label>
   <button type="button" disabled={busy||!name.trim()} onClick={()=>void onDuplicate(name,colors)} className="flex w-full justify-center gap-1 rounded bg-zinc-700 p-2 text-xs text-white disabled:opacity-40"><Copy size={13}/>Salvar cópia com novas cores</button>
   <p className="text-[10px] text-zinc-400">A cópia será salva sem alterar este tema.</p>
  </div>}
  <button type="button" onClick={onActivate} disabled={busy} aria-pressed={active} aria-label={'Ativar tema '+preset.name} className={'mt-auto w-full rounded-lg py-1.5 text-xs font-semibold disabled:opacity-40 '+(active?'bg-amber-400 text-zinc-950':'bg-zinc-800 hover:bg-zinc-700 text-zinc-200')}>{active?'✓ Tema Ativo':'Ativar Este Tema'}</button>
 </article>
}
