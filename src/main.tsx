/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { registerServiceWorker } from './lib/pwa/registerServiceWorker'

// Registro do Service Worker para suporte PWA offline
registerServiceWorker()

createRoot(document.getElementById('root')!).render(<App />)
