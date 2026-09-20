import pico from '../vendor/pico.js'

let classifyRegion = null
let updateMemory = null
const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : null

export async function loadPicoFaceFinder() {
  if (classifyRegion) return true
  const response = await fetch('/models/facefinder')
  if (!response.ok) {
    throw new Error(`Face finder failed to load (${response.status})`)
  }
  classifyRegion = pico.unpack_cascade(new Int8Array(await response.arrayBuffer()))
  updateMemory = pico.instantiate_detection_memory(5)
  return true
}

export function resetPicoMemory() {
  if (pico?.instantiate_detection_memory) {
    updateMemory = pico.instantiate_detection_memory(5)
  }
}

function sourceSize(source) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight }
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

function rgbaToGray(rgba, width, height) {
  const gray = new Uint8Array(width * height)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = (r * width + c) * 4
      gray[r * width + c] = (2 * rgba[i] + 7 * rgba[i + 1] + rgba[i + 2]) / 10
    }
  }
  return gray
}

function stretchGray(gray) {
  let min = 255
  let max = 0
  let sum = 0
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i]
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  const avg = sum / gray.length
  if (avg >= 95 && max - min > 80) return gray
  const span = Math.max(1, max - min)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = ((gray[i] - min) * 255) / span
  }
  return gray
}

export function detectLargestFace(source, options = {}) {
  const {
    useMemory = true,
    brightness = 1.4,
    minScore = 18,
  } = options
  if (!classifyRegion || !scratch) return null

  const { width: srcW, height: srcH } = sourceSize(source)
  if (!srcW || !srcH) return null

  const targetW = 480
  const scale = Math.min(1, targetW / srcW)
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  scratch.width = width
  scratch.height = height
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  ctx.filter = `brightness(${brightness}) contrast(1.18)`
  ctx.drawImage(source, 0, 0, width, height)
  ctx.filter = 'none'

  const rgba = ctx.getImageData(0, 0, width, height).data
  const gray = stretchGray(rgbaToGray(rgba, width, height))
  const image = {
    pixels: gray,
    nrows: height,
    ncols: width,
    ldim: width,
  }
  const params = {
    shiftfactor: 0.1,
    minsize: Math.max(24, Math.round(Math.min(width, height) * 0.1)),
    maxsize: Math.min(width, height),
    scalefactor: 1.1,
  }

  let dets = pico.run_cascade(image, classifyRegion, params)
  if (useMemory && updateMemory) {
    dets = updateMemory(dets)
  }
  dets = pico.cluster_detections(dets, 0.2)

  let best = null
  for (const det of dets) {
    if (det[3] > minScore && (!best || det[3] > best[3])) {
      best = det
    }
  }
  if (!best) return null

  const inv = 1 / scale
  const size = best[2] * inv
  return {
    x: best[1] * inv - size / 2,
    y: best[0] * inv - size / 2,
    width: size,
    height: size,
    score: best[3],
  }
}

const facePatch = typeof document !== 'undefined' ? document.createElement('canvas') : null
const FACE_W = 96
const FACE_H = 112

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function lumaStd(gray, width, x0, y0, x1, y1) {
  let sum = 0
  let count = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += gray[y * width + x]
      count += 1
    }
  }
  if (!count) return 0
  const mean = sum / count
  let varSum = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = gray[y * width + x] - mean
      varSum += d * d
    }
  }
  return Math.sqrt(varSum / count)
}

function extractFaceGray(canvas, box) {
  if (!facePatch) return null
  const x = Math.max(0, Math.floor(box.x))
  const y = Math.max(0, Math.floor(box.y))
  const width = Math.max(8, Math.min(canvas.width - x, Math.floor(box.width)))
  const height = Math.max(8, Math.min(canvas.height - y, Math.floor(box.height)))
  if (width < 8 || height < 8) return null

  facePatch.width = FACE_W
  facePatch.height = FACE_H
  const ctx = facePatch.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(canvas, x, y, width, height, 0, 0, FACE_W, FACE_H)
  const rgba = ctx.getImageData(0, 0, FACE_W, FACE_H).data
  return rgbaToGray(rgba, FACE_W, FACE_H)
}

function faceSharpness(gray) {
  let acc = 0
  let count = 0
  for (let y = 1; y < FACE_H - 1; y++) {
    for (let x = 1; x < FACE_W - 1; x++) {
      const i = y * FACE_W + x
      const gx = gray[i + 1] - gray[i - 1]
      const gy = gray[i + FACE_W] - gray[i - FACE_W]
      acc += gx * gx + gy * gy
      count += 1
    }
  }
  return clamp01((acc / Math.max(count, 1)) / 850)
}

function faceSymmetry(gray) {
  let err = 0
  let count = 0
  const mid = Math.floor(FACE_W / 2)
  for (let y = 0; y < FACE_H; y++) {
    for (let x = 0; x < mid; x++) {
      err += Math.abs(gray[y * FACE_W + x] - gray[y * FACE_W + (FACE_W - 1 - x)])
      count += 1
    }
  }
  return clamp01(1 - err / Math.max(count, 1) / 42)
}

function eyeOpenness(gray) {
  const left = lumaStd(gray, FACE_W, 8, 22, 40, 52)
  const right = lumaStd(gray, FACE_W, 56, 22, 88, 52)
  return clamp01(Math.min(left, right) / 28)
}

function faceBrightness(gray) {
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const avg = sum / gray.length
  return clamp01(1 - Math.abs(avg - 145) / 120)
}

export function analyzePhotoQuality(canvas) {
  const box = detectLargestFace(canvas, {
    useMemory: false,
    brightness: 1.35,
    minScore: 10,
  })
  if (!box) {
    return {
      score: 0,
      box: null,
      sharpness: 0,
      eyes: 0,
      frontal: 0,
    }
  }

  const gray = extractFaceGray(canvas, box)
  if (!gray) {
    return { score: 0.05, box, sharpness: 0, eyes: 0, frontal: 0 }
  }

  const sharpness = faceSharpness(gray)
  const eyes = eyeOpenness(gray)
  const frontal = faceSymmetry(gray)
  const brightness = faceBrightness(gray)
  const pico = clamp01((box.score || 0) / 70)
  const size = clamp01(box.height / (canvas.height * 0.32))
  const cx = (box.x + box.width / 2) / canvas.width
  const cy = (box.y + box.height / 2) / canvas.height
  const center = clamp01(1 - Math.abs(cx - 0.5) * 2.2) * clamp01(1 - Math.abs(cy - 0.42) * 1.8)

  const score =
    sharpness * 0.36 +
    eyes * 0.24 +
    frontal * 0.16 +
    pico * 0.1 +
    size * 0.08 +
    brightness * 0.04 +
    center * 0.02

  return { score, box, sharpness, eyes, frontal }
}
