export interface MarqueeBlock { id: string; text: string; selected: boolean }
export function whatsappContactUrl(phone:string,fallback:string,message="Olá! Vi o site do Loyola's Lanches e quero fazer um pedido."){
 const digits=phone.replace(/\D/g,'');const number=/^55\d{10,11}$/.test(digits)?digits:/^\d{10,11}$/.test(digits)?'55'+digits:'';
 return number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):fallback
}
export function marqueeBlocks(blocks: unknown, legacy: string[]): MarqueeBlock[] {
  if (Array.isArray(blocks)) return blocks.filter(x => x && typeof x.text === 'string').map((x,i) => ({ id: typeof x.id === 'string' ? x.id : 'message-'+i, text:x.text, selected:x.selected === true }))
  return legacy.map((text,i) => ({ id:'message-'+i, text, selected:i < 12 }))
}
export function selectedMessages(blocks: MarqueeBlock[]): string[] {
  return blocks.filter(x => x.selected && x.text.trim()).slice(0,12).map(x => x.text.trim())
}
export interface LandingStory {
  id: string; caption: string; link_url: string; link_label: string; media_url: string
  media_kind: 'image' | 'video'; active: boolean; starts_at: string | null; sort_order: number
}
export function storyIsLive(story: Pick<LandingStory,'active'|'starts_at'>, now = Date.now()): boolean {
  const start = Date.parse(story.starts_at || '')
  return story.active && Number.isFinite(start) && start <= now && now < start + 86400000
}
export function safeStoryLink(value: string): string {
  const target=value.trim()
  if (!target) return ''
  if (target.startsWith('#') || /^\/(?!\/)/.test(target)) return target
  try { const url=new URL(target); return url.protocol === 'https:' ? url.href : '' } catch { return '' }
}

