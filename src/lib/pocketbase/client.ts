import PocketBase from 'pocketbase'

const rawBackendUrl = String(import.meta.env.VITE_POCKETBASE_URL || '').trim()

/**
 * Reject legacy internal Skip endpoints, missing URLs and non-HTTPS public APIs.
 * Deployment requires an independently hosted PocketBase with persistent storage.
 */
function isValidIndependentUrl(value: string): boolean {
  if (!value || /goskip\.dev|\.internal\./i.test(value)) return false
  try {
    const url = new URL(value)
    const local = ['localhost', '127.0.0.1'].includes(url.hostname)
    return (url.protocol === 'https:' || (import.meta.env.DEV && local && url.protocol === 'http:'))
      && !url.username && !url.password
  } catch { return false }
}

export const backendConfigured = isValidIndependentUrl(rawBackendUrl)
export const backendConfigMessage = rawBackendUrl && !backendConfigured
  ? 'Endpoint anterior ou inseguro bloqueado. Configure uma URL HTTPS própria do PocketBase.'
  : 'Defina VITE_POCKETBASE_URL com a URL HTTPS do novo PocketBase na hospedagem.'

// In preview without backend, no request is sent to the legacy provider.
const safeBaseUrl = backendConfigured ? rawBackendUrl : window.location.origin
const pb = new PocketBase(safeBaseUrl)
pb.autoCancellation(false)

export default pb
