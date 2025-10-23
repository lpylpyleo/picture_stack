<template>
  <div class="zoom-group">
    <button class="btn btn-sm zoom-btn" @click="$emit('zoom-out')" title="缩小">-</button>
    <span class="zoom-text">{{ zoomPercentage }}</span>
    <button class="btn btn-sm zoom-btn" @click="$emit('zoom-in')" title="放大">+</button>
    <button class="btn btn-sm zoom-btn" @click="$emit('reset-zoom')" title="重置缩放">1:1</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  zoomLevel: {
    type: Number,
    required: true
  }
})

defineEmits(['zoom-in', 'zoom-out', 'reset-zoom'])

const zoomPercentage = computed(() => Math.round(props.zoomLevel * 100) + '%')
</script>

<style scoped>
.zoom-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #e9ecef;
  padding: 5px;
  border-radius: 6px;
}

.zoom-text {
  font-size: 14px;
  min-width: 45px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.btn {
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #ced4da;
}

.zoom-btn {
  min-width: 32px;
}

@media (max-width: 768px) {
  .zoom-group {
    padding: 2px;
  }

  .zoom-text {
    font-size: 12px;
    min-width: 40px;
  }
}
</style>
