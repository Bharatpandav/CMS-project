import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './styles/design-system.css'
import './styles/layout.css'
import './styles/ui-components.css'
import './styles/app-pages.css'
import './styles/contrast-polish.css'
import './styles/index.css'
import './styles/cms-surfaces.css'
import './styles/responsive-portal.css'
import './styles/button-reflection.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
