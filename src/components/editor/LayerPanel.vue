<template>
  <div>
    <div class="layer-list-header">
      <h3>图层 ({{ images.length }})</h3>
      <p class="tip desktop-only">* 导出范围以"基准底图"为准</p>
    </div>
    <div class="layer-list">
      <div v-if="images.length === 0" class="empty-tip">请上传图片</div>
      <div
        v-for="(img, rIndex) in reversedImages"
        :key="img.id"
        class="layer-item"
        :class="{ selected: img.id === selectedId }"
        @click="$emit('select', img.id)"
      >
        <div class="layer-info">
          <img
            :src="img.thumbnail"
            class="layer-thumbnail"
            :alt="`图层 ${images.length - rIndex}`"
          />
          <span class="layer-name">
            <span v-if="images.length - 1 - rIndex === 0" class="badge">底图</span>
            <span v-else>#{{ images.length - rIndex }}</span>
          </span>
        </div>
        <div class="layer-controls">
          <button
            @click.stop="handleMoveLayer(rIndex, 'up')"
            :disabled="rIndex === 0"
            title="上移"
          >
            ↑
          </button>
          <button
            @click.stop="handleMoveLayer(rIndex, 'down')"
            :disabled="rIndex === images.length - 1"
            title="下移"
          >
            ↓
          </button>
          <button
            @click.stop="handleRemoveLayer(rIndex)"
            class="btn-danger"
            title="删除"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    required: true
  },
  selectedId: {
    type: [String, null],
    default: null
  }
})

const emit = defineEmits(['select', 'move-layer', 'remove-layer'])

// 反转图层顺序用于显示
const reversedImages = computed(() => props.images.slice().reverse())

const handleMoveLayer = (rIndex, direction) => {
  const actualIndex = props.images.length - 1 - rIndex
  emit('move-layer', actualIndex, direction)
}

const handleRemoveLayer = (rIndex) => {
  const actualIndex = props.images.length - 1 - rIndex
  emit('remove-layer', actualIndex)
}
</script>

<style scoped>
.layer-list-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.layer-list-header h3 {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.tip {
  font-size: 12px;
  color: #999;
}

.layer-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.empty-tip {
  color: #999;
  text-align: center;
  padding: 20px 0;
  font-size: 14px;
}

.layer-item {
  background: white;
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border: 1px solid #e9ecef;
}

.layer-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layer-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #e9ecef;
}

.layer-item:hover {
  border-color: #ced4da;
}

.layer-item.selected {
  border-color: #0099ff;
  background-color: #f0f9ff;
}

.layer-name {
  font-size: 14px;
  display: flex;
  align-items: center;
}

.badge {
  background: #6c757d;
  color: white;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 10px;
  margin-left: 8px;
}

.layer-controls button {
  margin-left: 4px;
  padding: 4px 8px;
  cursor: pointer;
  border: 1px solid #ced4da;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

.layer-controls button:hover:not(:disabled) {
  background: #e9ecef;
}

.layer-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #dc3545 !important;
  color: white !important;
  padding: 2px 6px !important;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }

  .layer-list-header {
    margin-bottom: 5px;
  }

  .layer-list {
    padding-top: 5px;
  }

  .layer-item {
    padding: 6px 8px;
  }

  .layer-thumbnail {
    width: 36px;
    height: 36px;
  }
}
</style>
