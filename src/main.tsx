import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeContext'
import { DensityProvider } from './components/DensityContext'
import { ToastProvider } from './components/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <DensityProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DensityProvider>
    </ThemeProvider>
  </StrictMode>,
)
