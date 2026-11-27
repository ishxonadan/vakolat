<template>
  <div class="member-id-card">
    <div class="id-card-header">
      <div class="id-card-logo">
        <LibraryLogo />
      </div>
      <div class="id-card-title">
        Alisher Navoiy nomidagi<br />
        O‘zbekiston Milliy kutubxonasi
      </div>
    </div>

    <div class="id-card-body">
      <div class="id-rows">
        <div class="id-label">ID-karta raqami:</div>
        <div class="id-value">{{ userNo || '—' }}</div>
        <div class="id-label">Familyasi:</div>
        <div class="id-value">{{ names.familiya || '—' }}</div>
        <div class="id-label">Ismi:</div>
        <div class="id-value">{{ names.ismi || '—' }}</div>
        <div class="id-label">Sharifi:</div>
        <div class="id-value">{{ names.sharifi || '—' }}</div>
        <div class="id-label">Toifasi:</div>
        <div class="id-value">{{ position || '—' }}</div>
        <div class="id-label">Kafedrasi:</div>
        <div class="id-value">{{ kafedraDisplay }}</div>
      </div>
      <div class="id-photo">
        <img v-if="normalizedPhoto" :src="normalizedPhoto" alt="Foydalanuvchi rasmi" />
        <div v-else class="id-photo-empty">Rasm yo'q</div>
      </div>
    </div>

    <div class="id-card-footer">
      <div class="id-barcode">
        <img v-if="barcodeSrc" :src="barcodeSrc" :alt="userNo" />
      </div>
      <div class="id-expiry">{{ expiryDisplay }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LibraryLogo from './LibraryLogo.vue'
import { generateBarcode } from '@/utils/barcode'
import { formatExpiry, splitUserName } from '@/utils/printMemberCard'

const props = defineProps({
  userNo: { type: String, default: '' },
  userName: { type: String, default: '' },
  position: { type: String, default: '' },
  kafedra: { type: [String, Number], default: '' },
  photoSrc: { type: String, default: '' },
  expiryYyyymmdd: { type: String, default: '' },
})

const names = computed(() => splitUserName(props.userName))

const kafedraDisplay = computed(() => {
  const value = props.kafedra
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
})

const expiryDisplay = computed(() => formatExpiry(props.expiryYyyymmdd) || '—')

const normalizedPhoto = computed(() => {
  const raw = String(props.photoSrc || '').trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  return `data:image/jpeg;base64,${raw}`
})

const barcodeSrc = computed(() => {
  const id = String(props.userNo || '').trim()
  if (!id) return ''
  return generateBarcode(id)
})
</script>

<style scoped>
.member-id-card {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 86 / 54;
  border: 1px solid #222;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #e8edf2 0%, #f4f6f8 45%, #eef1f4 100%);
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.id-card-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.7rem 0.4rem;
  border-bottom: 1px solid #111;
}

.id-card-logo {
  flex-shrink: 0;
  line-height: 0;
}

.id-card-logo :deep(svg) {
  width: 72px;
  height: 23px;
}

.id-card-title {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.25;
}

.id-card-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 5.4rem;
  gap: 0.55rem;
  padding: 0.45rem 0.7rem;
  border-bottom: 1px solid #111;
  min-height: 0;
}

.id-rows {
  display: grid;
  grid-template-columns: 7.2rem 1fr;
  row-gap: 0.18rem;
  column-gap: 0.35rem;
  align-content: start;
  font-size: 0.7rem;
  line-height: 1.2;
}

.id-label {
  font-weight: 400;
}

.id-value {
  font-weight: 700;
  word-break: break-word;
}

.id-photo {
  width: 5.4rem;
  height: 5.9rem;
  border: 1px solid #333;
  background: #ddd;
  overflow: hidden;
  justify-self: end;
  align-self: start;
}

.id-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(1);
}

.id-photo-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #666;
  text-align: center;
  padding: 0.25rem;
}

.id-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem 0.45rem;
}

.id-barcode {
  flex: 1;
  min-width: 0;
}

.id-barcode img {
  max-width: 12rem;
  height: 2.6rem;
  object-fit: contain;
  object-position: left bottom;
  display: block;
}

.id-expiry {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding-bottom: 0.1rem;
}
</style>
