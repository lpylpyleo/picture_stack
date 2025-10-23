<template>
  <div>
    <div class="control-group export-config" v-if="hasImages">
      <div class="config-item">
        <label>格式:</label>
        <select
          :value="exportFormat"
          @change="$emit('update:exportFormat', $event.target.value)"
          class="form-select"
        >
          <option value="image/png">PNG (无损)</option>
          <option value="image/jpeg">JPEG (小文件)</option>
        </select>
      </div>
      <div class="config-item" v-if="exportFormat === 'image/jpeg'">
        <label title="质量越低文件越小，但画质会下降">
          质量: {{ qualityPercentage }}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          :value="exportQuality"
          @input="$emit('update:exportQuality', Number($event.target.value))"
          class="quality-range"
        />
      </div>
    </div>

    <div class="actions export-group">
      <button
        class="btn btn-success"
        @click="$emit('export')"
        :disabled="!hasImages"
        title="导出合成图片"
      >
        <span class="icon">💾</span>
        <span class="text">导出</span>
      </button>
      <button
        class="btn btn-info"
        @click="$emit('preview')"
        :disabled="!hasImages"
        title="在新页面预览"
      >
        <span class="icon">👁️</span>
        <span class="text">预览</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  exportFormat: {
    type: String,
    default: 'image/jpeg'
  },
  exportQuality: {
    type: Number,
    default: 0.92
  },
  hasImages: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:exportFormat', 'update:exportQuality', 'export', 'preview'])

const qualityPercentage = computed(() => Math.round(props.exportQuality * 100))
</script>

<style scoped>
.export-config {
  background: #e9ecef;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 13px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item label {
  color: #555;
  white-space: nowrap;
  margin-right: 8px;
}

.form-select {
  flex: 1;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #ced4da;
  font-size: 13px;
  min-width: 0;
}

.quality-range {
  flex: 1;
  min-width: 0;
}

.export-group {
  display: flex;
  gap: 8px;
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
  flex: 1;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  margin-right: 6px;
  display: none;
}

@media (max-width: 768px) {
  .export-config {
    flex-direction: column;
    padding: 6px;
    gap: 4px;
    background: transparent;
    margin-bottom: 0;
  }

  .config-item {
    font-size: 12px;
  }

  .config-item label {
    font-size: 11px;
  }

  .form-select {
    font-size: 12px;
    padding: 2px 4px;
  }

  .quality-range {
    height: 20px;
  }

  .btn .text {
    display: none;
  }

  .btn .icon {
    display: inline;
    margin-right: 0;
    font-size: 16px;
  }

  .btn {
    padding: 8px;
  }
}
</style>
