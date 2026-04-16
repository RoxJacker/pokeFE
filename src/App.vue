<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from './stores/auth.js'
import { useRouter } from 'vue-router'
import NotificationBell from './components/NotificationBell.vue'
import OfflineBanner from './components/OfflineBanner.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isOnline = ref(navigator.onLine)
const mobileMenuOpen = ref(false)

const loggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)
const isFullPage = computed(() => route.meta.fullPage)

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
  if (navigator.onLine && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(sw => {
      if ('sync' in sw) sw.sync.register('sync-pokemon').catch(() => {})
      if (sw.active) sw.active.postMessage('FORCE_SYNC')
    })
  }
}

function handleLogout() {
  authStore.logout()
  mobileMenuOpen.value = false
  router.push('/login')
}

function closeMobile() { mobileMenuOpen.value = false }

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})
onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <OfflineBanner />
  <!-- Full page (login/register) — no navbar/footer -->
  <RouterView v-if="isFullPage" />

  <!-- App shell for authenticated pages -->
  <div v-else class="app-layout">
    <nav class="navbar">
      <div class="container navbar-inner">
        <RouterLink to="/" class="navbar-brand" @click="closeMobile">
          <img src="/icons/icon-72x72.png" alt="PokePWA" class="navbar-logo" />
          <span class="navbar-title">PokePWA</span>
        </RouterLink>

        <!-- Desktop nav -->
        <div class="navbar-links desktop-only">
          <RouterLink to="/" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Pokédex</span>
          </RouterLink>
          <RouterLink to="/friends" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Amigos</span>
          </RouterLink>
          <RouterLink to="/favorites" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Favoritos</span>
          </RouterLink>
          <RouterLink to="/team" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>Equipo</span>
          </RouterLink>
          <RouterLink to="/battles" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>Batallas</span>
          </RouterLink>
          <RouterLink to="/about" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Info</span>
          </RouterLink>
        </div>

        <div class="navbar-actions">
          <span class="status-pill" :class="isOnline ? 'online' : 'offline'">
            <span class="status-dot"></span>
            <span class="status-text">{{ isOnline ? 'Online' : 'Offline' }}</span>
          </span>

          <NotificationBell v-if="loggedIn" />

          <RouterLink v-if="loggedIn" to="/profile" class="user-pill desktop-only">
            <span class="user-avatar-sm">{{ user?.username?.charAt(0).toUpperCase() }}</span>
            <span class="user-name-sm">{{ user?.username }}</span>
          </RouterLink>

          <!-- Hamburger (mobile) -->
          <button class="hamburger mobile-only" @click="mobileMenuOpen = !mobileMenuOpen" :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'">
            <span class="ham-line" :class="{ open: mobileMenuOpen }"></span>
            <span class="ham-line" :class="{ open: mobileMenuOpen }"></span>
            <span class="ham-line" :class="{ open: mobileMenuOpen }"></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile menu -->
    <Transition name="slide">
      <div v-if="mobileMenuOpen" class="mobile-menu">
        <div class="mobile-user" v-if="loggedIn">
          <div class="user-avatar-lg">{{ user?.username?.charAt(0).toUpperCase() }}</div>
          <span class="mobile-username">{{ user?.username }}</span>
          <span class="mobile-email">{{ user?.email }}</span>
        </div>
        <nav class="mobile-nav">
          <RouterLink to="/" class="mobile-link" @click="closeMobile">🏠 Pokédex</RouterLink>
          <RouterLink to="/friends" class="mobile-link" @click="closeMobile">👥 Amigos</RouterLink>
          <RouterLink to="/favorites" class="mobile-link" @click="closeMobile">❤️ Favoritos</RouterLink>
          <RouterLink to="/team" class="mobile-link" @click="closeMobile">⭐ Equipo</RouterLink>
          <RouterLink to="/battles" class="mobile-link" @click="closeMobile">⚔️ Batallas</RouterLink>
          <RouterLink to="/profile" class="mobile-link" @click="closeMobile">👤 Perfil</RouterLink>
          <RouterLink to="/about" class="mobile-link" @click="closeMobile">ℹ️ Acerca de</RouterLink>
        </nav>
        <button class="mobile-logout" @click="handleLogout">Cerrar sesión</button>
      </div>
    </Transition>
    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMobile"></div>

    <main class="main-content">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="container footer-inner">
        <p>PokePWA &copy; {{ new Date().getFullYear() }} — Datos de <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a></p>
      </div>
    </footer>

    <!-- Mobile bottom nav -->
    <nav class="bottom-nav mobile-only" v-if="loggedIn">
      <RouterLink to="/" class="bottom-link" :class="{ active: route.path === '/' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Pokédex</span>
      </RouterLink>
      <RouterLink to="/friends" class="bottom-link" :class="{ active: route.path === '/friends' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <span>Amigos</span>
      </RouterLink>
      <RouterLink to="/favorites" class="bottom-link" :class="{ active: route.path === '/favorites' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        <span>Favoritos</span>
      </RouterLink>
      <RouterLink to="/team" class="bottom-link" :class="{ active: route.path === '/team' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>Equipo</span>
      </RouterLink>
      <RouterLink to="/battles" class="bottom-link" :class="{ active: route.path === '/battles' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Batallas</span>
      </RouterLink>
      <RouterLink to="/profile" class="bottom-link" :class="{ active: route.path === '/profile' }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Perfil</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app-layout { display: flex; flex-direction: column; min-height: 100vh; }

/* Navbar */
.navbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--surface-border);
  height: var(--navbar-height); box-shadow: var(--shadow-sm);
}
.navbar-inner { display: flex; align-items: center; height: 100%; gap: var(--space-4); }
.navbar-brand { display: flex; align-items: center; gap: var(--space-3); text-decoration: none; flex-shrink: 0; }
.navbar-logo { width: 36px; height: 36px; border-radius: var(--radius-sm); }
.navbar-title { font-size: var(--font-xl); font-weight: 800; color: var(--purple-main); letter-spacing: -0.5px; }
.navbar-links { display: flex; align-items: center; gap: var(--space-1); flex: 1; }
.nav-link {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); font-size: var(--font-sm); font-weight: 600;
  color: var(--gray-500); text-decoration: none; border-radius: var(--radius-md);
  transition: all var(--transition-fast); white-space: nowrap;
}
.nav-link:hover { color: var(--purple-main); background: var(--lavender-soft); }
.nav-link.router-link-exact-active { color: var(--purple-main); background: var(--lavender-soft); }
.navbar-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; margin-left: auto; }

.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: var(--space-1) var(--space-3); font-size: var(--font-xs); font-weight: 600;
  border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.5px;
}
.status-pill.online { background: rgba(72,199,116,0.12); color: #2d9a5a; }
.status-pill.offline { background: rgba(230,57,70,0.12); color: var(--danger); }
.status-dot { width: 8px; height: 8px; border-radius: var(--radius-full); flex-shrink: 0; }
.online .status-dot { background: var(--green-leaf); box-shadow: 0 0 6px rgba(72,199,116,0.5); }
.offline .status-dot { background: var(--danger); box-shadow: 0 0 6px rgba(230,57,70,0.5); }

.user-pill {
  display: flex; align-items: center; gap: var(--space-2); text-decoration: none;
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
  border-radius: var(--radius-full); background: var(--lavender-soft);
  transition: background var(--transition-fast);
}
.user-pill:hover { background: var(--lavender-hover); }
.user-avatar-sm {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  background: var(--purple-main); color: var(--white); font-weight: 700; font-size: var(--font-xs);
  display: flex; align-items: center; justify-content: center;
}
.user-name-sm { font-size: var(--font-sm); font-weight: 600; color: var(--purple-main); }

/* Hamburger */
.hamburger {
  display: flex; flex-direction: column; gap: 5px; padding: 8px; background: none;
}
.ham-line {
  width: 22px; height: 2px; background: var(--gray-700); border-radius: 2px;
  transition: all 0.3s ease;
}
.ham-line.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.ham-line.open:nth-child(2) { opacity: 0; }
.ham-line.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* Mobile menu */
.mobile-menu {
  position: fixed; top: var(--navbar-height); right: 0; bottom: 0; width: 280px;
  background: var(--surface); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
  z-index: 200; padding: var(--space-6); overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0,0,0,0.5); display: flex; flex-direction: column;
}
.mobile-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.3); }

.mobile-user { text-align: center; margin-bottom: var(--space-6); padding-bottom: var(--space-6); border-bottom: 1px solid var(--gray-200); }
.user-avatar-lg {
  width: 56px; height: 56px; border-radius: var(--radius-full);
  background: var(--purple-main); color: var(--white); font-size: var(--font-xl); font-weight: 800;
  display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-3);
}
.mobile-username { display: block; font-weight: 700; font-size: var(--font-base); }
.mobile-email { display: block; font-size: var(--font-xs); color: var(--gray-500); }

.mobile-nav { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
.mobile-link {
  display: block; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
  text-decoration: none; font-weight: 600; color: var(--gray-700); font-size: var(--font-base);
  transition: all var(--transition-fast);
}
.mobile-link:hover, .mobile-link.router-link-exact-active { background: var(--lavender-soft); color: var(--purple-main); }

.mobile-logout {
  margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md);
  background: rgba(230,57,70,0.08); color: var(--danger); font-weight: 600; text-align: center;
}

.slide-enter-active { animation: slideIn 0.25s ease; }
.slide-leave-active { animation: slideIn 0.2s ease reverse; }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

/* Bottom nav (mobile) */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
  background: var(--surface); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--surface-border);
  display: flex; z-index: 100; box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
}
.bottom-link {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; text-decoration: none; color: var(--gray-500); font-size: 10px; font-weight: 600;
  transition: color var(--transition-fast);
}
.bottom-link.active { color: var(--purple-main); }
.bottom-link.active svg { stroke: var(--purple-main); }

/* Main */
.main-content { flex: 1; padding: var(--space-8) 0; }
.app-footer { background: var(--surface); border-top: 1px solid var(--surface-border); padding: var(--space-6) 0; margin-top: auto; }
.footer-inner { text-align: center; font-size: var(--font-sm); color: var(--gray-500); }
.footer-inner a { color: var(--purple-main); font-weight: 600; }

/* Desktop/Mobile toggles */
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .navbar-title { display: none; }
  .status-text { display: none; }
  .status-pill { padding: var(--space-1) var(--space-2); }
  .main-content { padding-bottom: 76px; }
  .app-footer { padding-bottom: 68px; }
}
</style>
