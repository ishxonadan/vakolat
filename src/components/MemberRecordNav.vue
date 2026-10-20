<template>
  <div class="record-nav">
    <Button
      type="button"
      icon="pi pi-chevron-left"
      outlined
      severity="secondary"
      class="record-nav-btn"
      :disabled="!canPrev || busy"
      aria-label="Oldingi"
      @click="$emit('prev')"
    />
    <span class="record-nav-order">{{ order }}</span>
    <Button
      type="button"
      icon="pi pi-chevron-right"
      outlined
      severity="secondary"
      class="record-nav-btn"
      :disabled="!canNext || busy"
      aria-label="Keyingi"
      @click="$emit('next')"
    />
  </div>
</template>

<script setup>
import Button from 'primevue/button'

defineProps({
  order: {
    type: Number,
    required: true,
  },
  canPrev: {
    type: Boolean,
    default: false,
  },
  canNext: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['prev', 'next'])
</script>

<style scoped>
.record-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.record-nav-btn {
  width: 2.6rem;
  height: 2.6rem;
}

.record-nav-order {
  min-width: 2.6rem;
  height: 2.6rem;
  padding: 0 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--p-content-border-color, var(--surface-border));
  border-radius: var(--p-button-border-radius, 6px);
  background: var(--p-content-background, var(--surface-card));
  font-weight: 600;
  font-size: 0.95rem;
}
</style>
