import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

// ── Service Worker Registration ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('[App] Service Worker registrado:', registration.scope)

      // Guardar la registration globalmente para Background Sync (Fase 3)
      window.swRegistration = registration
    } catch (err) {
      console.error('[App] Error al registrar el Service Worker:', err)
    }
  })
}
