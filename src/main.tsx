import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Vite BASE_URL follows `base` in vite.config.ts: './' locally (→ ''),
// '/the-vault/' on GitHub Pages so deep links like /the-vault/dashboard resolve.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
const routerBase = basename === '.' ? '' : basename

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={routerBase}>
    <App />
  </BrowserRouter>,
)
