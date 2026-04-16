<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { initPushNotifications } from '../utils/notifications.js'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)
const friendCode = ref('')
const showPassword = ref(false)

// ── Validation rules ────────────────────────────────
const usernameRules = computed(() => {
  const v = username.value.trim()
  return {
    minLen: v.length >= 3,
    maxLen: v.length <= 20,
    noSpecial: /^[a-zA-Z0-9_\-\sáéíóúñÁÉÍÓÚÑ]+$/.test(v) || v.length === 0,
    valid: v.length >= 3 && v.length <= 20 && /^[a-zA-Z0-9_\-\sáéíóúñÁÉÍÓÚÑ]+$/.test(v),
  }
})

const emailRules = computed(() => {
  const v = email.value.trim()
  return {
    format: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length === 0,
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
  }
})

const passwordRules = computed(() => {
  const v = password.value
  return {
    minLen: v.length >= 6,
    hasUpper: /[A-Z]/.test(v),
    hasLower: /[a-z]/.test(v),
    hasNumber: /[0-9]/.test(v),
    valid: v.length >= 6 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v),
  }
})

const passwordsMatch = computed(() => confirmPassword.value === password.value && confirmPassword.value.length > 0)

const formValid = computed(() =>
  usernameRules.value.valid &&
  emailRules.value.valid &&
  passwordRules.value.valid &&
  passwordsMatch.value
)

async function handleRegister() {
  if (!formValid.value) return
  error.value = ''
  loading.value = true
  try {
    const data = await authStore.register(username.value.trim(), email.value.trim(), password.value)
    friendCode.value = data.user.friendCode
    success.value = true
    try { await initPushNotifications() } catch {}
    setTimeout(() => { window.location.href = '/' }, 1500)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al registrarse. Intenta de nuevo.'
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
          <h1>Crear cuenta</h1>
          <p>Únete al mundo Pokémon</p>
        </div>

        <!-- Success state -->
        <div v-if="success" class="success-state">
          <div class="success-icon">🎉</div>
          <h2>¡Bienvenido, {{ username }}!</h2>
          <p>Tu código de amigo es:</p>
          <div class="friend-code-display">{{ friendCode }}</div>
          <p class="hint">Comparte este código para que otros te agreguen.</p>
          <p class="redirect-hint">Redirigiendo al Pokédex...</p>
        </div>

        <!-- Registration form -->
        <form v-else @submit.prevent="handleRegister" class="auth-form" novalidate>
          <!-- Username -->
          <div class="form-group">
            <label for="reg-username">Nombre de entrenador</label>
            <input
              id="reg-username"
              v-model="username"
              type="text"
              placeholder="Ash Ketchum"
              autocomplete="username"
              :class="{ invalid: username.length > 0 && !usernameRules.valid }"
            />
            <ul class="rules" v-if="username.length > 0">
              <li :class="{ pass: usernameRules.minLen }">Mínimo 3 caracteres</li>
              <li :class="{ pass: usernameRules.maxLen }">Máximo 20 caracteres</li>
              <li :class="{ pass: usernameRules.noSpecial }">Solo letras, números, guiones y espacios</li>
            </ul>
          </div>

          <!-- Email -->
          <div class="form-group">
            <label for="reg-email">Correo electrónico</label>
            <input
              id="reg-email"
              v-model="email"
              type="email"
              placeholder="ash@pokemon.com"
              autocomplete="email"
              :class="{ invalid: email.length > 0 && !emailRules.valid }"
            />
            <ul class="rules" v-if="email.length > 0 && !emailRules.format">
              <li>Ingresa un correo electrónico válido</li>
            </ul>
          </div>

          <!-- Password -->
          <div class="form-group">
            <label for="reg-password">Contraseña</label>
            <div class="input-password">
              <input
                id="reg-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Crea una contraseña segura"
                autocomplete="new-password"
                :class="{ invalid: password.length > 0 && !passwordRules.valid }"
              />
              <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <ul class="rules" v-if="password.length > 0">
              <li :class="{ pass: passwordRules.minLen }">Mínimo 6 caracteres</li>
              <li :class="{ pass: passwordRules.hasUpper }">Una letra mayúscula</li>
              <li :class="{ pass: passwordRules.hasLower }">Una letra minúscula</li>
              <li :class="{ pass: passwordRules.hasNumber }">Un número</li>
            </ul>
          </div>

          <!-- Confirm password -->
          <div class="form-group">
            <label for="reg-confirm">Confirmar contraseña</label>
            <input
              id="reg-confirm"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Repite tu contraseña"
              autocomplete="new-password"
              :class="{ invalid: confirmPassword.length > 0 && !passwordsMatch }"
            />
            <ul class="rules" v-if="confirmPassword.length > 0 && !passwordsMatch">
              <li>Las contraseñas no coinciden</li>
            </ul>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading || !formValid">
            <template v-if="loading"><span class="spinner"></span> Registrando...</template>
            <template v-else>Crear cuenta</template>
          </button>

          <p class="auth-switch">
            ¿Ya tienes cuenta? <RouterLink to="/login">Inicia sesión</RouterLink>
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
.auth-header h1 { font-size: var(--font-2xl); font-weight: 800; color: var(--gray-900); }
.auth-header p { color: var(--gray-500); margin-top: var(--space-1); }

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-group label { font-size: var(--font-sm); font-weight: 600; color: var(--gray-700); }
.form-group input {
  padding: var(--space-3) var(--space-4); border: 2px solid var(--gray-200);
  border-radius: var(--radius-md); font-size: var(--font-base); font-family: var(--font-family);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.form-group input:focus { border-color: var(--purple-main); box-shadow: 0 0 0 3px rgba(93,63,211,0.12); outline: none; }
.form-group input.invalid { border-color: var(--danger); }
.form-group input.invalid:focus { box-shadow: 0 0 0 3px rgba(230,57,70,0.1); }

.input-password { position: relative; }
.input-password input { width: 100%; padding-right: 48px; }
.toggle-pw {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; font-size: 1.1rem; padding: 4px 8px;
}

/* Validation rules */
.rules { list-style: none; padding: 0; margin-top: var(--space-1); }
.rules li {
  font-size: 12px; color: var(--danger); padding: 1px 0; padding-left: 18px;
  position: relative; line-height: 1.4;
}
.rules li::before {
  content: '✕'; position: absolute; left: 0; font-size: 10px;
}
.rules li.pass { color: var(--green-leaf); }
.rules li.pass::before { content: '✓'; }

.form-error {
  color: var(--danger); font-size: var(--font-sm); font-weight: 500;
  padding: var(--space-2) var(--space-3); background: rgba(230,57,70,0.08); border-radius: var(--radius-sm);
}

.btn-full { width: 100%; padding: var(--space-4); font-size: var(--font-base); }
.btn-full:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-switch { text-align: center; font-size: var(--font-sm); color: var(--gray-500); }
.auth-switch a { color: var(--purple-main); font-weight: 600; }

.spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Success */
.success-state { text-align: center; animation: scaleIn 0.4s ease; }
.success-icon { font-size: 3.5rem; margin-bottom: var(--space-4); }
.success-state h2 { font-size: var(--font-xl); margin-bottom: var(--space-4); }
.friend-code-display {
  font-size: var(--font-2xl); font-weight: 800; color: var(--purple-main);
  background: var(--lavender-soft); padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-lg); display: inline-block; letter-spacing: 4px;
  margin: var(--space-4) 0;
}
.hint { font-size: var(--font-sm); color: var(--gray-500); }
.redirect-hint { font-size: var(--font-sm); color: var(--green-leaf); margin-top: var(--space-4); font-weight: 600; }

@media (max-width: 480px) {
  .auth-card { padding: var(--space-8) var(--space-5); }
  .auth-header h1 { font-size: var(--font-xl); }
}
</style>
