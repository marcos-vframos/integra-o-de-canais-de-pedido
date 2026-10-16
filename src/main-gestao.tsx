import { createRoot } from 'react-dom/client'
import GestaoApp from './GestaoApp'
import './main.css'
import { registerServiceWorker } from './lib/pwa/registerServiceWorker'

registerServiceWorker()
createRoot(document.getElementById('root')!).render(<GestaoApp />)
