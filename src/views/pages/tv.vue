<template>
  <div class="tv-display">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - Statistics -->
      <div class="left-panel">
        <!-- Today's Visitors -->
        <div class="stat-card visitors-card">
          <h3 class="stat-title">Bugun tashrif buyurganlar</h3>
          <p class="stat-subtitle">Visitors today</p>
          <div class="stat-number visitors-number">{{ stats.todayVisitors }}</div>
        </div>

        <!-- Current Users -->
        <div class="stat-card users-card">
          <h3 class="stat-title">Kutubxonada ayni paytda foydalanuvchilar</h3>
          <p class="stat-subtitle">Current users in the library</p>
          <div class="stat-number users-number">{{ stats.currentUsers }}</div>
        </div>

        <!-- Today's Registrations -->
        <div class="stat-card registrations-card">
          <h3 class="stat-title">Bugun a'zo bo'lganlar</h3>
          <p class="stat-subtitle">Registers today</p>
          <div class="stat-number registrations-number">{{ stats.todayRegistrations }}</div>
        </div>

        <!-- One-time Tickets -->
        <div class="stat-card tickets-card">
          <h3 class="stat-title">Bir martalik chiptalar</h3>
          <p class="stat-subtitle">One-time tickets</p>
          <div class="stat-number tickets-number">{{ stats.oneTimeTickets }}</div>
        </div>

        <!-- Scheduled Events - AUTOMATIC SIZE -->
        <div class="events-card" :class="{ 'events-loading': eventsLoading, 'events-minimal': hasMinimalEvents }">
          <h3 class="events-title">Rejalashtirilgan tadbirlar:</h3>
          <div class="events-list">
            <!-- Loading State -->
            <div v-if="eventsLoading" class="events-loading-state">
              <div class="loading-spinner"></div>
              <div class="loading-text">Ma'lumotlar yuklanmoqda...</div>
            </div>
            <!-- Events Content -->
            <div v-else-if="events.length > 0" class="events-content">
              <div v-for="event in events" :key="event.id" class="event-item">
                <span class="event-time" :class="{ 'time-16': event.time === '16:00', 'time-17': event.time === '17:00' }">{{ event.time }}</span>
                <span class="event-separator">—</span>
                <span class="event-description">{{ event.description }}</span>
              </div>
            </div>
            <!-- No Events State -->
            <div v-else class="no-events">
              <div class="no-events-icon">📅</div>
              <div class="no-events-text">Bugun rejalashtirilgan tadbirlar yo'q</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - YouTube Video -->
      <div class="right-panel">
        <div class="video-container">
          <iframe
            ref="youtubePlayer"
            :src="currentVideoUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            @load="onVideoLoad"
          ></iframe>
          <!-- Video Controls Overlay -->
          <div class="video-controls" v-if="videoIds.length > 1">
            <div class="video-info">
              <span class="video-counter">{{ currentVideoIndex + 1 }} / {{ videoIds.length }}</span>
              <button @click="nextVideo" class="next-video-btn" title="Next Video">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Ticker - FIXED SIZE FOR ALL SCREENS -->
    <div class="ticker-container">
      <div class="time-display">
        <div class="time-content">
          <span class="time-hours">{{ timeHours }}</span>
          <span class="time-colon" :class="{ 'blink': showColon }">:</span>
          <span class="time-minutes">{{ timeMinutes }}</span>
        </div>
      </div>
      <div class="ticker-content">
        <div class="ticker-text" :key="currentTickerIndex">
          {{ currentTickerText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// Reactive data
const stats = ref({
  todayVisitors: 82,
  currentUsers: 186,
  todayRegistrations: 63,
  oneTimeTickets: 82
});

const events = ref([]);
const eventsLoading = ref(true);
const tickerTexts = ref(['Ma\'lumotlar yuklanmoqda...']);
const currentTickerIndex = ref(0);
const timeHours = ref('');
const timeMinutes = ref('');
const showColon = ref(true);
const currentVideoIndex = ref(0);

// Current ticker text
const currentTickerText = computed(() => {
  return tickerTexts.value[currentTickerIndex.value] || 'Ma\'lumotlar yuklanmoqda...';
});

// Computed property to determine if events list is minimal
const hasMinimalEvents = computed(() => {
  return !eventsLoading.value && events.value.length <= 2;
});

// YouTube playlist video IDs from your playlist
const videoIds = [
  'gzlHucbD76U',
  'Fi0BhHG0R8M',

];

// Shuffle array function
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Shuffled video IDs
const shuffledVideoIds = ref(shuffleArray(videoIds));

// YouTube URL with PROPER autoplay settings
const currentVideoUrl = computed(() => {
  const videoId = shuffledVideoIds.value[currentVideoIndex.value];
  const timestamp = Date.now();
  return `https://www.youtube.com/embed/${videoId}?` +
    'autoplay=1&' +           // Force autoplay
    'mute=0&' +               // UNMUTED for automatic audio
    'controls=1&' +           // Show controls for user interaction
    'rel=0&' +                // No related videos
    'modestbranding=1&' +     // Remove YouTube logo
    'showinfo=0&' +           // Hide video info
    'fs=1&' +                 // Allow fullscreen
    'disablekb=0&' +          // Allow keyboard
    'iv_load_policy=3&' +     // Hide annotations
    'cc_load_policy=0&' +     // Hide captions
    'playsinline=1&' +        // Play inline
    'loop=0&' +               // Don't loop individual videos
    'start=0&' +              // Start from beginning
    'enablejsapi=1&' +        // Enable JS API
    'origin=' + encodeURIComponent(window.location.origin) + '&' +
    `t=${timestamp}`;         // Force refresh
});

// Timer references
let timeInterval = null;
let colonBlinkInterval = null;
let statsInterval = null;
let eventsInterval = null;
let tickerInterval = null;
let videoInterval = null;

// Update current time with blinking colon
const updateTime = () => {
  const now = new Date();
  timeHours.value = now.getHours().toString().padStart(2, '0');
  timeMinutes.value = now.getMinutes().toString().padStart(2, '0');
};

// Start colon blinking animation
const startColonBlink = () => {
  colonBlinkInterval = setInterval(() => {
    showColon.value = !showColon.value;
  }, 1000); // Blink every second
};

// Fetch statistics from API
const fetchStats = async () => {
  try {
    const response = await fetch('/api/tv/stats');
    if (response.ok) {
      const data = await response.json();
      stats.value = {
        todayVisitors: data.todayVisitors || 82,
        currentUsers: data.currentUsers || 186,
        todayRegistrations: data.todayRegistrations || 63,
        oneTimeTickets: data.oneTimeTickets || 82
      };
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

// Fetch events from conference.natlib.uz with proper loading states
const fetchEvents = async () => {
  try {
    eventsLoading.value = true;
    console.log('🔄 Fetching events from conference.natlib.uz...');
    
    const response = await fetch('https://conference.natlib.uz/tadbir.php', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Events data received:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        events.value = data.map((event, index) => ({
          id: index,
          time: event.time || 'Vaqt ko\'rsatilmagan',
          description: event.description || event.name || 'Tavsif yo\'q'
        }));
        console.log(`📅 Loaded ${events.value.length} events`);
      } else {
        console.log('📅 No events in response');
        events.value = [];
      }
    } else {
      console.error('❌ Events API responded with error:', response.status);
      events.value = [];
    }
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    events.value = [];
    console.log('📅 API failed - showing empty events');
  } finally {
    eventsLoading.value = false;
    console.log('📅 Events loading completed');
  }
};

// Fetch ticker texts from conference.natlib.uz
const fetchTickerTexts = async () => {
  try {
    const response = await fetch('https://conference.natlib.uz/titr.php');
    if (response.ok) {
      const data = await response.json();
      console.log('📰 Ticker data received:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        tickerTexts.value = data;
        console.log(`📰 Loaded ${data.length} ticker texts`);
      } else {
        console.log('📰 No ticker texts in response, using fallback');
        tickerTexts.value = ['Nodirbekga shu yerdan turib qaleysiz deb qo\'yamiz ))))  🥹🥹🥹'];
      }
    }
  } catch (error) {
    console.error('Error fetching ticker texts:', error);
    tickerTexts.value = ['Alisher Navoiy nomidagi O\'zbekiston Milliy kutubxonasiga xush kelibsiz'];
  }
};

// Start ticker rotation - cycle through texts
const startTickerRotation = () => {
  // Calculate animation duration based on text length (minimum 20s, maximum 40s)
  const calculateDuration = (text) => {
    const baseSpeed = 50; // pixels per second
    const textWidth = text.length * 8; // approximate character width
    const screenWidth = window.innerWidth;
    const totalDistance = screenWidth + textWidth;
    return Math.max(20, Math.min(40, totalDistance / baseSpeed));
  };

  const rotateTickerText = () => {
    const duration = calculateDuration(currentTickerText.value);
    console.log(`📰 Showing ticker ${currentTickerIndex.value + 1}/${tickerTexts.value.length}: "${currentTickerText.value}" (${duration}s)`);
    
    // Move to next text after current animation completes
    setTimeout(() => {
      currentTickerIndex.value = (currentTickerIndex.value + 1) % tickerTexts.value.length;
      rotateTickerText(); // Continue rotation
    }, duration * 1000);
  };

  // Start the rotation
  rotateTickerText();
};

// Force video switching with iframe reload - LESS AGGRESSIVE
const nextVideo = () => {
  console.log('🎵 Switching to next video...');
  currentVideoIndex.value = (currentVideoIndex.value + 1) % shuffledVideoIds.value.length;
  
  if (currentVideoIndex.value === 0) {
    console.log('🔀 Reshuffling playlist for randomness');
    shuffledVideoIds.value = shuffleArray(videoIds);
  }
  
  const nextVideoId = shuffledVideoIds.value[currentVideoIndex.value];
  console.log(`🎵 Now playing video ${currentVideoIndex.value + 1} of ${shuffledVideoIds.value.length}: ${nextVideoId}`);
};

// Enhanced video load handler - SIMPLIFIED
const onVideoLoad = () => {
  console.log('🎵 Video loaded:', shuffledVideoIds.value[currentVideoIndex.value]);
  
  // Simple user interaction simulation
  setTimeout(() => {
    console.log('🔊 Video should be playing with audio');
  }, 2000);
};

// Get reference to YouTube player iframe
const youtubePlayer = ref(null);

// Initialize everything
onMounted(() => {
  console.log('🎵 TV Display initializing...');
  
  // Start time and colon blinking
  updateTime();
  startColonBlink();
  timeInterval = setInterval(updateTime, 1000);
  
  // Fetch initial data
  fetchStats();
  fetchEvents();
  fetchTickerTexts();
  
  // Set up intervals
  statsInterval = setInterval(fetchStats, 30000);
  eventsInterval = setInterval(fetchEvents, 300000); // Refresh every 5 minutes
  
  // Start ticker rotation after data is loaded
  setTimeout(() => {
    startTickerRotation();
  }, 2000);
  
  // LESS AGGRESSIVE video switching - every 5 minutes
  videoInterval = setInterval(() => {
    console.log('⏰ Timer-based video switch');
    nextVideo();
  }, 300000); // Switch every 5 minutes instead of 3
  
  // Refresh ticker texts every 2 minutes
  setInterval(fetchTickerTexts, 120000);
  
  console.log('🎵 TV Display initialized with', videoIds.length, 'videos in playlist');
});

// Cleanup
onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (colonBlinkInterval) clearInterval(colonBlinkInterval);
  if (statsInterval) clearInterval(statsInterval);
  if (eventsInterval) clearInterval(eventsInterval);
  if (tickerInterval) clearInterval(tickerInterval);
  if (videoInterval) clearInterval(videoInterval);
});
</script>

<style scoped>
.tv-display {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  padding: 15px;
  gap: 15px;
}

.left-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0; /* Allow shrinking */
}

.stat-card {
  background: white;
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
  font-weight: bold;
  margin: 0;
  line-height: 1;
}

.visitors-number {
  color: #ef4444;
}

.users-number {
  color: #10b981;
}

.registrations-number {
  color: #10b981;
}

.tickets-number {
  color: #3b82f6;
}

/* AUTOMATIC SIZE EVENTS CARD */
.events-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 80px;
  transition: all 0.3s ease;
}

.events-card.events-loading {
  min-height: 120px;
}

.events-card.events-minimal {
  flex-shrink: 2;
}

.events-title {
  font-size: 16px;
  font-weight: bold;
  color: #f97316;
  margin: 0 0 12px 0;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 300px;
}

/* LOADING STATE STYLES */
.events-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: #666;
  font-style: italic;
}

/* EVENTS CONTENT STYLES */
.events-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  padding: 4px 0;
}

.event-time {
  font-weight: 600;
  color: #f97316;
  min-width: 45px;
  flex-shrink: 0;
}

.event-time.time-16 {
  color: #000000;
}

.event-time.time-17 {
  color: #dc2626;
}

.event-separator {
  color: #666;
  flex-shrink: 0;
}

.event-description {
  flex: 1;
  color: #333;
}

/* NO EVENTS STATE */
.no-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 8px;
}

.no-events-icon {
  font-size: 24px;
  opacity: 0.5;
}

.no-events-text {
  font-size: 13px;
  color: #666;
  font-style: italic;
  text-align: center;
}

/* VIDEO CONTAINER */
.video-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.video-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.video-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-container:hover .video-controls {
  opacity: 1;
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-counter {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.next-video-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.next-video-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.next-video-btn svg {
  width: 16px;
  height: 16px;
}

/* TICKER CONTAINER */
.ticker-container {
  height: 50px;
  background: linear-gradient(90deg, #06b6d4, #8b5cf6);
  display: flex;
  align-items: stretch;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

/* TIME DISPLAY */
.time-display {
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-family: 'Arial', sans-serif;
  width: 90px;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 15px;
}

.time-content {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.time-hours,
.time-minutes {
  font-size: 18px;
  font-weight: bold;
}

.time-colon {
  font-size: 18px;
  font-weight: bold;
  transition: opacity 0.1s ease;
  margin: 0 1px;
}

.time-colon.blink {
  opacity: 0;
}

/* TICKER CONTENT AREA */
.ticker-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

/* TICKER TEXT - RIGHT TO LEFT ANIMATION */
.ticker-text {
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Arial', sans-serif;
  white-space: nowrap;
  position: absolute;
  will-change: transform;
  line-height: 1;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  height: 100%;
  /* Start from far right, animate to far left */
  animation: tickerScrollRTL 25s linear infinite;
}

@keyframes tickerScrollRTL {
  0% {
    transform: translateX(100vw); /* Start from far right of viewport */
  }
  100% {
    transform: translateX(-100%); /* End at far left (completely off screen) */
  }
}

/* RESPONSIVE STYLES */
@media (max-width: 1200px) {
  .left-panel {
    width: 280px;
  }
  
  .stat-number {
    font-size: 36px;
  }
  
  .stat-title {
    font-size: 14px;
  }
  
  .stat-subtitle {
    font-size: 11px;
  }
  
  .time-display {
    width: 90px;
    padding: 0 15px;
  }
  
  .time-content,
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 18px;
  }
  
  .ticker-text {
    font-size: 14px;
  }
  
  .ticker-container {
    height: 50px;
  }
}

@media (max-width: 900px) {
  .main-content {
    flex-direction: column;
    padding: 10px;
    gap: 10px;
  }
  
  .left-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    height: auto;
  }
  
  .stat-card {
    flex: 1;
    min-width: 150px;
  }
  
  .events-card {
    width: 100%;
    order: 5;
  }
  
  .right-panel {
    flex: 1;
    min-height: 300px;
  }
  
  .video-controls {
    position: static;
    opacity: 1;
    margin-top: 10px;
    justify-content: center;
  }
  
  .time-display {
    width: 90px;
    padding: 0 15px;
  }
  
  .time-content,
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 18px;
  }
  
  .ticker-text {
    font-size: 14px;
  }
  
  .ticker-container {
    height: 50px;
  }
}

@media (max-width: 640px) {
  .time-display {
    width: 80px;
    padding: 0 12px;
  }
  
  .time-content,
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 16px;
  }
  
  .ticker-text {
    font-size: 13px;
  }
  
  .ticker-container {
    height: 45px;
  }
  
  .stat-title {
    font-size: 13px;
  }
  
  .event-item {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .time-display {
    width: 75px;
    padding: 0 10px;
  }
  
  .time-content,
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 15px;
  }
  
  .ticker-text {
    font-size: 12px;
  }
  
  .ticker-container {
    height: 40px;
  }
}

/* Ensure consistent font rendering */
.time-display,
.ticker-text {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
</style>
