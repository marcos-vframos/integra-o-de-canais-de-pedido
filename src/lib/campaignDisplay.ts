import type { PromotionalCampaign } from '@/lib/campaignOffer'

export interface CampaignSchedule {
  mode: 'always' | 'weekly' | 'dates'
  weekdays: number[]
  dates: string[]
  allDay: boolean
  startTime: string
  endTime: string
}
export const defaultCampaignSchedule = (): CampaignSchedule => ({ mode: 'always', weekdays: [], dates: [], allDay: true, startTime: '18:00', endTime: '23:00' })
export const campaignDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export function scheduleError(s?: CampaignSchedule): string {
  if (!s) return ''
  if (!['always','weekly','dates'].includes(s.mode)) return 'Escolha a frequência do anúncio.'
  if (s.mode === 'weekly' && (!Array.isArray(s.weekdays) || !s.weekdays.length || s.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6))) return 'Selecione os dias da semana.'
  if (s.mode === 'dates' && (!Array.isArray(s.dates) || !s.dates.length || s.dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10) !== d))) return 'Adicione datas válidas para o anúncio.'
  if (typeof s.allDay !== 'boolean') return 'Defina o horário da campanha.'
  if (!s.allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.endTime) || s.startTime === s.endTime)) return 'Informe horários diferentes para início e fim, ou marque o dia inteiro.'
  return ''
}
export function campaignScheduleLabel(s?: CampaignSchedule): string {
  if (!s) return 'Todos os dias'
  const days = s.mode === 'weekly' ? (s.weekdays || []).map(d => campaignDayNames[d]).join(', ') : s.mode === 'dates' ? (s.dates || []).map(d => d.split('-').reverse().join('/')).join(', ') : 'Todos os dias'
  return `${days} · ${s.allDay ? 'dia inteiro' : `${s.startTime} às ${s.endTime}${s.endTime < s.startTime ? ' do dia seguinte' : ''}`} (Brasília)`
}
export function matchesCampaignSchedule(s: CampaignSchedule | undefined, now: number): boolean {
  if (!s) return true
  if (scheduleError(s) || !Number.isFinite(now)) return false
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const part = (key: string) => parts.find(p => p.type === key)!.value
  let date = `${part('year')}-${part('month')}-${part('day')}`
  const time = `${part('hour')}:${part('minute')}`
  if (!s.allDay) {
    if (s.startTime < s.endTime) {
      if (time < s.startTime || time >= s.endTime) return false
    } else {
      if (time >= s.endTime && time < s.startTime) return false
      if (time < s.endTime) date = new Date(Date.parse(date) - 86400000).toISOString().slice(0,10)
    }
  }
  return s.mode === 'always' || (s.mode === 'dates' ? s.dates.includes(date) : s.weekdays.includes(new Date(date).getUTCDay()))
}

/** Active flag and validity window both apply, regardless of operator permissions. */
export function isCampaignLive(campaign: Pick<PromotionalCampaign, 'active' | 'startDate' | 'endDate' | 'schedule'>, now = Date.now()): boolean {
  const start = campaign.startDate ? Date.parse(campaign.startDate) : -Infinity
  const end = campaign.endDate ? Date.parse(campaign.endDate) : Infinity
  return !!campaign.active && now >= start && now <= end && matchesCampaignSchedule(campaign.schedule, now)
}

export function campaignDestination(value?: string): string {
  const target = (value || '').trim()
  if (target === '#fazer-pedido' || !target) return '#cardapio'
  if (target.startsWith('#') || /^\/(?!\/)/.test(target)) return target
  try {
    const url = new URL(target)
    if (url.protocol === 'https:') return url.href
  } catch { /* Invalid destinations fall back to the integrated menu. */ }
  return '#cardapio'
}

export function campaignMediaIsVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url)
}

/** Explicit selection wins only while eligible; keep the existing fallback otherwise. */
export function selectOpeningCampaign<T extends { id: string; active?: boolean; startDate?: string; endDate?: string }>(
  campaigns: T[], primaryId: string | null, now = Date.now(),
): T | null {
  const eligible = campaigns.filter(campaign => isCampaignLive(campaign, now))
  return eligible.find(campaign => campaign.id === primaryId) || eligible[0] || null
}
