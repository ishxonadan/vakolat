<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :closable="true"
    class="webcam-dialog"
    :style="{ width: 'min(1120px, 96vw)' }"
    @hide="cleanup"
  >
    <template #header>
      <div class="webcam-header">
        <span class="webcam-header-icon"><i class="pi pi-camera" /></span>
        <div>
          <div class="webcam-header-title">Rasm olish</div>
          <div class="webcam-header-sub">{{ capturedImage ? 'Yuzni ramkaga joylashtiring va rangni sozlang' : 'Rangni sozlang, yuz ramkada bo‘lsin — keyin rasm oling' }}</div>
        </div>
      </div>
    </template>

    <div class="webcam-shell">
      <div v-show="!capturedImage" class="webcam-live">
        <div class="webcam-live-grid">
          <div class="webcam-live-main">
            <div class="webcam-toolbar">
              <Dropdown
                v-model="selectedCamera"
                :options="cameras"
                optionLabel="label"
                optionValue="deviceId"
                placeholder="Kamerani tanlang"
                class="webcam-camera-select"
                @change="switchCamera"
              />
              <label class="webcam-switch">
                <InputSwitch v-model="autoDetectFace" @change="onAutoDetectToggle" />
                <span>Yuz aniqlash</span>
              </label>
              <label class="webcam-switch" :class="{ disabled: !autoDetectFace }">
                <Checkbox
                  v-model="autoCapture"
                  binary
                  :disabled="!autoDetectFace"
                  @change="onAutoCaptureToggle"
                />
                <span>Avtomatik olish</span>
              </label>
            </div>

            <div class="webcam-display">
              <video
                ref="videoElement"
                autoplay
                playsinline
                :class="{ mirror: isFrontCamera }"
                :style="{ filter: previewFilter }"
              />
              <canvas ref="canvasElement" class="webcam-hidden-canvas" />
              <canvas
                v-if="autoDetectFace"
                ref="overlayCanvas"
                class="face-overlay"
              />
              <div v-if="countdown > 0" class="countdown-overlay">
                <div class="countdown-number">{{ countdown }}</div>
                <div class="countdown-hint">Kadrlanmoqda…</div>
              </div>
              <div v-if="capturingBurst" class="burst-overlay">
                <i class="pi pi-spin pi-spinner" />
                <span>Eng yaxshi kadrlar tanlanmoqda</span>
              </div>
              <div
                v-if="showCropArea"
                class="crop-area"
                :style="cropAreaStyle"
                :class="{ 'face-detected': faceDetected }"
              >
                <div class="crop-border" />
                <div v-if="faceDetected" class="face-indicator">
                  <i class="pi pi-check" />
                </div>
              </div>
              <div class="webcam-status" :class="{ ready: faceDetected, error: modelsFailed }">
                <i :class="statusIcon" />
                {{ statusText }}
              </div>
            </div>
          </div>

          <aside class="review-side">
            <div class="side-card">
              <div class="side-card-title side-card-title-row">
                <span><i class="pi pi-sliders-h" /> Rang sozlash</span>
                <label class="webcam-switch compact">
                  <InputSwitch v-model="autoColorCorrection" @change="onAutoColorToggle" />
                  <span>Avto</span>
                </label>
              </div>
              <p class="side-card-hint">Rasm olishdan oldin yorqinlik va kontrastni shu yerda sozlang.</p>
              <div class="adjust-row">
                <div class="adjust-meta">
                  <span>Yorqinlik</span>
                  <strong>{{ formatAdj(brightnessAdj) }}</strong>
                </div>
                <Slider v-model="brightnessAdj" :min="0.6" :max="2.4" :step="0.02" @update:modelValue="onManualAdjust" />
              </div>
              <div class="adjust-row">
                <div class="adjust-meta">
                  <span>Kontrast</span>
                  <strong>{{ formatAdj(contrastAdj) }}</strong>
                </div>
                <Slider v-model="contrastAdj" :min="0.7" :max="1.8" :step="0.02" @update:modelValue="onManualAdjust" />
              </div>
              <div class="adjust-row">
                <div class="adjust-meta">
                  <span>To‘yinganlik</span>
                  <strong>{{ formatAdj(saturationAdj) }}</strong>
                </div>
                <Slider v-model="saturationAdj" :min="0.4" :max="1.8" :step="0.02" @update:modelValue="onManualAdjust" />
              </div>
              <Button
                type="button"
                label="Qayta hisoblash"
                icon="pi pi-replay"
                severity="secondary"
                size="small"
                class="adjust-reset"
                @click="recomputeAutoAdjustments"
              />
            </div>
          </aside>
        </div>
      </div>

      <div v-if="capturedImage" class="webcam-review">
        <div class="review-main">
          <div class="review-label">Kesish</div>
          <div class="crop-container-custom">
            <div class="crop-wrapper" ref="cropWrapper">
              <img
                ref="cropImage"
                :src="capturedImage"
                alt="Captured"
                :style="{ filter: previewFilter }"
                @load="initManualCropWithFace"
              />
              <div
                class="crop-box"
                ref="cropBox"
                :style="cropBoxStyle"
                @mousedown.stop="startDrag"
              >
                <div class="crop-box-border" />
                <div class="resize-handle nw" @mousedown.stop="startResize('nw', $event)" />
                <div class="resize-handle ne" @mousedown.stop="startResize('ne', $event)" />
                <div class="resize-handle sw" @mousedown.stop="startResize('sw', $event)" />
                <div class="resize-handle se" @mousedown.stop="startResize('se', $event)" />
              </div>
            </div>
          </div>
          <div class="crop-info">Yakuniy o‘lcham: {{ targetWidth }}×{{ targetHeight }} px</div>
        </div>

        <aside class="review-side">
          <div class="side-card">
            <div class="side-card-title">
              <i class="pi pi-images" />
              Kadrlardan tanlang
            </div>
            <p class="side-card-hint">Avtomatik eng yaxshisi belgilangan. Boshqasini bosib tanlang.</p>
            <div class="frames-carousel">
              <button
                v-for="(frame, index) in rankedFrames"
                :key="index"
                type="button"
                class="frame-thumb"
                :class="{ active: capturedImage === frame.image, best: frame.isBest }"
                @click="selectFrame(frame)"
              >
                <img :src="frame.image" :alt="`Kadr ${index + 1}`" />
                <span v-if="frame.isBest" class="best-badge">Eng yaxshi</span>
                <span v-else class="frame-number">{{ index + 1 }}</span>
              </button>
            </div>
          </div>

          <div class="side-card">
            <div class="side-card-title side-card-title-row">
              <span><i class="pi pi-sliders-h" /> Rang sozlash</span>
              <label class="webcam-switch compact">
                <InputSwitch v-model="autoColorCorrection" @change="onAutoColorToggle" />
                <span>Avto</span>
              </label>
            </div>
            <div class="adjust-row">
              <div class="adjust-meta">
                <span>Yorqinlik</span>
                <strong>{{ formatAdj(brightnessAdj) }}</strong>
              </div>
              <Slider v-model="brightnessAdj" :min="0.6" :max="2.4" :step="0.02" @update:modelValue="onManualAdjust" />
            </div>
            <div class="adjust-row">
              <div class="adjust-meta">
                <span>Kontrast</span>
                <strong>{{ formatAdj(contrastAdj) }}</strong>
              </div>
              <Slider v-model="contrastAdj" :min="0.7" :max="1.8" :step="0.02" @update:modelValue="onManualAdjust" />
            </div>
            <div class="adjust-row">
              <div class="adjust-meta">
                <span>To‘yinganlik</span>
                <strong>{{ formatAdj(saturationAdj) }}</strong>
              </div>
              <Slider v-model="saturationAdj" :min="0.4" :max="1.8" :step="0.02" @update:modelValue="onManualAdjust" />
            </div>
            <Button
              type="button"
              label="Qayta hisoblash"
              icon="pi pi-replay"
              severity="secondary"
              size="small"
              class="adjust-reset"
              @click="recomputeAutoAdjustments"
            />
          </div>
        </aside>
      </div>
    </div>

    <template #footer>
      <div class="webcam-footer">
        <div class="webcam-footer-actions">
          <Button
            v-if="!capturedImage"
            label="Rasm olish"
            icon="pi pi-camera"
            @click="capturePhoto"
            :disabled="!cameraReady || capturingBurst"
            :loading="capturingBurst"
          />
          <Button
            v-if="capturedImage"
            label="Tasdiqlash"
            icon="pi pi-check"
            @click="confirmCrop"
          />
          <Button
            v-if="capturedImage"
            label="Qayta olish"
            icon="pi pi-refresh"
            severity="secondary"
            @click="retakePhoto"
          />
        </div>
        <Button
          label="Bekor qilish"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="dialogVisible = false"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputSwitch from 'primevue/inputswitch'
import Checkbox from 'primevue/checkbox'
import Slider from 'primevue/slider'
import { analyzePhotoQuality, detectLargestFace, loadPicoFaceFinder, resetPicoMemory } from '@/utils/picoFaceDetect'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetWidth: {
    type: Number,
    default: 178
  },
  targetHeight: {
    type: Number,
    default: 189
  }
})

const emit = defineEmits(['update:visible', 'capture'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Camera refs
const videoElement = ref(null)
const canvasElement = ref(null)
const overlayCanvas = ref(null)
const cropImage = ref(null)
const cropWrapper = ref(null)
const cropBox = ref(null)

// State
const cameras = ref([])
const selectedCamera = ref(null)
const stream = ref(null)
const cameraReady = ref(false)
const capturedImage = ref(null)
const croppedImage = ref(null)
const showFrameSelection = ref(false) // Show frame selection UI

// Crop state
const cropPosition = ref({ x: 0, y: 0 })
const cropSize = ref({ width: props.targetWidth, height: props.targetHeight })
const isDragging = ref(false)
const isResizing = ref(false)
const resizeDirection = ref('')
const dragStart = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })

// Settings
const autoDetectFace = ref(true)
const autoCapture = ref(false)
const autoColorCorrection = ref(true)
const countdown = ref(0)
const isFrontCamera = ref(true)
const capturingBurst = ref(false)
const brightnessAdj = ref(1)
const contrastAdj = ref(1)
const saturationAdj = ref(1)

// Face detection
let faceDetectionInterval = null
let countdownIntervalId = null
const modelsLoaded = ref(false)
const modelsFailed = ref(false)
const faceDetected = ref(false)
const facePosition = ref({ x: 0, y: 0, width: 0, height: 0 }) // Nose position for tracking
const faceBox = ref({ x: 0, y: 0, width: 0, height: 0 }) // Full face box for cropping
const faceBoxInCapturedImage = ref(false)
const hasTriggeredCapture = ref(false)
const autoCountdownDisabled = ref(false) // Disable auto-countdown after first capture

// Face stability tracking
const faceStableTime = ref(0)
const faceStableRequired = 1200 // Face must be stable for 1.2 seconds before countdown
let lastFaceDetectionTime = 0

// Best frame capture during countdown
const capturedFrames = ref([])
let frameCaptureDuringCountdown = false
let lastLiveAdjustTime = 0
let detectingFace = false
let lastFrameCaptureTime = 0
const frameCaptureInterval = 120

// Aspect ratio
const aspectRatio = props.targetWidth / props.targetHeight

// Crop overlay follows the detected face (head + shoulders), not a tiny ID-size box
const showCropArea = computed(() => autoDetectFace.value && faceDetected.value && faceBox.value.width > 0)
const cropAreaStyle = computed(() => {
  const video = videoElement.value
  const box = faceBox.value
  if (!video || !video.videoWidth || box.width <= 0) return { display: 'none' }

  const scaleX = video.offsetWidth / video.videoWidth
  const scaleY = video.offsetHeight / video.videoHeight
  const faceH = box.height * scaleY
  const headTop = faceH * 0.55
  const below = faceH * 0.75
  const cropH = faceH + headTop + below
  const cropW = cropH * aspectRatio
  let centerX = (box.x + box.width / 2) * scaleX
  if (isFrontCamera.value) {
    centerX = video.offsetWidth - centerX
  }
  const left = Math.max(0, Math.min(centerX - cropW / 2, video.offsetWidth - cropW))
  const top = Math.max(0, Math.min(box.y * scaleY - headTop, video.offsetHeight - cropH))

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${cropW}px`,
    height: `${cropH}px`,
    transition: 'all 0.12s ease-out',
  }
})

const statusText = computed(() => {
  if (modelsFailed.value) return 'Yuz aniqlash modellari yuklanmadi'
  if (!autoDetectFace.value) return 'Yuz aniqlash o‘chiq'
  if (faceDetected.value) {
    return autoCapture.value ? 'Yuz topildi — avtomatik olinadi' : 'Yuz topildi — rasm olish tugmasini bosing'
  }
  return 'Kameraga qarang — yuz qidirilmoqda'
})

const statusIcon = computed(() => {
  if (modelsFailed.value) return 'pi pi-exclamation-triangle'
  if (faceDetected.value) return 'pi pi-check-circle'
  return 'pi pi-eye'
})

const cropBoxStyle = computed(() => {
  return {
    left: `${cropPosition.value.x}px`,
    top: `${cropPosition.value.y}px`,
    width: `${cropSize.value.width}px`,
    height: `${cropSize.value.height}px`,
    transition: isDragging.value || isResizing.value ? 'none' : 'all 0.1s ease-out'
  }
})

const rankedFrames = computed(() => {
  return [...capturedFrames.value]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((frame, index) => ({
      ...frame,
      isBest: index === 0,
    }))
})

const previewFilter = computed(() =>
  `brightness(${brightnessAdj.value}) contrast(${contrastAdj.value}) saturate(${saturationAdj.value})`,
)

function formatAdj(value) {
  const pct = Math.round((Number(value) - 1) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function sampleCanvasStats(sourceCanvas) {
  const sw = 96
  const sh = 72
  const tmp = document.createElement('canvas')
  tmp.width = sw
  tmp.height = sh
  const tctx = tmp.getContext('2d', { willReadFrequently: true })
  tctx.drawImage(sourceCanvas, 0, 0, sw, sh)
  const data = tctx.getImageData(0, 0, sw, sh).data
  const lumas = []
  let sharpness = 0
  let sharpCount = 0
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      lumas.push(luma)
      if (x < sw - 1 && y < sh - 1) {
        const right = 0.2126 * data[i + 4] + 0.7152 * data[i + 5] + 0.0722 * data[i + 6]
        const down = 0.2126 * data[i + sw * 4] + 0.7152 * data[i + sw * 4 + 1] + 0.0722 * data[i + sw * 4 + 2]
        sharpness += Math.abs(luma - right) + Math.abs(luma - down)
        sharpCount += 1
      }
    }
  }
  lumas.sort((a, b) => a - b)
  const avg = lumas.reduce((sum, n) => sum + n, 0) / lumas.length
  const p10 = lumas[Math.floor(lumas.length * 0.1)]
  const p90 = lumas[Math.floor(lumas.length * 0.9)]
  return {
    avg,
    p10,
    p90,
    sharpness: sharpCount ? sharpness / sharpCount : 0,
  }
}

function computeAutoAdjustmentsFromStats(stats) {
  const target = 176
  let brightness = clamp(target / Math.max(stats.avg, 8), 1.15, 2.2)
  if (stats.avg < 110) brightness = clamp(brightness * 1.12, 1.15, 2.3)
  if (stats.p10 < 40) brightness = clamp(brightness * 1.08, 1.15, 2.35)
  const spread = stats.p90 - stats.p10
  const contrast = clamp(spread < 70 ? 1.22 : spread < 110 ? 1.12 : 1.06, 1.02, 1.32)
  const saturation = stats.avg < 110 ? 1.16 : 1.1
  return { brightness, contrast, saturation }
}

function applyAutoAdjustmentsFromImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const next = computeAutoAdjustmentsFromStats(sampleCanvasStats(canvas))
      setAutoValues(next)
      resolve(next)
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

let applyingAuto = false
function onManualAdjust() {
  if (applyingAuto) return
  autoColorCorrection.value = false
}

function setAutoValues(next) {
  applyingAuto = true
  brightnessAdj.value = Number(next.brightness.toFixed(2))
  contrastAdj.value = Number(next.contrast.toFixed(2))
  saturationAdj.value = Number(next.saturation.toFixed(2))
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      applyingAuto = false
    })
  })
}

function onAutoColorToggle() {
  if (autoColorCorrection.value) {
    recomputeAutoAdjustments()
  }
}

function recomputeAutoAdjustments() {
  autoColorCorrection.value = true
  if (capturedImage.value) {
    applyAutoAdjustmentsFromImage(capturedImage.value)
    return
  }
  sampleLiveAdjustments()
}

function sampleLiveAdjustments() {
  const video = videoElement.value
  if (!video?.videoWidth || capturedImage.value) return
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 72
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, 0, 0, 96, 72)
  const next = computeAutoAdjustmentsFromStats(sampleCanvasStats(canvas))
  setAutoValues(next)
}

// Initialize camera
const initCamera = async () => {
  try {
    // Get available cameras
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    
    // Filter out OBS Virtual Camera and other virtual cameras
    const realCameras = videoDevices.filter(device => {
      const label = device.label.toLowerCase()
      return !label.includes('obs') && 
             !label.includes('virtual') &&
             !label.includes('screen')
    })
    
    cameras.value = realCameras.map((device, index) => ({
      label: device.label || `Camera ${index + 1}`,
      deviceId: device.deviceId
    }))
    
    if (cameras.value.length > 0) {
      selectedCamera.value = cameras.value[0].deviceId
      await startCamera(selectedCamera.value)
    }
  } catch (error) {
    console.error('Error initializing camera:', error)
  }
}

const startCamera = async (deviceId) => {
  try {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
    }
    
    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }
    }
    
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)

    const track = stream.value.getVideoTracks()[0]
    if (track?.applyConstraints) {
      try {
        await track.applyConstraints({
          advanced: [{ exposureMode: 'continuous', whiteBalanceMode: 'continuous' }],
        })
      } catch {
        // Not all cameras expose exposure controls
      }
    }
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream.value
      videoElement.value.onloadedmetadata = async () => {
        cameraReady.value = true
        if (autoColorCorrection.value) {
          sampleLiveAdjustments()
        }
        
        // Check if front camera
        const track = stream.value.getVideoTracks()[0]
        const settings = track.getSettings()
        const label = (track.label || '').toLowerCase()
        isFrontCamera.value =
          settings.facingMode === 'user' ||
          (!settings.facingMode && !label.includes('back') && !label.includes('rear') && !label.includes('environment'))
        
        // Auto-start face detection if toggle is on
        await nextTick()
        if (autoDetectFace.value && !faceDetectionInterval) {
          startFaceDetection()
        }
      }
    }
  } catch (error) {
    console.error('Error starting camera:', error)
  }
}

const switchCamera = () => {
  if (selectedCamera.value) {
    startCamera(selectedCamera.value)
  }
}

const loadFaceDetectionModels = async () => {
  try {
    await loadPicoFaceFinder()
    modelsLoaded.value = true
    modelsFailed.value = false
  } catch (error) {
    console.error('Error loading face detection models:', error)
    modelsLoaded.value = false
    modelsFailed.value = true
  }
}

function applyDetectedFace(box) {
  if (!box?.width) return null
  faceBox.value = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  }
  facePosition.value = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    width: box.width,
    height: box.height,
  }
  faceDetected.value = true
  return { box, landmarks: null, scale: 1 }
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function detectFaceOnDataUrl(dataUrl) {
  try {
    const img = await loadImageFromDataUrl(dataUrl)
    return detectLargestFace(img, {
      useMemory: false,
      brightness: Math.max(brightnessAdj.value, 1.4),
      minScore: 12,
    })
  } catch {
    return null
  }
}

const onAutoDetectToggle = () => {
  if (autoDetectFace.value) {
    hasTriggeredCapture.value = false
    startFaceDetection()
  } else {
    autoCapture.value = false
    stopFaceDetection()
  }
}

const onAutoCaptureToggle = () => {
  if (!autoCapture.value) {
    stopCountdown()
    return
  }
  hasTriggeredCapture.value = false
  autoCountdownDisabled.value = false
  faceStableTime.value = 0
  lastFaceDetectionTime = 0
}

const startFaceDetection = async () => {
  if (!modelsLoaded.value) {
    await loadFaceDetectionModels()
  }
  if (!modelsLoaded.value || faceDetectionInterval) return

  faceDetectionInterval = setInterval(() => {
    detectFace()
  }, 80)
}

const stopFaceDetection = () => {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval)
    faceDetectionInterval = null
  }
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
  countdown.value = 0
  faceDetected.value = false
  hasTriggeredCapture.value = false
  faceStableTime.value = 0
  lastFaceDetectionTime = 0
  resetPicoMemory()
}

const detectFace = async () => {
  if (detectingFace || !videoElement.value || !cameraReady.value || capturedImage.value) return
  if (!modelsLoaded.value || !autoDetectFace.value) return

  if (!autoCapture.value && countdown.value > 0) {
    stopCountdown()
  }

  detectingFace = true
  try {
    const video = videoElement.value
    const box = detectLargestFace(video, {
      useMemory: true,
      brightness: Math.max(brightnessAdj.value, 1.45),
      minScore: 15,
    })
    const applied = box ? applyDetectedFace(box) : null
    if (applied) {
      const isLookingAtCamera = applied.box.width > video.videoWidth * 0.08

      if (isLookingAtCamera) {
        const now = Date.now()
        if (lastFaceDetectionTime > 0) {
          faceStableTime.value += now - lastFaceDetectionTime
        }
        lastFaceDetectionTime = now

        if (frameCaptureDuringCountdown && countdown.value > 0) {
          if (now - lastFrameCaptureTime >= frameCaptureInterval) {
            captureFrameForSelection()
            lastFrameCaptureTime = now
          }
        }

        if (autoCapture.value &&
            !hasTriggeredCapture.value &&
            countdown.value === 0 &&
            !autoCountdownDisabled.value &&
            faceStableTime.value >= faceStableRequired) {
          startCountdown()
        }
      } else {
        faceStableTime.value = 0
        lastFaceDetectionTime = 0
        if (countdown.value > 0 && !hasTriggeredCapture.value) {
          stopCountdown()
        }
      }
    } else {
      faceDetected.value = false
      facePosition.value = { x: 0, y: 0, width: 0, height: 0 }
      faceBox.value = { x: 0, y: 0, width: 0, height: 0 }
      faceStableTime.value = 0
      lastFaceDetectionTime = 0
      if (countdown.value > 0 && !hasTriggeredCapture.value) {
        stopCountdown()
      }
    }

    const now = Date.now()
    if (autoColorCorrection.value && now - lastLiveAdjustTime > 900) {
      lastLiveAdjustTime = now
      sampleLiveAdjustments()
    }
  } catch (error) {
    console.debug('Face detection error:', error)
  } finally {
    detectingFace = false
  }
}

const startCountdown = () => {
  if (hasTriggeredCapture.value || countdown.value > 0) return
  
  hasTriggeredCapture.value = true
  countdown.value = 3
  capturedFrames.value = [] // Reset frames
  frameCaptureDuringCountdown = true // Start capturing frames
  lastFrameCaptureTime = 0 // Reset throttle timer
  
  // Total 3 seconds: show 3, 2, 1 for 1s each
  countdownIntervalId = setInterval(() => {
    countdown.value--
    
    if (countdown.value === 0) {
      clearInterval(countdownIntervalId)
      countdownIntervalId = null
      frameCaptureDuringCountdown = false
      
      // Pick best frame and use it
      capturePhotoWithBestFrame()
    }
  }, 1000) // 1000ms per count = 3 seconds total
}

const stopCountdown = () => {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
  countdown.value = 0
  hasTriggeredCapture.value = false
  faceStableTime.value = 0 // Reset stability timer when countdown stops
  lastFaceDetectionTime = 0
  frameCaptureDuringCountdown = false
  capturedFrames.value = []
}

// Capture frame during countdown for selection
const captureFrameForSelection = () => {
  if (!videoElement.value) return
  try {
    capturedFrames.value.push(grabVideoFrame())
  } catch (error) {
    console.debug('Error capturing frame:', error)
  }
}

const capturePhotoWithBestFrame = () => {
  if (capturedFrames.value.length === 0) {
    capturePhotoWithFace()
    return
  }

  const withFace = capturedFrames.value.filter((frame) => frame.faceBox?.width > 0 && (frame.score || 0) > 0.12)
  const pool = withFace.length ? withFace : capturedFrames.value
  const sorted = [...pool].sort((a, b) => (b.score || 0) - (a.score || 0))
  capturedFrames.value = sorted.slice(0, 12)
  selectFrame(capturedFrames.value[0])
}

// User selects a frame from the captured frames
const selectFrame = async (frame) => {
  capturedImage.value = frame.image
  faceBox.value = frame.faceBox || { x: 0, y: 0, width: 0, height: 0 }
  facePosition.value = frame.facePosition || { x: 0, y: 0, width: 0, height: 0 }
  faceBoxInCapturedImage.value = Boolean(frame.faceBox?.width)
  autoCountdownDisabled.value = true
  hasTriggeredCapture.value = false
  countdown.value = 0
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }

  if (autoColorCorrection.value) {
    await applyAutoAdjustmentsFromImage(frame.image)
  }

  await nextTick()
  await initManualCropWithFace()
}

// Simplified: Check if face is frontal (both eyes visible, reasonable size)
const checkIfLookingAtCamera = (landmarks, box) => {
  try {
    if (!landmarks || typeof landmarks.getLeftEye !== 'function') return true
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    if (!leftEye?.length || !rightEye?.length) return true

    const leftEyeX = leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length
    const rightEyeX = rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length
    const eyeDistance = Math.abs(rightEyeX - leftEyeX)
    return eyeDistance / Math.max(box.width, 1) > 0.25
  } catch (error) {
    console.debug('Error checking gaze:', error)
    return true
  }
}

function grabVideoFrame() {
  const video = videoElement.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (isFrontCamera.value) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0)
  const quality = analyzePhotoQuality(canvas)
  const box = quality.box
  return {
    image: canvas.toDataURL('image/jpeg', 0.92),
    score: quality.score,
    faceBox: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : { x: 0, y: 0, width: 0, height: 0 },
    facePosition: box
      ? { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height }
      : { x: 0, y: 0, width: 0, height: 0 },
  }
}

const capturePhoto = async () => {
  if (!videoElement.value || capturingBurst.value) return
  capturingBurst.value = true
  capturedFrames.value = []
  try {
    for (let i = 0; i < 14; i++) {
      capturedFrames.value.push(grabVideoFrame())
      await new Promise((resolve) => setTimeout(resolve, 55))
    }
    capturePhotoWithBestFrame()
  } finally {
    capturingBurst.value = false
  }
}

const capturePhotoWithFace = () => {
  if (!videoElement.value) return
  const frame = grabVideoFrame()
  capturedFrames.value = [frame]
  selectFrame(frame)
}

const initManualCropWithFace = async () => {
  if (!cropImage.value) return
  await nextTick()
  const img = cropImage.value
  if (!img?.offsetWidth) {
    requestAnimationFrame(() => {
      initManualCropWithFace()
    })
    return
  }

  let box = faceBoxInCapturedImage.value && faceBox.value.width > 0 ? { ...faceBox.value } : null
  if (!box && capturedImage.value && modelsLoaded.value) {
    box = await detectFaceOnDataUrl(capturedImage.value)
    if (box) {
      faceBox.value = box
      faceBoxInCapturedImage.value = true
      faceDetected.value = true
    }
  }

  if (!box || box.width <= 0) {
    initManualCrop()
    return
  }

  placeCropFromNaturalBox(box, img)
}

function placeCropFromNaturalBox(box, img) {
  const faceHeight = box.height
  const headTopMargin = faceHeight * 0.55
  const shouldersMargin = faceHeight * 0.75
  let requiredHeight = faceHeight + headTopMargin + shouldersMargin
  let requiredWidth = requiredHeight * aspectRatio
  if (requiredWidth > img.naturalWidth) {
    requiredWidth = img.naturalWidth
    requiredHeight = requiredWidth / aspectRatio
  }
  if (requiredHeight > img.naturalHeight) {
    requiredHeight = img.naturalHeight
    requiredWidth = requiredHeight * aspectRatio
  }

  const displayScaleX = img.offsetWidth / img.naturalWidth
  const displayScaleY = img.offsetHeight / img.naturalHeight
  const displayCropWidth = requiredWidth * displayScaleX
  const displayCropHeight = requiredHeight * displayScaleY
  const centerX = (box.x + box.width / 2) * displayScaleX
  let cropX = centerX - displayCropWidth / 2
  let cropY = (box.y - headTopMargin) * displayScaleY
  cropX = Math.max(0, Math.min(cropX, img.offsetWidth - displayCropWidth))
  cropY = Math.max(0, Math.min(cropY, img.offsetHeight - displayCropHeight))

  cropSize.value = {
    width: displayCropWidth,
    height: displayCropHeight,
  }
  cropPosition.value = {
    x: cropX,
    y: cropY,
  }
}

const initManualCrop = () => {
  if (!cropImage.value || !cropWrapper.value) return
  
  nextTick(() => {
    const img = cropImage.value
    
    // Calculate initial crop box size (about 40% of image)
    const initialWidth = Math.min(img.offsetWidth * 0.4, 300)
    const initialHeight = initialWidth / aspectRatio
    
    cropSize.value = {
      width: initialWidth,
      height: initialHeight
    }
    
    // Center the crop box
    cropPosition.value = {
      x: (img.offsetWidth - initialWidth) / 2,
      y: (img.offsetHeight - initialHeight) / 2
    }
  })
}

const startDrag = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - cropPosition.value.x,
    y: e.clientY - cropPosition.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value || !cropImage.value) return
  
  const img = cropImage.value
  
  let newX = e.clientX - dragStart.value.x
  let newY = e.clientY - dragStart.value.y
  
  // Constrain to image bounds
  newX = Math.max(0, Math.min(newX, img.offsetWidth - cropSize.value.width))
  newY = Math.max(0, Math.min(newY, img.offsetHeight - cropSize.value.height))
  
  cropPosition.value = { x: newX, y: newY }
}

const startResize = (direction, e) => {
  isResizing.value = true
  resizeDirection.value = direction
  
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: cropSize.value.width,
    height: cropSize.value.height,
    posX: cropPosition.value.x,
    posY: cropPosition.value.y
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const onResize = (e) => {
  if (!isResizing.value || !cropImage.value) return
  
  const img = cropImage.value
  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y
  
  let newWidth = resizeStart.value.width
  let newHeight = resizeStart.value.height
  let newX = resizeStart.value.posX
  let newY = resizeStart.value.posY
  
  const dir = resizeDirection.value
  
  // Calculate new dimensions based on resize direction
  if (dir.includes('e')) {
    newWidth = resizeStart.value.width + deltaX
  } else if (dir.includes('w')) {
    newWidth = resizeStart.value.width - deltaX
    newX = resizeStart.value.posX + deltaX
  }
  
  // Maintain aspect ratio
  newHeight = newWidth / aspectRatio
  
  // Adjust position for north/south directions
  if (dir.includes('n')) {
    const heightDiff = newHeight - resizeStart.value.height
    newY = resizeStart.value.posY - heightDiff
  }
  
  // Minimum size constraints (at least 50px wide)
  const minWidth = 50
  const minHeight = minWidth / aspectRatio
  
  if (newWidth < minWidth) {
    newWidth = minWidth
    newHeight = minHeight
    if (dir.includes('w')) newX = resizeStart.value.posX + resizeStart.value.width - minWidth
    if (dir.includes('n')) newY = resizeStart.value.posY + resizeStart.value.height - minHeight
  }
  
  // Maximum size constraints (image bounds)
  const maxWidth = img.offsetWidth
  const maxHeight = img.offsetHeight
  
  if (newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = maxWidth / aspectRatio
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = maxHeight * aspectRatio
  }
  
  // Position constraints
  newX = Math.max(0, Math.min(newX, img.offsetWidth - newWidth))
  newY = Math.max(0, Math.min(newY, img.offsetHeight - newHeight))
  
  cropSize.value = { width: newWidth, height: newHeight }
  cropPosition.value = { x: newX, y: newY }
}

const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const confirmCrop = () => {
  if (!cropImage.value) return
  
  const img = cropImage.value
  const canvas = document.createElement('canvas')
  canvas.width = props.targetWidth
  canvas.height = props.targetHeight
  
  const ctx = canvas.getContext('2d')
  
  const scaleX = img.naturalWidth / img.offsetWidth
  const scaleY = img.naturalHeight / img.offsetHeight

  ctx.filter = previewFilter.value
  ctx.drawImage(
    img,
    cropPosition.value.x * scaleX,
    cropPosition.value.y * scaleY,
    cropSize.value.width * scaleX,
    cropSize.value.height * scaleY,
    0,
    0,
    props.targetWidth,
    props.targetHeight
  )
  ctx.filter = 'none'

  croppedImage.value = canvas.toDataURL('image/jpeg', 0.92)
  emit('capture', croppedImage.value)
  dialogVisible.value = false
}

const retakePhoto = () => {
  capturedImage.value = null
  croppedImage.value = null
  isDragging.value = false
  showFrameSelection.value = false
  capturingBurst.value = false
  brightnessAdj.value = 1
  contrastAdj.value = 1
  saturationAdj.value = 1
  autoColorCorrection.value = true
  
  hasTriggeredCapture.value = false
  autoCountdownDisabled.value = false
  countdown.value = 0
  faceStableTime.value = 0
  lastFaceDetectionTime = 0
  capturedFrames.value = []
  frameCaptureDuringCountdown = false
  faceBoxInCapturedImage.value = false
  faceBox.value = { x: 0, y: 0, width: 0, height: 0 }
  resetPicoMemory()

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }

  if (autoDetectFace.value) {
    startFaceDetection()
  }
}

const cleanup = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  
  stopFaceDetection()
  stopDrag()
  if (isResizing.value) stopResize()
  
  cameraReady.value = false
  capturedImage.value = null
  croppedImage.value = null
  showFrameSelection.value = false
  capturingBurst.value = false
  countdown.value = 0
  isDragging.value = false
  isResizing.value = false
  brightnessAdj.value = 1
  contrastAdj.value = 1
  saturationAdj.value = 1
  autoColorCorrection.value = true
  capturedFrames.value = []
  faceBoxInCapturedImage.value = false
  faceBox.value = { x: 0, y: 0, width: 0, height: 0 }
  
  autoCountdownDisabled.value = false
  hasTriggeredCapture.value = false
}

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await loadFaceDetectionModels()
    await nextTick()
    await initCamera()
    
    // Auto-start face detection if toggle is on
    if (autoDetectFace.value) {
      await nextTick()
      startFaceDetection()
    }
  } else {
    cleanup()
  }
})

onMounted(() => {
  loadFaceDetectionModels()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.webcam-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.webcam-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-primary-color, #2563eb) 14%, transparent);
  color: var(--p-primary-color, #2563eb);
  font-size: 1.1rem;
}

.webcam-header-title {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.webcam-header-sub {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.webcam-shell {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.webcam-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
}

.webcam-camera-select {
  flex: 1 1 16rem;
  min-width: 12rem;
}

.webcam-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.webcam-switch.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.webcam-live-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.webcam-live-main {
  min-width: 0;
}

.webcam-status.error {
  background: rgba(185, 28, 28, 0.88);
  color: #fff;
}

.webcam-display {
  position: relative;
  background: #0f172a;
  border-radius: 12px;
  overflow: hidden;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.webcam-display video {
  width: 100%;
  height: auto;
  display: block;
}

.webcam-display video.mirror {
  transform: scaleX(-1);
}

.webcam-hidden-canvas {
  display: none;
}

.face-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.countdown-overlay,
.burst-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
  color: #fff;
}

.countdown-number {
  font-size: 6.5rem;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
}

.countdown-hint,
.burst-overlay span {
  font-size: 0.95rem;
  font-weight: 600;
}

.webcam-status {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
}

.webcam-status.ready {
  background: rgba(22, 163, 74, 0.88);
  color: #fff;
}

.crop-area {
  position: absolute;
  border: 2px solid #60a5fa;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  z-index: 5;
}

.crop-area.face-detected {
  border-color: #22c55e;
}

.crop-border {
  position: absolute;
  inset: -3px;
  border: 2px dashed rgba(255, 255, 255, 0.55);
}

.face-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #16a34a;
  background: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.webcam-review {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.review-label,
.side-card-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-color-secondary);
  margin-bottom: 0.55rem;
}

.side-card-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.side-card-title-row {
  justify-content: space-between;
}

.side-card-hint {
  margin: 0 0 0.7rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  line-height: 1.4;
}

.review-side {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.side-card {
  padding: 0.9rem;
  border: 1px solid var(--p-content-border-color, #e5e7eb);
  border-radius: 12px;
  background: var(--p-content-background, #fff);
}

.frames-carousel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 0.5rem;
  max-height: 220px;
  overflow: auto;
}

.frame-thumb {
  position: relative;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  background: #0f172a;
}

.frame-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.frame-thumb:hover,
.frame-thumb.active {
  border-color: var(--p-primary-color, #2563eb);
}

.frame-thumb.best {
  border-color: #16a34a;
}

.best-badge,
.frame-number {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  background: rgba(15, 23, 42, 0.75);
}

.best-badge {
  background: #16a34a;
}

.adjust-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.adjust-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.adjust-reset {
  width: 100%;
}

.crop-container-custom {
  max-height: 520px;
  overflow: auto;
  background: #0f172a;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.85rem;
}

.crop-wrapper {
  position: relative;
  display: inline-block;
  user-select: none;
}

.crop-wrapper img {
  display: block;
  max-width: 100%;
  height: auto;
}

.crop-box {
  position: absolute;
  cursor: move;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.crop-box-border {
  position: absolute;
  inset: 0;
  border: 2px solid #60a5fa;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #2563eb;
  border: 2px solid white;
  border-radius: 50%;
  z-index: 20;
}

.resize-handle.nw { top: -7px; left: -7px; cursor: nw-resize; }
.resize-handle.ne { top: -7px; right: -7px; cursor: ne-resize; }
.resize-handle.sw { bottom: -7px; left: -7px; cursor: sw-resize; }
.resize-handle.se { bottom: -7px; right: -7px; cursor: se-resize; }

.crop-info {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.webcam-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.webcam-footer-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 840px) {
  .webcam-review,
  .webcam-live-grid {
    grid-template-columns: 1fr;
  }
}
</style>
