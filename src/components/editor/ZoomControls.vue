<template>
  <div class="zoom-group">
    <!-- 桌面端按钮控制 -->
    <div class="zoom-buttons">
      <button class="btn btn-sm zoom-btn" @click="$emit('zoom-out')" title="缩小">-</button>
      <span class="zoom-text">{{ zoomPercentage }}</span>
      <button class="btn btn-sm zoom-btn" @click="$emit('zoom-in')" title="放大">+</button>
      <button class="btn btn-sm zoom-btn" @click="$emit('reset-zoom')" title="重置缩放">1:1</button>
    </div>

    <!-- 移动端滑块控制 -->
    <div class="zoom-slider">
      <label class="zoom-label">缩放: {{ zoomPercentage }}</label>
      <input
        type="range"
        min="0.1"
        max="3"
        step="0.1"
        :value="zoomLevel"
        @input="handleZoomChange"
        class="zoom-range"
      />
      <button class="btn btn-sm reset-btn" @click="$emit('reset-zoom')" title="重置">
        <span>↺</span>
      </button>
    </div>
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

const emit = defineEmits(['zoom-in', 'zoom-out', 'reset-zoom', 'set-zoom'])

const zoomPercentage = computed(() => Math.round(props.zoomLevel * 100) + '%')

const handleZoomChange = (e) => {
  const newZoom = parseFloat(e.target.value)
  emit('set-zoom', newZoom)
}
</script>

<style scoped>
.zoom-group {
  background: #e9ecef;
  padding: 5px;
  border-radius: 6px;
}

/* 桌面端样式 */
.zoom-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.zoom-slider {
  display: none;
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

/* 移动端样式 */
@media (max-width: 768px) {
  .zoom-group {
    padding: 6px;
    background: transparent;
  }

  .zoom-buttons {
    display: none;
  }

  .zoom-slider {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .zoom-label {
    font-size: 11px;
    color: #555;
    white-space: nowrap;
    min-width: 60px;
  }

  .zoom-range {
    flex: 1;
    height: 20px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  .zoom-range::-webkit-slider-track {
    background: #ddd;
    height: 4px;
    border-radius: 2px;
  }

  .zoom-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    margin-top: -6px;
  }

  .zoom-range::-moz-range-track {
    background: #ddd;
    height: 4px;
    border-radius: 2px;
  }

  .zoom-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .reset-btn {
    padding: 4px 6px;
    min-width: auto;
    font-size: 14px;
  }
}
</style>
