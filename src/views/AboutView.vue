<template>
  <section class="about-page">
    <div class="container">
      <div class="about-card">
        <h1 class="about-title">Acerca de <span class="accent">PokePWA</span></h1>
        <p class="about-desc">
          PokePWA es una Progressive Web App que te permite explorar el mundo Pokémon.
          Busca y descubre información detallada sobre cada Pokémon gracias a la
          <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a>.
        </p>

        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">📡</div>
            <h3>Funciona Offline</h3>
            <p>Gracias al Service Worker, la app funciona sin conexión a internet.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🔔</div>
            <h3>Notificaciones Push</h3>
            <p>Recibe alertas de retos a batalla e invitaciones de amistad.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🔄</div>
            <h3>Background Sync</h3>
            <p>Las acciones fallidas se sincronizan automáticamente al recuperar conexión.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📱</div>
            <h3>Instalable</h3>
            <p>Instálala como app nativa desde el navegador.</p>
          </div>
        </div>

        <div class="tech-stack">
          <h2>Stack Tecnológico</h2>
          <div class="tech-pills">
            <span class="tech-pill">Vue 3</span>
            <span class="tech-pill">Vite</span>
            <span class="tech-pill">PokeAPI</span>
            <span class="tech-pill">Service Worker</span>
            <span class="tech-pill">IndexedDB</span>
            <span class="tech-pill">Web Push</span>
            <span class="tech-pill">Express</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-page {
  padding-bottom: var(--space-16);
}

.about-card {
  background: var(--white);
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-8);
  box-shadow: var(--shadow-md);
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease;
}

.about-title {
  font-size: var(--font-3xl);
  font-weight: 800;
  text-align: center;
  margin-bottom: var(--space-4);
}

.accent {
  color: var(--purple-main);
}

.about-desc {
  text-align: center;
  font-size: var(--font-lg);
  color: var(--gray-500);
  max-width: 600px;
  margin: 0 auto var(--space-10);
  line-height: 1.7;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-10);
}

.feature {
  background: var(--bg-base);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.feature:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-3);
}

.feature h3 {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: var(--space-2);
}

.feature p {
  font-size: var(--font-sm);
  color: var(--gray-500);
  line-height: 1.5;
}

.tech-stack {
  text-align: center;
}

.tech-stack h2 {
  font-size: var(--font-xl);
  font-weight: 700;
  margin-bottom: var(--space-4);
  color: var(--gray-900);
}

.tech-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

.tech-pill {
  padding: var(--space-2) var(--space-5);
  background: var(--lavender-soft);
  color: var(--purple-main);
  font-size: var(--font-sm);
  font-weight: 600;
  border-radius: var(--radius-full);
}
</style>
