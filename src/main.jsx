import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { ToastProvider } from './Toast.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <I18nProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </I18nProvider>
  </ErrorBoundary>
)
