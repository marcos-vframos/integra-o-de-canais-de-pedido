// Registro do Service Worker do PWA
export function registerServiceWorker() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Verifica se há novas atualizações em background
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (!installingWorker) return
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.info("[PWA] Nova versão do Loyola's Gestão pronta para uso.")
              }
            })
          })
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err)
        })
    })
  }
}
