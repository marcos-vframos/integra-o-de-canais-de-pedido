import type { LandingThemeColors } from '@/context/LandingContentContext'

export interface OccasionPalette {
  id: string
  name: string
  group: 'datas-comemorativas' | 'feriados' | 'estacoes' | 'campanhas'
  colors: LandingThemeColors
}

const palette = (
  bgPrimary: string,
  bgSecondary: string,
  bgCard: string,
  accentVinho: string,
  accentVinhoHover: string,
  accentSilver: string,
): LandingThemeColors => ({
  bgPrimary, bgSecondary, bgCard, accentVinho, accentVinhoHover, accentSilver,
})

/** Independent, reusable color suggestions. Selecting them never activates a campaign. */
export const OCCASION_PALETTES: OccasionPalette[] = [
  { id: 'maes', name: 'Dia das Mães — Rosa & Champanhe', group: 'datas-comemorativas', colors: palette('#24121E','#321D2D','#42273A','#D6799F','#B7507B','#FFE6DF') },
  { id: 'pais', name: 'Dia dos Pais — Azul & Cobre', group: 'datas-comemorativas', colors: palette('#111C29','#192C3C','#263C4D','#BD7851','#9D5F3A','#E8E6DE') },
  { id: 'criancas', name: 'Dia das Crianças — Azul & Amarelo', group: 'datas-comemorativas', colors: palette('#0D233A','#13354B','#24445D','#FFA826','#E58900','#E5F8FF') },
  { id: 'pascoa', name: 'Páscoa — Lavanda & Chocolate', group: 'datas-comemorativas', colors: palette('#271C2C','#34243B','#4B3350','#C788CE','#AE69B7','#FCE8E3') },
  { id: 'natal', name: 'Natal — Verde & Ouro', group: 'datas-comemorativas', colors: palette('#081D16','#103025','#184436','#B92839','#921F2C','#F6DF9A') },
  { id: 'ano-novo', name: 'Ano Novo — Azul Marinho & Ouro', group: 'datas-comemorativas', colors: palette('#0B1529','#13243D','#213653','#D0AB60','#A78237','#F6F1E4') },
  { id: 'carnaval', name: 'Carnaval — Roxo & Rosa', group: 'feriados', colors: palette('#1F1237','#321852','#402963','#E839A8','#BE2082','#F8E9A0') },
  { id: 'feriados', name: 'Feriados — Azul & Dourado', group: 'feriados', colors: palette('#101F2A','#183040','#254453','#DDA74C','#B78635','#F4EADD') },
  { id: 'ferias-escolares', name: 'Férias Escolares — Mar & Coral', group: 'datas-comemorativas', colors: palette('#0A2835','#11404A','#1C5660','#FF875F','#E66844','#DDF9F3') },
  { id: 'primavera', name: 'Primavera — Verde & Flores', group: 'estacoes', colors: palette('#10291D','#193A2B','#2A4D39','#EA83A5','#C45E83','#F3EBD4') },
  { id: 'verao', name: 'Verão — Oceano & Sol', group: 'estacoes', colors: palette('#072C42','#0E425C','#1D5D76','#F7AD33','#D98A12','#EAF9FA') },
  { id: 'outono', name: 'Outono — Terracota & Mel', group: 'estacoes', colors: palette('#261710','#382318','#4B3022','#DC7D37','#B45B20','#F4DEB4') },
  { id: 'inverno', name: 'Inverno — Azul & Gelo', group: 'estacoes', colors: palette('#0B1928','#152B41','#253B50','#6FADCC','#4A8AAA','#E1F4FD') },
  { id: 'namorados', name: 'Dia dos Namorados — Vinho & Rosa', group: 'datas-comemorativas', colors: palette('#2A0E1C','#3B1628','#4B2032','#E25680','#C43866','#FFE1E4') },
  { id: 'festa-junina', name: 'Festa Junina — Bandeirinhas & Fogueira', group: 'feriados', colors: palette('#241B16','#3B291E','#513629','#E99835','#C8751E','#FFF1CF') },
  { id: 'halloween', name: 'Halloween — Abóbora & Roxo', group: 'campanhas', colors: palette('#140E1E','#241633','#342247','#F07824','#D25C15','#F2DFBD') },
  { id: 'black-friday', name: 'Black Friday — Preto & Ouro', group: 'campanhas', colors: palette('#09090B','#171719','#242427','#E5BB35','#B9961F','#FAFAF7') },
  { id: 'independencia', name: 'Independência — Verde & Amarelo', group: 'feriados', colors: palette('#0C281A','#163A23','#26513A','#D4B838','#AD9120','#F2F6E0') },
]

export const resolveOccasionPalette = (id: string): OccasionPalette | undefined =>
  OCCASION_PALETTES.find(item => item.id === id)
