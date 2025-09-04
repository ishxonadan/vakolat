<template>
  <div class="tv-display">
    <div class="main-content">
      <div class="left-panel">
        <div class="stat-card visitors-card">
          <h3 class="stat-title">Bugun tashrif buyurganlar</h3>
          <p class="stat-subtitle">Visitors today</p>
          <div class="stat-number visitors-number">{{ stats.todayVisitors }}</div>
        </div>

        <div class="stat-card users-card">
          <h3 class="stat-title">Kutubxonada ayni paytda foydalanuvchilar</h3>
          <p class="stat-subtitle">Current users in the library</p>
          <div class="stat-number users-number">{{ stats.currentUsers }}</div>
        </div>

        <div class="stat-card registrations-card">
          <h3 class="stat-title">Bugun a'zo bo'lganlar</h3>
          <p class="stat-subtitle">Registers today</p>
          <div class="stat-number registrations-number">{{ stats.todayRegistrations }}</div>
        </div>

        <div class="stat-card tickets-card">
          <h3 class="stat-title">Bir martalik chipta berildi</h3>
          <p class="stat-subtitle">One-time tickets given</p>
          <div class="stat-number tickets-number">{{ stats.oneTimeTickets }}</div>
        </div>

        <!-- <div class="events-card" :class="{ 'events-loading': eventsLoading, 'events-minimal': hasMinimalEvents }">
          <h3 class="events-title">Rejalashtirilgan tadbirlar:</h3>
          <div class="events-list">
            <div v-if="eventsLoading" class="events-loading-state">
              <div class="loading-spinner"></div>
              <div class="loading-text">Ma'lumotlar yuklanmoqda...</div>
            </div>
            <div v-else-if="events.length > 0" class="events-content">
              <div v-for="event in events" :key="event.id" class="event-item">
                <span class="event-time">{{ event.time }}</span>
                <span class="event-separator">—</span>
                <span class="event-description">{{ event.description }}</span>
              </div>
            </div>
            <div v-else class="no-events">
              <div class="no-events-icon">📅</div>
              <div class="no-events-text">Bugun rejalashtirilgan tadbirlar yo'q</div>
            </div>
          </div>
        </div> -->
      </div>

      <div class="right-panel">
        <div 
          class="video-container" 
          @mousemove="onMouseMove"
          @mouseleave="onMouseLeave"
        >
          <div v-if="videoLoading" class="video-loading-state">
            <div class="loading-spinner"></div>
            <div class="loading-text">Videolar yuklanmoqda...</div>
          </div>
          
          <video
            v-else-if="currentVideoUrl"
            ref="videoPlayer"
            :src="currentVideoUrl"
            autoplay
            preload="auto"
            @ended="onVideoEnded"
            @loadstart="onVideoLoadStart"
            @canplay="onVideoCanPlay"
            @loadedmetadata="onVideoLoadedMetadata"
            @error="onVideoError"
            class="video-element"
          ></video>
          
          <div v-else class="no-videos-state">
            <div class="no-videos-icon">🎬</div>
            <div class="no-videos-text">Videolar topilmadi</div>
            <div class="no-videos-subtitle">/rolik/natlib va /rolik/klip papkalarini tekshiring</div>
          </div>
          
          <div 
            v-if="currentVideoUrl && !videoLoading" 
            class="video-controls-overlay"
            :class="{ 'controls-visible': showControls }"
          >
            <div class="video-controls">
              <button @click="previousVideo" class="control-btn" title="Oldingi video">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 18L9 12L15 6V18Z"/>
                </svg>
              </button>
              <button @click="togglePlayPause" class="control-btn" :title="isPlaying ? 'To\'xtatish' : 'Boshlash'">
                <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5V19L19 12L8 5Z"/>
                </svg>
              </button>
              <button @click="nextVideo" class="control-btn" title="Keyingi video">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 18L15 12L9 6V18Z"/>
                </svg>
              </button>
              <button @click="toggleMute" class="control-btn" :title="isMuted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'">
                <svg v-if="isMuted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM19 12C19 15.53 16.39 18.35 13 18.92V20.92C17.27 20.33 20.5 16.84 20.5 12.5C20.5 8.16 17.27 4.67 13 4.08V6.08C16.39 6.65 19 9.47 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.46 14 18.7V20.7C15.38 20.36 16.63 19.65 17.68 18.68L19.73 20.73L21 19.46L12 10.46L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23ZM12 4L9.91 6.09L12 8.18V4Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ticker-container">
      <div class="time-display">
        <div class="time-content">
          <span class="time-hours">{{ timeHours }}</span>
          <span class="time-colon" :class="{ 'blink': showColon }">:</span>
          <span class="time-minutes">{{ timeMinutes }}</span>
        </div>
      </div>
      <div class="ticker-content">
        <div 
          class="ticker-text" 
          :key="`ticker-${currentTickerIndex}-${tickerAnimationKey}`"
          :style="{ animationDuration: tickerDuration + 's' }"
        >
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
  todayVisitors: 0,
  currentUsers: 0,
  todayRegistrations: 0,
  oneTimeTickets: 0
});

const events = ref([]);
const eventsLoading = ref(true);
const tickerTexts = ref(['Ma\'lumotlar yuklanmoqda...']);
const currentTickerIndex = ref(0);
const tickerAnimationKey = ref(0); // Force re-render of animation
const tickerDuration = ref(15); // Dynamic duration based on text length
const timeHours = ref('');
const timeMinutes = ref('');
const showColon = ref(true);

// Video player state
const videoLoading = ref(true);
const currentVideoUrl = ref('');
const currentVideoIndex = ref(0);
const isPlaying = ref(false);
const isMuted = ref(false); // Start unmuted since Chrome allows it
const videoPlayer = ref(null);
const showControls = ref(true);

// Video collections
const natlibVideos = ref([]);
const klipVideos = ref([]);

// Natlib specific state (can repeat)
const natlibCurrentIndex = ref(0);

// Klip specific state (IMPROVED RANDOMNESS)
const klipPlaylist = ref([]);
const klipCurrentIndex = ref(0);

// ROBUST ALTERNATION STATE - Track what was last played
const lastPlayedType = ref(null); // 'natlib' or 'klip'
const videoPlayCount = ref(0); // Total videos played

// Control visibility timer
let controlsHideTimer = null;

// Current ticker text
const currentTickerText = computed(() => {
  return tickerTexts.value[currentTickerIndex.value] || 'Ma\'lumotlar yuklanmoqda...';
});

// Computed property to determine if events list is minimal
const hasMinimalEvents = computed(() => {
  return !eventsLoading.value && events.value.length <= 2;
});

// Total videos count
const totalVideos = computed(() => {
  return natlibVideos.value.length + klipVideos.value.length;
});

// Timer references
let timeInterval = null;
let colonBlinkInterval = null;
let statsInterval = null;
let eventsInterval = null;
let tickerInterval = null;

// 🔧 FIXED: Proper URL encoding for filenames with special characters
const encodeVideoFilename = (filename) => {
  // Encode the filename to handle special characters like #, %, spaces, etc.
  return encodeURIComponent(filename)
    .replace(/'/g, "%27")  // Single quotes
    .replace(/\(/g, "%28") // Opening parenthesis
    .replace(/\)/g, "%29") // Closing parenthesis
    .replace(/\*/g, "%2A") // Asterisk
    .replace(/!/g, "%21")  // Exclamation mark
    .replace(/~/g, "%7E"); // Tilde
};

// 🔧 FIXED: Build proper video URLs with encoding
const buildVideoUrl = (type, filename) => {
  const encodedFilename = encodeVideoFilename(filename);
  const url = `/rolik/${type}/${encodedFilename}`;
  
  console.log(`🔗 Building URL:`);
  console.log(`   Original: /rolik/${type}/${filename}`);
  console.log(`   Encoded:  ${url}`);
  
  return url;
};

// Controls visibility management
const showControlsTemporarily = () => {
  showControls.value = true;
  
  // Clear existing timer
  if (controlsHideTimer) {
    clearTimeout(controlsHideTimer);
  }
  
  // Hide controls after 3 seconds
  controlsHideTimer = setTimeout(() => {
    showControls.value = false;
  }, 3000);
};

const onMouseMove = () => {
  showControlsTemporarily();
};

const onMouseLeave = () => {
  // Hide controls immediately when mouse leaves
  if (controlsHideTimer) {
    clearTimeout(controlsHideTimer);
  }
  showControls.value = false;
};

// IMPROVED SHUFFLE FUNCTION - Fisher-Yates with better randomness
const shuffleArray = (array) => {
  const shuffled = [...array];
  
  // Fisher-Yates shuffle with crypto-random if available
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues for better randomness if available
    let randomValue;
    if (window.crypto && window.crypto.getRandomValues) {
      const randomArray = new Uint32Array(1);
      window.crypto.getRandomValues(randomArray);
      randomValue = randomArray[0] / (0xFFFFFFFF + 1); // Convert to 0-1 range
    } else {
      randomValue = Math.random();
    }
    
    const j = Math.floor(randomValue * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  console.log('🔀 Shuffled array:', shuffled.map(item => item.substring(0, 20) + '...'));
  return shuffled;
};

// Calculate ticker duration based on text length
const calculateTickerDuration = (text) => {
  // Base duration: 15 seconds for average text
  // Adjust based on text length (longer text = longer duration)
  const baseSpeed = 100; // pixels per second
  const textLength = text.length;
  const estimatedWidth = textLength * 12; // Rough estimate: 12px per character
  const screenWidth = window.innerWidth || 1920;
  const totalDistance = screenWidth + estimatedWidth;
  
  // Calculate duration (minimum 10 seconds, maximum 25 seconds)
  const calculatedDuration = Math.max(10, Math.min(25, totalDistance / baseSpeed));
  
  console.log(`📰 Text: "${text.substring(0, 50)}..." (${textLength} chars)`);
  console.log(`📰 Calculated duration: ${calculatedDuration.toFixed(1)}s`);
  
  return Math.round(calculatedDuration);
};

// Fetch video list from server
const fetchVideoList = async () => {
  try {
    videoLoading.value = true;
    console.log('🎬 Fetching video list from /rolik folder...');
    
    const response = await fetch('/api/videos/list');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Video data received:', data);
      
      natlibVideos.value = data.natlib || [];
      klipVideos.value = data.klip || [];
      
      console.log(`📁 Natlib videos: ${natlibVideos.value.length}`);
      console.log(`📁 Klip videos: ${klipVideos.value.length}`);
      
      // 🔧 FIXED: Log any videos with special characters
      const problematicNatlib = natlibVideos.value.filter(name => name.includes('#') || name.includes('%') || name.includes(' '));
      const problematicKlip = klipVideos.value.filter(name => name.includes('#') || name.includes('%') || name.includes(' '));
      
      if (problematicNatlib.length > 0) {
        console.log('⚠️ Natlib videos with special characters:', problematicNatlib);
      }
      if (problematicKlip.length > 0) {
        console.log('⚠️ Klip videos with special characters:', problematicKlip);
      }
      
      // Initialize playlists
      initializePlaylists();
      
      // Start playing first video
      if (natlibVideos.value.length > 0 || klipVideos.value.length > 0) {
        playNextVideo();
      }
    } else {
      console.error('❌ Failed to fetch video list:', response.status);
    }
  } catch (error) {
    console.error('❌ Error fetching video list:', error);
  } finally {
    videoLoading.value = false;
  }
};

// IMPROVED PLAYLIST INITIALIZATION - Multiple shuffles for better randomness
const initializePlaylists = () => {
  // Initialize klip playlist with MULTIPLE shuffles for better randomness
  if (klipVideos.value.length > 0) {
    let playlist = [...klipVideos.value];
    
    // Shuffle multiple times for better randomness
    for (let i = 0; i < 3; i++) {
      playlist = shuffleArray(playlist);
    }
    
    klipPlaylist.value = playlist;
    klipCurrentIndex.value = 0;
    console.log('🔀 Klip playlist triple-shuffled:', klipPlaylist.value.length, 'videos');
    console.log('🎬 First 5 klip videos:', klipPlaylist.value.slice(0, 5));
  }
  
  // Natlib videos can repeat in order
  natlibCurrentIndex.value = 0;
  
  // RESET ALTERNATION STATE
  lastPlayedType.value = null;
  videoPlayCount.value = 0;
  
  console.log('🎬 Playlists initialized with improved randomness');
  console.log('🔄 Alternation state reset');
};

// IMPROVED: Get next klip video with better randomness
const getNextKlipVideo = () => {
  // If we've reached the end of current playlist, create a NEW shuffled playlist
  if (klipCurrentIndex.value >= klipPlaylist.value.length) {
    console.log('🔀 Klip playlist finished, creating NEW shuffled playlist...');
    
    // Create a completely new shuffled playlist
    let newPlaylist = [...klipVideos.value];
    
    // Shuffle multiple times for maximum randomness
    for (let i = 0; i < 3; i++) {
      newPlaylist = shuffleArray(newPlaylist);
    }
    
    // EXTRA RANDOMNESS: Ensure first video is different from last played
    const lastPlayedVideo = klipPlaylist.value[klipPlaylist.value.length - 1];
    if (newPlaylist.length > 1 && newPlaylist[0] === lastPlayedVideo) {
      // Swap first video with a random position
      const randomIndex = Math.floor(Math.random() * (newPlaylist.length - 1)) + 1;
      [newPlaylist[0], newPlaylist[randomIndex]] = [newPlaylist[randomIndex], newPlaylist[0]];
      console.log('🔄 Swapped first video to avoid repetition');
    }
    
    klipPlaylist.value = newPlaylist;
    klipCurrentIndex.value = 0;
    
    console.log('✨ NEW klip playlist created with enhanced randomness');
    console.log('🎬 New first 5 klip videos:', klipPlaylist.value.slice(0, 5));
  }
  
  const video = klipPlaylist.value[klipCurrentIndex.value];
  klipCurrentIndex.value++;
  
  console.log(`🎬 Playing Klip video ${klipCurrentIndex.value}/${klipPlaylist.value.length}: ${video}`);
  
  // 🔧 FIXED: Use proper URL encoding
  return buildVideoUrl('klip', video);
};

// COMPLETELY REWRITTEN ALTERNATION LOGIC - BULLETPROOF
const getNextVideo = () => {
  const totalNatlib = natlibVideos.value.length;
  const totalKlip = klipVideos.value.length;
  
  videoPlayCount.value++;
  
  console.log(`\n🎭 === VIDEO SELECTION #${videoPlayCount.value} ===`);
  console.log(`📊 Available: ${totalNatlib} natlib, ${totalKlip} klip`);
  console.log(`📜 Last played type: ${lastPlayedType.value || 'NONE'}`);
  
  if (totalNatlib === 0 && totalKlip === 0) {
    console.log('❌ No videos available');
    return null;
  }
  
  // If only one type exists, play from that type
  if (totalNatlib === 0) {
    console.log('🎬 Only KLIP videos available');
    lastPlayedType.value = 'klip';
    return getNextKlipVideo();
  }
  
  if (totalKlip === 0) {
    console.log('🎬 Only NATLIB videos available');
    const video = natlibVideos.value[natlibCurrentIndex.value];
    natlibCurrentIndex.value = (natlibCurrentIndex.value + 1) % totalNatlib;
    lastPlayedType.value = 'natlib';
    console.log(`✅ Playing NATLIB: ${video}`);
    
    // 🔧 FIXED: Use proper URL encoding
    return buildVideoUrl('natlib', video);
  }
  
  // Both types exist - STRICT ALTERNATION BASED ON LAST PLAYED
  let nextType;
  
  if (lastPlayedType.value === null) {
    // First video ever - start with natlib
    nextType = 'natlib';
    console.log('🎬 FIRST VIDEO - Starting with NATLIB');
  } else if (lastPlayedType.value === 'natlib') {
    // Last was natlib, now play klip
    nextType = 'klip';
    console.log('🔄 Last was NATLIB → Now playing KLIP');
  } else {
    // Last was klip, now play natlib
    nextType = 'natlib';
    console.log('🔄 Last was KLIP → Now playing NATLIB');
  }
  
  // Play the determined type
  if (nextType === 'natlib') {
    const video = natlibVideos.value[natlibCurrentIndex.value];
    natlibCurrentIndex.value = (natlibCurrentIndex.value + 1) % totalNatlib;
    lastPlayedType.value = 'natlib';
    console.log(`✅ PLAYING NATLIB: ${video}`);
    console.log(`📍 Next will be: KLIP`);
    
    // 🔧 FIXED: Use proper URL encoding
    return buildVideoUrl('natlib', video);
  } else {
    const klipVideo = getNextKlipVideo();
    lastPlayedType.value = 'klip';
    console.log(`✅ PLAYING KLIP: ${klipVideo}`);
    console.log(`📍 Next will be: NATLIB`);
    return klipVideo;
  }
};

// Play next video
const playNextVideo = () => {
  const nextVideoUrl = getNextVideo();
  if (nextVideoUrl) {
    currentVideoUrl.value = nextVideoUrl;
    currentVideoIndex.value = (currentVideoIndex.value + 1) % totalVideos.value;
    console.log('▶️ Setting video URL:', nextVideoUrl);
    console.log(`🎭 Alternation state updated: lastPlayedType = ${lastPlayedType.value}`);
  }
};

// Play previous video (simplified - just get next video)
const previousVideo = () => {
  playNextVideo(); // For simplicity, just play next video
  showControlsTemporarily();
};

// Next video
const nextVideo = () => {
  playNextVideo();
  showControlsTemporarily();
};

// Toggle play/pause
const togglePlayPause = () => {
  const video = videoPlayer.value;
  if (!video) return;
  
  if (video.paused) {
    video.play();
    isPlaying.value = true;
  } else {
    video.pause();
    isPlaying.value = false;
  }
  showControlsTemporarily();
};

// Toggle mute
const toggleMute = () => {
  const video = videoPlayer.value;
  if (!video) return;
  
  video.muted = !video.muted;
  isMuted.value = video.muted;
  showControlsTemporarily();
};

// Video event handlers
const onVideoEnded = () => {
  console.log('🎬 Video ended naturally');
  console.log(`🔄 Current alternation state: lastPlayedType = ${lastPlayedType.value}`);
  playNextVideo();
};

const onVideoLoadStart = () => {
  console.log('🎬 Video loading started');
  isPlaying.value = false;
};

const onVideoLoadedMetadata = () => {
  console.log('🎬 Video metadata loaded');
  const video = videoPlayer.value;
  if (video) {
    console.log(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
  }
};

const onVideoCanPlay = async () => {
  console.log('🎬 Video can play');
  const video = videoPlayer.value;
  if (video) {
    try {
      // Since Chrome has --autoplay-policy=no-user-gesture-required
      // We can start with audio immediately
      video.muted = false;
      video.volume = 1.0;
      isMuted.value = false;
      
      await video.play();
      isPlaying.value = true;
      console.log('▶️ Video playing with audio automatically');
      
    } catch (error) {
      console.error('❌ Autoplay failed:', error);
      // Fallback: try muted autoplay
      try {
        video.muted = true;
        isMuted.value = true;
        await video.play();
        isPlaying.value = true;
        console.log('▶️ Video playing muted as fallback');
      } catch (mutedError) {
        console.error('❌ Even muted autoplay failed:', mutedError);
      }
    }
  }
};

const onVideoError = (event) => {
  console.error('❌ Video error:', event);
  console.error('❌ Video src that failed:', currentVideoUrl.value);
  
  // 🔧 FIXED: Better error handling for URL encoding issues
  const video = videoPlayer.value;
  if (video && video.error) {
    console.error('❌ Video error details:', {
      code: video.error.code,
      message: video.error.message,
      src: video.src
    });
    
    // Check if it's a URL encoding issue
    if (video.src.includes('#') && !video.src.includes('%23')) {
      console.error('❌ DETECTED: Unencoded hashtag in URL - this is the problem!');
    }
  }
  
  console.log('🔄 Trying next video...');
  setTimeout(() => {
    playNextVideo();
  }, 2000);
};

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
        todayVisitors: data.todayVisitors || 0,
        currentUsers: data.currentUsers || 0,
        todayRegistrations: data.todayRegistrations || 0,
        oneTimeTickets: data.oneTimeTickets || 0
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
    console.log('🔄 Fetching events from /tv/tadbir.php...');
    
    const response = await fetch('https://conference.natlib.uz/tv/tadbir.php', {
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
      console.log('📅 API failed - showing empty events');
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
    const response = await fetch('https://conference.natlib.uz/tv/titr.php');
    if (response.ok) {
      const data = await response.json();
      console.log('📰 Ticker data received:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        tickerTexts.value = data;
        console.log(`📰 Loaded ${data.length} ticker texts`);
      } else {
        console.log('📰 No ticker texts in response, using fallback');
        tickerTexts.value = ['Alisher Navoiy nomidagi O\'zbekiston Milliy kutubxonasiga xush kelibsiz'];
      }
    }
  } catch (error) {
    console.error('Error fetching ticker texts:', error);
    tickerTexts.value = ['Alisher Navoiy nomidagi O\'zbekiston Milliy kutubxonasiga xush kelibsiz'];
  }
};

// IMPROVED ticker rotation - no gaps, smooth transitions
const startTickerRotation = () => {
  const rotateTickerText = () => {
    // Calculate duration based on current text length
    const currentText = currentTickerText.value;
    const duration = calculateTickerDuration(currentText);
    tickerDuration.value = duration;
    
    console.log(`📰 Starting ticker ${currentTickerIndex.value + 1}/${tickerTexts.value.length}`);
    console.log(`📰 Text: "${currentText}"`);
    console.log(`📰 Duration: ${duration}s`);
    
    // Force animation restart by changing key
    tickerAnimationKey.value++;
    
    // Move to next text when current animation completes
    setTimeout(() => {
      currentTickerIndex.value = (currentTickerIndex.value + 1) % tickerTexts.value.length;
      rotateTickerText(); // Continue rotation
    }, duration * 1000);
  };

  // Start the rotation
  rotateTickerText();
};

// Initialize everything
onMounted(() => {
  console.log('🎬 TV Display initializing...');
  
  // Start time and colon blinking
  updateTime();
  startColonBlink();
  timeInterval = setInterval(updateTime, 1000);
  
  // Fetch initial data
  fetchStats();
  fetchEvents();
  fetchTickerTexts();
  fetchVideoList(); // Load videos
  
  // Set up intervals
  statsInterval = setInterval(fetchStats, 30000);
  eventsInterval = setInterval(fetchEvents, 300000); // Refresh every 5 minutes
  
  // Start ticker rotation after data is loaded
  setTimeout(() => {
    startTickerRotation();
  }, 2000);
  
  // Refresh ticker texts every 2 minutes
  setInterval(fetchTickerTexts, 120000);
  
  // Show controls initially
  showControlsTemporarily();
  
  console.log('🎬 TV Display initialized');
});

// Cleanup
onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (colonBlinkInterval) clearInterval(colonBlinkInterval);
  if (statsInterval) clearInterval(statsInterval);
  if (eventsInterval) clearInterval(eventsInterval);
  if (tickerInterval) clearInterval(tickerInterval);
  if (controlsHideTimer) clearTimeout(controlsHideTimer);
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
  padding-bottom: 85px; /* Add space for fixed ticker (70px + 15px) */
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
  color: gold;
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

/* ALL EVENT TIMES ARE BLACK */
.event-time {
  font-weight: 600;
  color: #000000;
  min-width: 45px;
  flex-shrink: 0;
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

/* VIDEO ELEMENT - BETTER FITTING FOR ALL ASPECT RATIOS */
.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Changed back to contain to ensure all videos are visible */
  background: #000;
}

/* VIDEO LOADING STATE */
.video-loading-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  color: white;
  gap: 16px;
}

.video-loading-state .loading-spinner {
  border-color: #333;
  border-top-color: #fff;
}

.video-loading-state .loading-text {
  color: white;
  font-size: 16px;
}

/* NO VIDEOS STATE */
.no-videos-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  color: white;
  gap: 12px;
  text-align: center;
  padding: 20px;
}

.no-videos-icon {
  font-size: 48px;
  opacity: 0.5;
}

.no-videos-text {
  font-size: 18px;
  font-weight: 600;
}

.no-videos-subtitle {
  font-size: 14px;
  opacity: 0.7;
}

/* VIDEO CONTROLS OVERLAY - ONLY CONTROLS, NO VIDEO INFO */
.video-controls-overlay {
  position: fixed; /* Changed from absolute to fixed */
  bottom: 70px; /* Position above ticker (ticker height) */
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
  padding: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 999; /* Above video, below ticker */
}

.video-controls-overlay.controls-visible {
  opacity: 1;
  pointer-events: auto;
}

/* VIDEO CONTROLS - CENTERED AT BOTTOM */
.video-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 11;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn svg {
  width: 20px;
  height: 20px;
}

/* TICKER CONTAINER - BIGGER SIZE */
.ticker-container {
  position: fixed; /* Changed to fixed positioning */
  bottom: 0; /* Stick to bottom */
  left: 0; /* Full width */
  right: 0; /* Full width */
  height: 70px;
  background: linear-gradient(90deg, #06b6d4, #8b5cf6);
  display: flex;
  align-items: stretch;
  overflow: hidden;
  z-index: 1000; /* Always on top */
  flex-shrink: 0;
}

/* TIME DISPLAY - BIGGER */
.time-display {
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-family: 'Arial', sans-serif;
  width: 120px; /* Increased from 90px to 120px */
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 20px; /* Increased padding */
}

.time-content {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px; /* Increased from 18px to 26px */
  font-weight: bold;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.time-hours,
.time-minutes {
  font-size: 26px; /* Increased from 18px to 26px */
  font-weight: bold;
}

.time-colon {
  font-size: 26px; /* Increased from 18px to 26px */
  font-weight: bold;
  transition: opacity 0.1s ease;
  margin: 0 2px; /* Increased margin */
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

/* TICKER TEXT - FIXED CONTINUOUS SCROLL, NO GAPS */
.ticker-text {
  color: white;
  font-size: 20px;
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
  /* Start from far right edge of screen, move to completely off left edge */
  animation: tickerScrollFixed linear infinite;
  /* Ensure text starts from right edge */
  left: 100%;
}

/* IMPROVED ANIMATION - ALWAYS START FROM FAR RIGHT */
@keyframes tickerScrollFixed {
  0% {
    transform: translateX(0); /* Start from right edge (left: 100%) */
  }
  100% {
    transform: translateX(calc(-100vw - 100%)); /* Move completely off left edge */
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
  
  .control-btn {
    width: 44px;
    height: 44px;
  }
  
  .control-btn svg {
    width: 18px;
    height: 18px;
  }
  
  /* Responsive ticker */
  .ticker-container {
    height: 60px; /* Slightly smaller on medium screens */
  }
  
  .time-display {
    width: 100px;
  }
  
  .time-content {
    font-size: 22px;
  }
  
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 22px;
  }
  
  .ticker-text {
    font-size: 18px;
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
  
  .video-controls-overlay.controls-visible {
    opacity: 1;
    pointer-events: auto;
  }
  
  .video-controls {
    gap: 12px;
  }
  
  .control-btn {
    width: 40px;
    height: 40px;
  }
  
  .control-btn svg {
    width: 16px;
    height: 16px;
  }
  
  /* Mobile ticker */
  .ticker-container {
    height: 55px;
  }
  
  .time-display {
    width: 90px;
    padding: 0 15px;
  }
  
  .time-content {
    font-size: 20px;
  }
  
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 20px;
  }
  
  .ticker-text {
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .control-btn {
    width: 36px;
    height: 36px;
  }
  
  .control-btn svg {
    width: 14px;
    height: 14px;
  }
  
  /* Small mobile ticker */
  .ticker-container {
    height: 50px;
  }
  
  .time-display {
    width: 80px;
    padding: 0 10px;
  }
  
  .time-content {
    font-size: 18px;
  }
  
  .time-hours,
  .time-minutes,
  .time-colon {
    font-size: 18px;
  }
  
  .ticker-text {
    font-size: 14px;
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
