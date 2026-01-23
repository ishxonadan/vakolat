<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :closable="true"
    :style="{ width: '90vw', maxWidth: '900px' }"
    @hide="cleanup"
  >
    <template #header>
      <div class="flex align-items-center gap-2">
        <i class="pi pi-camera text-2xl"></i>
        <span class="font-bold text-xl">Rasm olish</span>
      </div>
    </template>

    <div class="webcam-container">
      <!-- Camera Selection -->
      <div class="camera-controls mb-3">
        <div class="flex gap-3 align-items-center">
          <Dropdown
            v-model="selectedCamera"
            :options="cameras"
            optionLabel="label"
            optionValue="deviceId"
            placeholder="Kamerani tanlang"
            class="flex-1"
            @change="switchCamera"
          />
        </div>
      </div>

      <!-- Webcam Display -->
      <div class="webcam-display">
        <video
          ref="videoElement"
          autoplay
          playsinline
          :class="{ 'mirror': isFrontCamera }"
        ></video>
        <canvas ref="canvasElement" style="display: none;"></canvas>
        
        <!-- Face Detection Overlay -->
        <canvas
          v-if="autoDetectFace"
          ref="overlayCanvas"
          class="face-overlay"
        ></canvas>

        <!-- Countdown Overlay -->
        <div v-if="countdown > 0" class="countdown-overlay">
          <div class="countdown-number">{{ countdown }}</div>
        </div>

        <!-- Crop Area Overlay (follows face) - ALWAYS show when auto-detect is on -->
        <div
          v-if="showCropArea"
          class="crop-area"
          :style="cropAreaStyle"
          :class="{ 'face-detected': faceDetected }"
        >
          <div class="crop-border"></div>
          <div v-if="faceDetected" class="face-indicator">
            <i class="pi pi-check-circle"></i>
          </div>
        </div>
      </div>

      <!-- Toggle Controls -->
      <div class="toggle-controls mt-3">
        <div class="flex flex-wrap gap-3">
          <div class="toggle-item">
            <label class="flex align-items-center gap-2 cursor-pointer">
              <InputSwitch v-model="autoDetectFace" @change="onAutoDetectToggle" />
              <span class="font-semibold">
                <i class="pi pi-eye"></i>
                Avtomatik yuz aniqlash
              </span>
            </label>
            <small class="text-gray-600 block ml-8 mt-1">
              Yuz topilganda 3 soniyada rasm olinadi
            </small>
          </div>
        </div>
      </div>

      <!-- Captured Image with Crop -->
      <div v-if="capturedImage" class="crop-section mt-4">
        <h4 class="mb-2">
          <i class="pi pi-crop mr-2"></i>
          Rasmni moslashtiring (harakatlantiring va o'lchamini o'zgartiring)
        </h4>
        <div class="crop-container-custom">
          <div class="crop-wrapper" ref="cropWrapper">
            <img ref="cropImage" :src="capturedImage" alt="Captured" @load="initManualCropWithFace" />
            <div
              class="crop-box"
              ref="cropBox"
              :style="cropBoxStyle"
              @mousedown.stop="startDrag"
            >
              <div class="crop-box-border"></div>
              <!-- Resize handles -->
              <div class="resize-handle nw" @mousedown.stop="startResize('nw')"></div>
              <div class="resize-handle ne" @mousedown.stop="startResize('ne')"></div>
              <div class="resize-handle sw" @mousedown.stop="startResize('sw')"></div>
              <div class="resize-handle se" @mousedown.stop="startResize('se')"></div>
            </div>
          </div>
        </div>
        <div class="crop-info mt-2 text-center">
          <small class="text-gray-600">
            <i class="pi pi-info-circle"></i>
            Yakuniy o'lcham: {{ targetWidth }}x{{ targetHeight }}px
          </small>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-between align-items-center w-full">
        <div class="flex gap-2">
          <Button
            v-if="!capturedImage"
            label="Rasm olish"
            icon="pi pi-camera"
            @click="capturePhoto"
            severity="success"
            :disabled="!cameraReady"
          />
          <Button
            v-if="capturedImage"
            label="Tasdiqlash"
            icon="pi pi-check"
            @click="confirmCrop"
            severity="success"
          />
          <Button
            v-if="capturedImage"
            label="Qayta olish"
            icon="pi pi-refresh"
            @click="retakePhoto"
            severity="warning"
            outlined
          />
        </div>
        <Button
          label="Bekor qilish"
          icon="pi pi-times"
          @click="dialogVisible = false"
          severity="secondary"
          outlined
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
import * as faceapi from 'face-api.js'

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

// Crop state
const cropPosition = ref({ x: 0, y: 0 })
const cropSize = ref({ width: props.targetWidth, height: props.targetHeight })
const isDragging = ref(false)
const isResizing = ref(false)
const resizeDirection = ref('')
const dragStart = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })

// Settings
const autoDetectFace = ref(true) // Start with toggle ON by default
const countdown = ref(0)
const isFrontCamera = ref(true)

// Face detection
let faceDetectionInterval = null
let countdownIntervalId = null
const modelsLoaded = ref(false)
const faceDetected = ref(false)
const facePosition = ref({ x: 0, y: 0, width: 0, height: 0 }) // Nose position for tracking
const faceBox = ref({ x: 0, y: 0, width: 0, height: 0 }) // Full face box for cropping
const hasTriggeredCapture = ref(false)
const autoCountdownDisabled = ref(false) // Disable auto-countdown after first capture

// Face stability tracking
const faceStableTime = ref(0)
const faceStableRequired = 1200 // Face must be stable for 1.2 seconds before countdown
let lastFaceDetectionTime = 0

// Best frame capture during countdown
const capturedFrames = ref([])
let frameCaptureDuringCountdown = false

// Aspect ratio
const aspectRatio = props.targetWidth / props.targetHeight

// Crop area display - ONLY show when face is detected
const showCropArea = computed(() => autoDetectFace.value && faceDetected.value && facePosition.value.width > 0)
const cropAreaStyle = computed(() => {
  if (!videoElement.value) return {}
  
  const video = videoElement.value
  
  // Only show when face is detected - no default fallback position
  if (facePosition.value.width > 0) {
    // facePosition.x and facePosition.y are NOSE coordinates in VIDEO coordinates
    // We need to scale them to DISPLAY coordinates
    const scaleX = video.offsetWidth / video.videoWidth
    const scaleY = video.offsetHeight / video.videoHeight
    
    // Scale nose position to display size
    const displayNoseX = facePosition.value.x * scaleX
    const displayNoseY = facePosition.value.y * scaleY
    
    // Center the crop box on the nose
    const left = displayNoseX - props.targetWidth / 2
    const top = displayNoseY - props.targetHeight / 2
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${props.targetWidth}px`,
      height: `${props.targetHeight}px`,
      transition: 'all 0.12s ease-out'
    }
  }
  
  // Return empty style if no face (won't show anyway due to v-if)
  return {
    display: 'none'
  }
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
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }
    
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream.value
      videoElement.value.onloadedmetadata = async () => {
        cameraReady.value = true
        
        // Check if front camera
        const track = stream.value.getVideoTracks()[0]
        const settings = track.getSettings()
        isFrontCamera.value = settings.facingMode === 'user'
        
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
    const MODEL_URL = '/models' // We'll need to add models to public folder
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    modelsLoaded.value = true
    console.log('✅ Face detection models loaded')
  } catch (error) {
    console.error('❌ Error loading face detection models:', error)
    console.log('⚠️ Face detection will use fallback mode')
    modelsLoaded.value = true // Continue anyway
  }
}

const onAutoDetectToggle = () => {
  if (autoDetectFace.value) {
    hasTriggeredCapture.value = false
    startFaceDetection()
  } else {
    stopFaceDetection()
  }
}

const startFaceDetection = async () => {
  if (!modelsLoaded.value) {
    await loadFaceDetectionModels()
  }
  
  faceDetectionInterval = setInterval(() => {
    detectFace()
  }, 100)
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
}

const detectFace = async () => {
  if (!videoElement.value || !cameraReady.value) return
  
  // Continue detecting ALWAYS - even after capture (for continuous tracking)
  try {
    const detections = await faceapi.detectSingleFace(
      videoElement.value,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.4
      })
    ).withFaceLandmarks()
    
    if (detections) {
      const box = detections.detection.box
      const landmarks = detections.landmarks
      const nose = landmarks.getNose()
      
      // Get nose center position (bridge of nose - most stable point)
      let noseCenterX = box.x + box.width / 2
      let noseCenterY = box.y + box.height / 2
      
      if (nose && nose.length > 0) {
        // Use the middle point of the nose for stability
        const nosePoint = nose[Math.floor(nose.length / 2.5)]
        noseCenterX = nosePoint.x
        noseCenterY = nosePoint.y
      }
      
      // Update NOSE position for green square tracking
      facePosition.value = {
        x: noseCenterX,
        y: noseCenterY,
        width: box.width,
        height: box.height
      }
      
      // Update FULL FACE BOX for cropping after capture
      faceBox.value = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      }
      
      // Set face as detected
      faceDetected.value = true
      
      // Check if user is actually LOOKING AT CAMERA
      const isLookingAtCamera = checkIfLookingAtCamera(landmarks, box)
      
      if (isLookingAtCamera) {
        // Track face stability - user must be looking at camera for a moment
        const now = Date.now()
        if (lastFaceDetectionTime > 0) {
          faceStableTime.value += now - lastFaceDetectionTime
        }
        lastFaceDetectionTime = now
        
        // Capture frames during countdown to pick best one
        if (frameCaptureDuringCountdown && countdown.value > 0) {
          captureFrameForSelection(box, landmarks)
        }
        
        // Start countdown ONLY if:
        // 1. Not already triggered
        // 2. No countdown running
        // 3. Auto-countdown not disabled (after first capture)
        // 4. Face has been stable/looking at camera for required time
        if (!hasTriggeredCapture.value && 
            countdown.value === 0 && 
            !autoCountdownDisabled.value &&
            faceStableTime.value >= faceStableRequired) {
          startCountdown()
        }
      } else {
        // Not looking at camera - reset stability timer
        faceStableTime.value = 0
        lastFaceDetectionTime = 0
        
        // Stop countdown if it started but user looked away
        if (countdown.value > 0 && !hasTriggeredCapture.value) {
          stopCountdown()
        }
      }
      
      // Draw face detection overlay (just nose point, no box)
      if (overlayCanvas.value) {
        const displaySize = {
          width: videoElement.value.offsetWidth,
          height: videoElement.value.offsetHeight
        }
        
        const canvas = overlayCanvas.value
        canvas.width = displaySize.width
        canvas.height = displaySize.height
        
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // DON'T draw face box - we have the crop-area div for that
        // Only draw nose point for debugging if needed
        // ctx.fillStyle = '#ef4444'
        // ctx.beginPath()
        // ctx.arc(noseCenterX, noseCenterY, 4, 0, 2 * Math.PI)
        // ctx.fill()
      }
    } else {
      faceDetected.value = false
      facePosition.value = { x: 0, y: 0, width: 0, height: 0 }
      faceStableTime.value = 0 // Reset stability timer
      lastFaceDetectionTime = 0
      
      // Clear overlay
      if (overlayCanvas.value) {
        const ctx = overlayCanvas.value.getContext('2d')
        ctx.clearRect(0, 0, overlayCanvas.value.width, overlayCanvas.value.height)
      }
      
      // Stop countdown if face is lost (but only if not yet captured)
      if (countdown.value > 0 && !hasTriggeredCapture.value) {
        stopCountdown()
      }
    }
  } catch (error) {
    // Silently handle detection errors
    console.debug('Face detection error:', error)
  }
}

const startCountdown = () => {
  if (hasTriggeredCapture.value || countdown.value > 0) return
  
  hasTriggeredCapture.value = true
  countdown.value = 3
  capturedFrames.value = [] // Reset frames
  frameCaptureDuringCountdown = true // Start capturing frames
  
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
const captureFrameForSelection = (box, landmarks) => {
  if (!videoElement.value || !canvasElement.value) return
  
  try {
    const video = videoElement.value
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    
    // Mirror if front camera
    if (isFrontCamera.value) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    
    ctx.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    
    // Calculate frontal score (higher = more frontal)
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    
    let frontalScore = 0
    if (leftEye && rightEye && leftEye.length > 0 && rightEye.length > 0) {
      const leftEyeX = leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length
      const rightEyeX = rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length
      const eyeDistance = Math.abs(rightEyeX - leftEyeX)
      frontalScore = eyeDistance / box.width // Higher = more frontal
    }
    
    capturedFrames.value.push({
      image: imageData,
      score: frontalScore,
      faceBox: { ...faceBox.value },
      facePosition: { ...facePosition.value }  // Store nose position too!
    })
  } catch (error) {
    console.debug('Error capturing frame:', error)
  }
}

// Use best frame from captured frames
const capturePhotoWithBestFrame = () => {
  if (capturedFrames.value.length === 0) {
    // Fallback: capture current frame
    capturePhotoWithFace()
    return
  }
  
  // Find frame with best frontal score
  const bestFrame = capturedFrames.value.reduce((best, frame) => 
    frame.score > best.score ? frame : best
  )
  
  capturedImage.value = bestFrame.image
  faceBox.value = bestFrame.faceBox
  facePosition.value = bestFrame.facePosition  // Restore nose position from best frame!
  
  // DON'T stop face detection - keep tracking!
  // But DISABLE auto-countdown after first capture
  autoCountdownDisabled.value = true
  hasTriggeredCapture.value = false
  countdown.value = 0
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
  
  // Initialize crop with face-centered position
  if (faceDetected.value && faceBox.value.width > 0) {
    nextTick(() => {
      initManualCropWithFace()
    })
  }
}

// Simplified: Check if face is frontal (both eyes visible, reasonable size)
const checkIfLookingAtCamera = (landmarks, box) => {
  try {
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    
    // Simple check: Both eyes must be visible
    if (!leftEye || !rightEye || leftEye.length === 0 || rightEye.length === 0) {
      return false
    }
    
    // Calculate eye centers
    const leftEyeCenter = {
      x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length
    }
    const rightEyeCenter = {
      x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length
    }
    
    // Calculate eye distance
    const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
    
    // Simple frontal face check: eye distance should be reasonable relative to face width
    // If eyes are too close together = profile view (not looking at camera)
    const faceWidthRatio = eyeDistance / box.width
    
    // Very lenient: just check face is reasonably frontal (not extreme profile)
    const isLooking = faceWidthRatio > 0.25
    
    return isLooking
  } catch (error) {
    console.debug('Error checking gaze:', error)
    return true // If error, assume looking (don't block)
  }
}

const capturePhoto = () => {
  if (!videoElement.value || !canvasElement.value) return
  
  const video = videoElement.value
  const canvas = canvasElement.value
  
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')
  
  // Mirror if front camera
  if (isFrontCamera.value) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  
  ctx.drawImage(video, 0, 0)
  
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9)
  
  // DON'T stop face detection - keep tracking!
  // Disable auto-countdown after manual capture
  autoCountdownDisabled.value = true
  
  // Initialize crop with nose-centered position if face detected
  if (faceDetected.value && facePosition.value.width > 0) {
    nextTick(() => {
      initManualCropWithFace()
    })
  }
}

const capturePhotoWithFace = () => {
  if (!videoElement.value || !canvasElement.value) return
  
  const video = videoElement.value
  const canvas = canvasElement.value
  
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')
  
  // Mirror if front camera
  if (isFrontCamera.value) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  
  ctx.drawImage(video, 0, 0)
  
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9)
  
  // DON'T stop face detection - keep tracking!
  // But DISABLE auto-countdown after first capture
  autoCountdownDisabled.value = true
  hasTriggeredCapture.value = false
  countdown.value = 0
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
  
  // Initialize crop with nose-centered position
  if (faceDetected.value && facePosition.value.width > 0) {
    nextTick(() => {
      initManualCropWithFace()
    })
  }
}

const initManualCropWithFace = () => {
  if (!cropImage.value || !cropWrapper.value) return
  
  nextTick(() => {
    const img = cropImage.value
    
    // Scale face position to captured image dimensions
    const scaleX = img.naturalWidth / videoElement.value.videoWidth
    const scaleY = img.naturalHeight / videoElement.value.videoHeight
    
    // Get nose position and face box in image coordinates
    let noseX = facePosition.value.x * scaleX
    let noseY = facePosition.value.y * scaleY
    const faceBoxX = faceBox.value.x * scaleX
    const faceBoxY = faceBox.value.y * scaleY
    const faceWidth = faceBox.value.width * scaleX
    const faceHeight = faceBox.value.height * scaleY
    
    // Mirror nose position if front camera
    if (isFrontCamera.value) {
      noseX = img.naturalWidth - noseX
    }
    
    // SMART CROP: Calculate to include FULL HEAD + SHOULDERS automatically
    // Face box doesn't include top of head (hair) or shoulders
    const headTopMargin = faceHeight * 0.5  // 50% above face for full head/hair
    const shouldersMargin = faceHeight * 0.7  // 70% below face for shoulders
    
    // Calculate required height to include everything
    const requiredHeight = faceHeight + headTopMargin + shouldersMargin
    
    // Calculate width based on aspect ratio (178:189)
    const requiredWidth = requiredHeight * aspectRatio
    
    // Scale to display size
    const displayScaleX = img.offsetWidth / img.naturalWidth
    const displayScaleY = img.offsetHeight / img.naturalHeight
    
    const displayCropWidth = requiredWidth * displayScaleX
    const displayCropHeight = requiredHeight * displayScaleY
    
    cropSize.value = {
      width: displayCropWidth,
      height: displayCropHeight
    }
    
    // Position the crop box
    const displayNoseX = noseX * displayScaleX
    const displayFaceBoxY = faceBoxY * displayScaleY
    const displayHeadTopMargin = headTopMargin * displayScaleY
    
    // CENTER horizontally on nose
    let cropX = displayNoseX - displayCropWidth / 2
    
    // Position vertically to include full head (start from top of head)
    let cropY = displayFaceBoxY - displayHeadTopMargin
    
    // Constrain to image bounds
    cropX = Math.max(0, Math.min(cropX, img.offsetWidth - displayCropWidth))
    cropY = Math.max(0, Math.min(cropY, img.offsetHeight - displayCropHeight))
    
    cropPosition.value = {
      x: cropX,
      y: cropY
    }
  })
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

const startResize = (direction) => {
  isResizing.value = true
  resizeDirection.value = direction
  
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: cropSize.value.width,
    height: cropSize.value.height,
    posX: cropPosition.value.x,
    posY: cropPosition.value.y
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
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
  
  // Calculate scale between displayed image and actual image
  const scaleX = img.naturalWidth / img.offsetWidth
  const scaleY = img.naturalHeight / img.offsetHeight
  
  // Draw the cropped area scaled to target dimensions
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
  
  croppedImage.value = canvas.toDataURL('image/jpeg', 0.9)
  emit('capture', croppedImage.value)
  dialogVisible.value = false
}

const retakePhoto = () => {
  capturedImage.value = null
  croppedImage.value = null
  isDragging.value = false
  
  // Fully reset all countdown and capture states
  hasTriggeredCapture.value = false
  autoCountdownDisabled.value = false
  countdown.value = 0
  faceStableTime.value = 0
  lastFaceDetectionTime = 0
  capturedFrames.value = []
  frameCaptureDuringCountdown = false
  
  // Clear any running countdown interval
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
  
  // Keep face detection running - will auto-count when looking at camera again
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
  countdown.value = 0
  isDragging.value = false
  isResizing.value = false
  
  // Reset auto-countdown for next time modal opens
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
.webcam-container {
  display: flex;
  flex-direction: column;
}

.camera-controls {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
}

.webcam-display {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  min-height: 480px;
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

.face-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.countdown-number {
  font-size: 8rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.crop-area {
  position: absolute;
  border: 3px solid #3b82f6;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 5;
  transition: all 0.1s ease-out;
}

.crop-area.face-detected {
  border-color: #10b981;
}

.crop-border {
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border: 3px dashed #60a5fa;
  animation: dash 20s linear infinite;
}

.crop-area.face-detected .crop-border {
  border-color: #34d399;
}

.face-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #10b981;
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

@keyframes dash {
  to {
    stroke-dashoffset: -100%;
  }
}

.toggle-controls {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
}

.toggle-item {
  flex: 1;
  min-width: 250px;
}

.crop-section {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
}

.crop-container-custom {
  max-height: 600px;
  overflow: auto;
  background: #000;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 3px solid #3b82f6;
  pointer-events: none;
}

.crop-box::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: rgba(59, 130, 246, 0.5);
  border-radius: 50%;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 20;
}

.resize-handle:hover {
  background: #2563eb;
  transform: scale(1.2);
}

.resize-handle.nw {
  top: -8px;
  left: -8px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -8px;
  right: -8px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -8px;
  left: -8px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -8px;
  right: -8px;
  cursor: se-resize;
}

.crop-info {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 6px;
}

.preview-section {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.preview-container {
  display: inline-block;
  border: 3px solid #3b82f6;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cropped-preview {
  display: block;
}
</style>
