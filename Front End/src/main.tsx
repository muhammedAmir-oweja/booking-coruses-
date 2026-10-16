import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'   // colour and type tokens; must load first
import './index.css'          // Vite resets and the AdminLTE RTL mirror
import './styles/chrome.css'  // the restyled shell, overriding AdminLTE
import './styles/components.css' // panels, tables, forms, buttons - app-wide
import './i18n'          // side-effect: init must run before the first render
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
