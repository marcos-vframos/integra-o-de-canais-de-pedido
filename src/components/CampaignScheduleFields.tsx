import { useState } from 'react'
import { campaignDayNames, campaignScheduleLabel, type CampaignSchedule } from '@/lib/campaignDisplay'

export default function CampaignScheduleFields({value, onChange}: {value: CampaignSchedule; onChange: (value: CampaignSchedule) => void}) {
  const [date, setDate] = useState('')
  const field = 'mt-1 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white'
  return <fieldset className="space-y-3 border-b border-white/10 pb-4 text-xs text-zinc-200">
    <legend className="mb-2 text-sm font-bold text-white">Programação automática do anúncio</legend>
    <label className="block">Frequência
      <select value={value.mode} onChange={e => onChange({...value, mode: e.target.value as CampaignSchedule['mode']})} className={field + ' w-full'}>
        <option value="always">Todos os dias</option><option value="weekly">Repetir semanalmente</option><option value="dates">Datas específicas</option>
      </select>
    </label>
    {value.mode === 'weekly' && <div className="flex flex-wrap gap-3">{campaignDayNames.map((day, i) => <label key={day} className="flex items-center gap-2">
      <input type="checkbox" checked={value.weekdays.includes(i)} onChange={e => onChange({...value, weekdays: e.target.checked ? [...value.weekdays, i].sort() : value.weekdays.filter(d => d !== i)})}/>{day}
    </label>)}</div>}
    {value.mode === 'dates' && <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2"><label>Data<input aria-label="Data de exibição" type="date" value={date} onChange={e => setDate(e.target.value)} className={field + ' block'}/></label>
        <button type="button" disabled={!date} className="rounded-lg bg-zinc-700 px-3 py-2 disabled:opacity-40" onClick={() => {onChange({...value, dates: [...new Set([...value.dates, date])].sort()}); setDate('')}}>Adicionar data</button>
      </div>
      <ul className="space-y-2">{value.dates.map(d => <li key={d} className="flex items-center gap-3">{d.split('-').reverse().join('/')}<button type="button" aria-label={'Remover data ' + d} onClick={() => onChange({...value, dates: value.dates.filter(x => x !== d)})}>Remover ×</button></li>)}</ul>
    </div>}
    <label className="flex items-center gap-2"><input type="checkbox" checked={value.allDay} onChange={e => onChange({...value, allDay:e.target.checked})}/>Dia inteiro</label>
    {!value.allDay && <div className="flex flex-wrap gap-4">
      <label>Exibir a partir de<input type="time" value={value.startTime} onChange={e => onChange({...value, startTime:e.target.value})} className={field + ' block'}/></label>
      <label>Ocultar às<input type="time" value={value.endTime} onChange={e => onChange({...value, endTime:e.target.value})} className={field + ' block'}/></label>
    </div>}
    <p>{campaignScheduleLabel(value)}</p>
    <p className="text-zinc-400">Horário de Brasília. Mantenha a campanha ativa para reativá-la automaticamente em cada período. As datas de início e fim limitam a programação. Horários que atravessam a meia-noite pertencem ao dia de início.</p>
  </fieldset>
}
