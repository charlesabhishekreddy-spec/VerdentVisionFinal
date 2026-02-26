import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

function hasMsalAuthResponse() {
  const callbackUrl = `${window.location.search || ''}&${window.location.hash || ''}`.toLowerCase()
  const hasCode = /(^|[?#&])code=/.test(callbackUrl)
  const hasState = /(^|[?#&])state=/.test(callbackUrl)
  const hasError = /(^|[?#&])error=/.test(callbackUrl)
  return hasState && (hasCode || hasError)
}

async function maybeHandleMsalPopupBridge() {
  if (!hasMsalAuthResponse()) return false
  try {
    await broadcastResponseToMainFrame()
    return true
  } catch {
    return false
  }
}

async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) return

  const handledByMsalBridge = await maybeHandleMsalPopupBridge()
  if (handledByMsalBridge) {
    rootElement.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#334155;">Completing Microsoft sign-in...</div>'
    return
  }

  ReactDOM.createRoot(rootElement).render(
      // <React.StrictMode>
      <App />
      // </React.StrictMode>,
  )
}

bootstrap()

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}

