import { useState } from 'react'
import { AdobeColorPicker } from './AdobeColorPicker'
import { THEME_COLOR_FIELDS } from '@/lib/themePaletteCatalog'
import type { LandingThemeColors } from '@/context/LandingContentContext'
export default function ThemeAdobeMenu({colors,onChange,onSave,busy}:{colors:LandingThemeColors;onChange:(colors:LandingThemeColors)=>void;onSave:(name:string)=>Promise<void>;busy:boolean}) {
 const [name,setName]=useState('')
 return <details>
  <summary className="cursor-pointer list-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-medium text-white">Editor Adobe · abrir / recolher</summary>
  <div className="absolute left-0 right-0 top-full z-40 mt-2 w-full max-h-[70dvh] overflow-y-auto rounded-xl border border-zinc-700 bg-[#12141c] p-4 shadow-2xl">
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{THEME_COLOR_FIELDS.map(f=><AdobeColorPicker key={f.key} label={f.label} color={colors[f.key]} onChange={hex=>onChange({...colors,[f.key]:hex})}/>)}</div>
   <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs text-zinc-300">Nome da cópia<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-white"/></label><button type="button" disabled={busy||!name.trim()} onClick={()=>void onSave(name)} className="rounded bg-zinc-700 p-2 text-xs text-white disabled:opacity-40">Salvar como novo cartão</button></div>
  </div>
 </details>
}
