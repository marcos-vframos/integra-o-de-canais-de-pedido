// Registro do Service Worker do PWA
export function registerServiceWorker() {
  if (typeof window === 'undefined') return

  // Atualiza o link do manifest dinamicamente com base na rota atual (Landing vs Gestão)
  const updateManifestForRoute = () => {
    const isGestao = import.meta.env.MODE === 'gestao'
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    const targetManifest = isGestao ? '/manifest.webmanifest' : '/manifest-landing.webmanifest'
    const targetThemeColor = isGestao ? '#0B0B0C' : '#07140B'

    if (manifestLink && manifestLink.getAttribute('href') !== targetManifest) {
      manifestLink.setAttribute('href', targetManifest)
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', targetThemeColor)
    }

    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (appTitleMeta) {
      appTitleMeta.setAttribute('content', isGestao ? "Loyola's Gestão" : "Loyola's Lanches")
    }
  }

  // Executa de imediato
  updateManifestForRoute()

  if ('serviceWorker' in navigator) {
    const register = () => {
      updateManifestForRoute()
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          // Check for an updated worker at every F5/refresh.
          void registration.update().catch(() => {})
          // Verifica se há novas atualizações em background
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (!installingWorker) return
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.info('[PWA] Nova versão do aplicativo pronta para uso.')
              }
            })
          })
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err)
        })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }
}
