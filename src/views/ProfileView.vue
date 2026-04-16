<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import TypeBadge from '../components/TypeBadge.vue'

const authStore = useAuthStore()
const currentUser = authStore.user
const router = useRouter()
const copied = ref(false)

onMounted(async () => {
  await authStore.fetchProfile()
})

function copyCode() {
  if (authStore.user?.friendCode) {
    navigator.clipboard.writeText(authStore.user.friendCode)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}



function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <section class="profile-page" v-if="currentUser">
    <div class="container">
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar">
            {{ currentUser.username?.charAt(0).toUpperCase() }}
          </div>
          <h1 class="profile-name">{{ currentUser.username }}</h1>
          <p class="profile-email">{{ currentUser.email }}</p>
        </div>

        <!-- Friend Code -->
        <div class="profile-section">
          <h2>Código de amigo</h2>
          <div class="friend-code-box" @click="copyCode">
            <span class="friend-code">{{ currentUser.friendCode }}</span>
            <span class="copy-hint">{{ copied ? '¡Copiado!' : 'Click para copiar' }}</span>
          </div>
        </div>

        <!-- Team -->
        <div class="profile-section" v-if="currentUser.team?.length">
          <h2>Mi equipo</h2>
          <div class="team-grid">
            <div v-for="p in currentUser.team" :key="p.id" class="team-member">
              <img :src="p.sprite" :alt="p.name" class="team-sprite" />
              <span class="team-name">{{ p.name }}</span>
              <div class="team-types">
                <TypeBadge v-for="t in p.types" :key="t" :type="t" />
              </div>
            </div>
          </div>
        </div>
        <div class="profile-section" v-else>
          <h2>Mi equipo</h2>
          <div class="empty-team">
            <p>No has creado un equipo aún.</p>
            <RouterLink to="/team" class="btn btn-primary">Crear equipo</RouterLink>
          </div>
        </div>



        <!-- Logout -->
        <div class="profile-actions">
          <button class="btn btn-outline" @click="handleLogout">Cerrar sesión</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-page { padding-bottom: var(--space-16); }

.profile-card {
  max-width: 600px; margin: 0 auto; background: var(--white);
  border-radius: var(--radius-xl); padding: var(--space-10) var(--space-8);
  box-shadow: var(--shadow-lg); animation: fadeInUp 0.4s ease;
}

.profile-header { text-align: center; margin-bottom: var(--space-8); }

.avatar {
  width: 80px; height: 80px; border-radius: var(--radius-full);
  background: var(--purple-main); color: var(--white);
  font-size: var(--font-2xl); font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto var(--space-4);
}

.profile-name { font-size: var(--font-2xl); font-weight: 800; }
.profile-email { color: var(--gray-500); }

.profile-section { margin-bottom: var(--space-8); }
.profile-section h2 { font-size: var(--font-lg); font-weight: 700; margin-bottom: var(--space-4); color: var(--gray-900); }

.friend-code-box {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-6); background: var(--lavender-soft);
  border-radius: var(--radius-lg); cursor: pointer;
  transition: transform var(--transition-fast);
}
.friend-code-box:hover { transform: scale(1.02); }
.friend-code { font-size: var(--font-xl); font-weight: 800; color: var(--purple-main); letter-spacing: 3px; }
.copy-hint { font-size: var(--font-xs); color: var(--gray-500); font-weight: 600; }

.team-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-4);
}

.team-member {
  background: var(--lavender-soft); border-radius: var(--radius-lg);
  padding: var(--space-4); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
}

.team-sprite { width: 64px; height: 64px; object-fit: contain; }
.team-name { font-weight: 700; text-transform: capitalize; font-size: var(--font-sm); }
.team-types { display: flex; gap: var(--space-1); flex-wrap: wrap; justify-content: center; }

.empty-team { text-align: center; padding: var(--space-6); background: var(--bg-base); border-radius: var(--radius-lg); }
.empty-team p { margin-bottom: var(--space-4); color: var(--gray-500); }

.profile-actions { text-align: center; padding-top: var(--space-4); border-top: 1px solid var(--gray-200); }
</style>
