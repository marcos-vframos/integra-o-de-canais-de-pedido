function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]),
  )
  return value
}
/** JSONB may reorder object keys; array order and every supplied field must survive. */
export function savedFieldsMatch(expected: Record<string,unknown>, actual: unknown): boolean {
  if (!actual || typeof actual !== 'object') return false
  return Object.entries(expected).every(([key,value]) =>
    JSON.stringify(canonical(value)) === JSON.stringify(canonical((actual as Record<string,unknown>)[key])),
  )
}
