<script setup>
import { ref, onMounted } from "vue"

const stats = ref({
  todayVisitors: 0,
  currentUsers: 0,
  todayRegistrations: "-",
  oneTimeTickets: 0,
})

const loading = ref(false)

const fetchTvStats = async () => {
  try {
    loading.value = true
    const response = await fetch("/api/tv/stats")
    if (!response.ok) return
    const data = await response.json()
    stats.value = {
      todayVisitors: data.todayVisitors ?? 0,
      currentUsers: data.currentUsers ?? 0,
      todayRegistrations: data.todayRegistrations ?? "-",
      oneTimeTickets: data.oneTimeTickets ?? 0,
    }
  } catch (error) {
    console.error("Error fetching home stats:", error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTvStats)
</script>

<template>
  <div class="dashboard-page">
    <div class="welcome-card">
      <h1 class="welcome-title">"Vakolat" dasturiga xush kelibsiz</h1>
    </div>

    <div class="stats-grid">
      <div class="stat-card visitors-card">
        <h3 class="stat-title">Ro'yxatdan o'tgan foydalanuvchilardan bugun tashrif buyurganlar</h3>
        <p class="stat-subtitle">Visitors today among registered users</p>
        <div class="stat-number visitors-number">{{ loading ? "..." : stats.todayVisitors }}</div>
      </div>

      <div class="stat-card users-card">
        <h3 class="stat-title">Kutubxonada joriy foydalanuvchilar (A'zo bo'lganlardan)</h3>
        <p class="stat-subtitle">Current users in the library among registered users</p>
        <div class="stat-number users-number">{{ loading ? "..." : stats.currentUsers }}</div>
      </div>

      <div class="stat-card registrations-card">
        <h3 class="stat-title">Bugun a'zo bo'lganlar</h3>
        <p class="stat-subtitle">Registers today</p>
        <div class="stat-number registrations-number">{{ loading ? "..." : stats.todayRegistrations }}</div>
      </div>

      <div class="stat-card tickets-card">
        <h3 class="stat-title">Bugun bir martalik chipta berildi</h3>
        <p class="stat-subtitle">One-time tickets given today</p>
        <div class="stat-number tickets-number">{{ loading ? "..." : stats.oneTimeTickets }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--surface-ground);
}

.welcome-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--surface-card);
  box-shadow: var(--card-shadow);
  margin-bottom: 1rem;
}

.welcome-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 3px 0;
  line-height: 1.2;
}

.stat-subtitle {
  font-size: 12px;
  color: #666;
  margin: 0 0 10px 0;
}

.stat-number {
  font-size: 40px;
  font-weight: 700;
  margin: 0;
  line-height: 1;
}

.visitors-number {
  color: #ef4444;
}

.users-number {
  color: #eab308;
}

.registrations-number {
  color: #10b981;
}

.tickets-number {
  color: #3b82f6;
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
