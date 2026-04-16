<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { initPushNotifications } from '../utils/notifications.js'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) || email.value.length === 0)
const formValid = computed(() => email.value.trim().length > 0 && password.value.length > 0)

async function handleLogin() {
  if (!formValid.value) return
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value.trim(), password.value)
    try { await initPushNotifications() } catch {}
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <img src="/icons/icon-96x96.png" alt="PokePWA" class="auth-logo" />
          <h1>Iniciar sesión</h1>
          <p>Vuelve a tu aventura</p>
        </div>

        <form @submit.prevent="handleLogin" class="auth-form" novalidate>
          <div class="form-group">
            <label for="login-email">Correo electrónico</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="ash@pokemon.com"
              autocomplete="email"
              :class="{ invalid: email.length > 0 && !emailValid }"
            />
            <ul class="rules" v-if="email.length > 0 && !emailValid">
              <li>Ingresa un correo electrónico válido</li>
            </ul>
          </div>

          <div class="form-group">
            <label for="login-password">Contraseña</label>
            <div class="input-password">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Tu contraseña"
                autocomplete="current-password"
              />
              <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading || !formValid">
            <template v-if="loading"><span class="spinner"></span> Entrando...</template>
            <template v-else>Iniciar sesión</template>
          </button>

          <p class="auth-switch">
            ¿No tienes cuenta? <RouterLink to="/register">Regístrate</RouterLink>
          </p>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base); padding: var(--space-6);
}
.auth-container { width: 100%; max-width: 440px; }
.auth-card {
  background: var(--white); border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-8); box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.4s ease;
}
.auth-header { text-align: center; margin-bottom: var(--space-6); }
.auth-logo { width: 64px; height: 64px; margin: 0 auto var(--space-3); border-radius: var(--radius-md); }
.auth-header h1 { font-size: var(--font-2xl); font-weight: 800; }
.auth-header p { color: var(--gray-500); margin-top: var(--space-1); }
.auth-form { display: flex; flex-direction: column; gap: var(--space-5); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-group label { font-size: var(--font-sm); font-weight: 600; color: var(--gray-700); }
.form-group input {
  padding: var(--space-3) var(--space-4); border: 2px solid var(--gray-200);
  border-radius: var(--radius-md); font-size: var(--font-base); font-family: var(--font-family);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.form-group input:focus { border-color: var(--purple-main); box-shadow: 0 0 0 3px rgba(93,63,211,0.12); outline: none; }
.form-group input.invalid { border-color: var(--danger); }

.input-password { position: relative; }
.input-password input { width: 100%; padding-right: 48px; }
.toggle-pw {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; font-size: 1.1rem; padding: 4px 8px;
}

.rules { list-style: none; padding: 0; margin-top: var(--space-1); }
.rules li { font-size: 12px; color: var(--danger); padding-left: 18px; position: relative; }
.rules li::before { content: '✕'; position: absolute; left: 0; font-size: 10px; }

.form-error {
  color: var(--danger); font-size: var(--font-sm); font-weight: 500;
  padding: var(--space-2) var(--space-3); background: rgba(230,57,70,0.08); border-radius: var(--radius-sm);
}
.btn-full { width: 100%; padding: var(--space-4); font-size: var(--font-base); }
.btn-full:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-switch { text-align: center; font-size: var(--font-sm); color: var(--gray-500); }
.auth-switch a { color: var(--purple-main); font-weight: 600; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .auth-card { padding: var(--space-8) var(--space-5); }
  .auth-header h1 { font-size: var(--font-xl); }
}
</style>
