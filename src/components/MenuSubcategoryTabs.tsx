import { currentMenuSubcategory, menuSubcategories } from '@/lib/menuSubcategories'

export default function MenuSubcategoryTabs({ category, selected, onSelect }: {
  category: string
  selected: string
  onSelect: (value: string) => void
}) {
  const options = menuSubcategories(category)
  if (!options.length) return null
  const current = currentMenuSubcategory(category, selected)
  return (
    <div role="group" aria-label={`Subcategorias de ${category}`} className="my-4 flex flex-wrap gap-2">
      {options.map(option => (
        <button key={option} type="button" aria-pressed={current === option} onClick={() => onSelect(option)}
          className="rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            borderColor: current === option ? 'var(--landing-vinho, var(--red, #e10600))' : 'var(--line, #3f3f46)',
            backgroundColor: current === option ? 'var(--landing-vinho, var(--red, #e10600))' : 'transparent',
            color: '#fff',
          }}>
          {option}
        </button>
      ))}
    </div>
  )
}
