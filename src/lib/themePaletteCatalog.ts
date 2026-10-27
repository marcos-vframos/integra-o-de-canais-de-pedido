import type { LandingThemeColors, LandingThemePreset } from '@/context/LandingContentContext'
import { OCCASION_PALETTES } from './occasionPalettes.ts'

type SavedPalette = { id: string; name: string; colors: LandingThemeColors }
export type CatalogPalette = SavedPalette & { source: 'occasion' | 'promotion'; key: string }

/** Source-qualified identities keep e.g. two different Christmas palettes separate. */
export function themePaletteCatalog(saved: SavedPalette[]): CatalogPalette[] {
  return [
    ...OCCASION_PALETTES.map(p => ({ ...p, key: 'occasion:' + p.id, source: 'occasion' as const })),
    ...saved.map(p => ({ ...p, key: 'promotion:' + p.id, source: 'promotion' as const })),
  ]
}

export function catalogThemeId(palette: CatalogPalette) {
  return 'catalog_' + palette.source + '_' + palette.id
}

export function isCatalogThemeRegistered(presets: LandingThemePreset[], palette: CatalogPalette) {
  const keys: (keyof LandingThemeColors)[] = ['bgPrimary','bgSecondary','bgCard','accentVinho','accentVinhoHover','accentSilver']
  return presets.some(p => p.id === catalogThemeId(palette) || keys.every(key =>
    String(p.colors[key]).toLowerCase() === String(palette.colors[key]).toLowerCase()))
}

export function describeThemeColors(colors: LandingThemeColors) {
  return `Fundo ${colors.bgPrimary} · cards ${colors.bgCard} · botões ${colors.accentVinho} · detalhes ${colors.accentSilver}`
}

/** Registration never changes activeThemeId or activeColors. Repeated picks retain edits. */
export function registerCatalogTheme(presets: LandingThemePreset[], palette: CatalogPalette): LandingThemePreset[] {
  const id = catalogThemeId(palette)
  if (isCatalogThemeRegistered(presets, palette)) return presets
  return [...presets, { id, name: palette.name, description: describeThemeColors(palette.colors), colors: { ...palette.colors } }]
}
