<template>
  <div class="member-id-card-frame">
  <div class="member-id-card">
    <div class="id-card-header">
      <div class="id-card-logo">
        <img src="/card-building-logo.png" alt="" />
      </div>
      <div class="id-card-title">
        Alişer Navoiy nomidagi<br />
        Özbekiston Milliy kutubxonasi
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
        <div class="id-label">Şarifi:</div>
        <div class="id-value">{{ names.sharifi || '—' }}</div>
        <div class="id-label">Toifasi:</div>
        <div class="id-value">{{ positionDisplay }}</div>
        <div class="id-label">Kafedrasi:</div>
        <div class="id-value">{{ kafedraDisplay }}</div>
      </div>
      <div class="id-photo">
        <img v-if="normalizedPhoto" :src="normalizedPhoto" alt="Foydalanuvchi rasmi" />
      </div>
    </div>

    <div class="id-card-footer">
      <img v-if="barcodeSrc" class="id-bars" :src="barcodeSrc" alt="" />
      <div class="id-expiry">{{ expiryDisplay }}</div>
      <div class="id-barcode-text">{{ barcodeValue }}</div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { generateBarcode } from '@/utils/barcode'
import { formatExpiry, splitUserName, toNewUzbekLatin } from '@/utils/printMemberCard'

const props = defineProps({
  userNo: { type: String, default: '' },
  cardNo: { type: String, default: '' },
  userName: { type: String, default: '' },
  position: { type: String, default: '' },
  kafedra: { type: [String, Number], default: '' },
  photoSrc: { type: String, default: '' },
  expiryYyyymmdd: { type: String, default: '' },
})

const names = computed(() => splitUserName(props.userName))

const positionDisplay = computed(() => toNewUzbekLatin(props.position).trim() || '—')

const kafedraDisplay = computed(() => {
  const value = props.kafedra
  if (value === null || value === undefined || value === '') return '—'
  return toNewUzbekLatin(value).trim() || '—'
})

const barcodeValue = computed(() => String(props.cardNo || props.userNo || '').trim())

const expiryDisplay = computed(() => formatExpiry(props.expiryYyyymmdd) || '—')

const normalizedPhoto = computed(() => {
  const raw = String(props.photoSrc || '').trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  return `data:image/jpeg;base64,${raw}`
})

const barcodeSrc = computed(() => {
  const id = barcodeValue.value
  if (!id) return ''
  return generateBarcode(id, {
    displayValue: false,
    height: 64,
    width: 1.7,
    margin: 0,
    transparent: true,
  })
})
</script>

<style scoped>
.member-id-card-frame {
  width: min(86mm, 100%);
  aspect-ratio: 86 / 54;
  flex-shrink: 0;
}

.member-id-card {
  width: 100%;
  height: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
  container-type: inline-size;
}

.id-card-header {
  display: flex;
  align-items: flex-end;
  gap: 2.2cqw;
  padding: 2.2cqw 3.4cqw 0.7cqw;
  border-bottom: 0.28cqw solid #6b6b73;
}

.id-card-logo {
  width: 36cqw;
  flex-shrink: 0;
  line-height: 0;
}

.id-card-logo img {
  display: block;
  width: 100%;
  height: auto;
}

.id-card-title {
  flex: 1;
  min-width: 0;
  font-size: 3.35cqw;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.015em;
  padding-bottom: 0.35cqw;
}

.id-card-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 23.5cqw;
  column-gap: 1.4cqw;
  padding: 1.6cqw 3.4cqw 1.15cqw;
}

.id-rows {
  display: grid;
  grid-template-columns: 31cqw minmax(0, 1fr);
  grid-template-rows: repeat(6, minmax(0, 1fr));
  column-gap: 1.8cqw;
  height: 100%;
  font-size: 3.3cqw;
  line-height: 1.05;
}

.id-label,
.id-value {
  align-self: center;
  min-width: 0;
}

.id-label {
  font-weight: 400;
  white-space: nowrap;
}

.id-value {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.id-photo {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: #fff;
  align-self: stretch;
}

.id-photo img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: center 22%;
  display: block;
  filter: grayscale(1);
}

.id-card-footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 2.4cqw;
  align-items: end;
  border-top: 0.32cqw solid #111;
  padding: 1.05cqw 3.4cqw 1.35cqw;
}

.id-bars {
  grid-column: 1;
  grid-row: 1;
  width: 52cqw;
  height: 8.2cqw;
  object-fit: fill;
  display: block;
}

.id-expiry {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  align-self: end;
  font-size: 4.55cqw;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
  padding-bottom: 0.1cqw;
}

.id-barcode-text {
  grid-column: 1;
  grid-row: 2;
  width: 52cqw;
  text-align: center;
  font-size: 2.45cqw;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-top: 0.35cqw;
}
</style>
