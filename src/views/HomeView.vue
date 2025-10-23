<script setup>
import { ref } from 'vue'
import UploadButton from '@/components/editor/UploadButton.vue'
import ZoomControls from '@/components/editor/ZoomControls.vue'
import ExportControls from '@/components/editor/ExportControls.vue'
import LayerPanel from '@/components/editor/LayerPanel.vue'
import ImageCanvas from '@/components/editor/ImageCanvas.vue'
import MobileLayerToggle from '@/components/editor/MobileLayerToggle.vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { useZoom } from '@/composables/useZoom'
import { useExport } from '@/composables/useExport'

// 状态管理
const images = ref([])
const selectedId = ref(null)
const containerSize = ref({ width: 0, height: 0 })
const showMobileLayers = ref(false)

// Canvas ref
const canvasRef = ref(null)

// 使用组合式函数
const { stagePos, baseScale, zoomLevel, fitToView, handleWheel, zoomIn, zoomOut, resetZoom } = useZoom(containerSize, images)
const { handleUpload } = useImageUpload(images, fitToView)
const { exportFormat, exportQuality, handleExport: doExport, handlePreview: doPreview } = useExport()

// 处理图片变换
const onTransformEnd = (e) => {
  const node = e.target
  const item = images.value.find((i) => i.id === node.id())
  if (item) {
    item.x = node.x()
    item.y = node.y()
    item.rotation = node.rotation()
    item.scaleX = node.scaleX()
    item.scaleY = node.scaleY()
  }
}

const onDragEnd = (e) => {
  const node = e.target
  const item = images.value.find((i) => i.id === node.id())
  if (item) {
    item.x = node.x()
    item.y = node.y()
  }
}

// 图层操作
const moveLayer = (index, direction) => {
  const newImages = [...images.value]
  if (direction === 'up' && index < newImages.length - 1) {
    ;[newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
  } else if (direction === 'down' && index > 0) {
    ;[newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]]
  }
  images.value = newImages
}

const removeLayer = (index) => {
  if (images.value[index].id === selectedId.value) {
    selectedId.value = null
  }
  images.value.splice(index, 1)
}

// 导出功能
const handleExport = async () => {
  const stage = canvasRef.value?.getStage()
  if (!stage) return
  await doExport(stage, images.value, selectedId, zoomLevel, baseScale, stagePos, fitToView)
}

const handlePreview = async () => {
  const stage = canvasRef.value?.getStage()
  if (!stage) return
  await doPreview(stage, images.value, selectedId, zoomLevel, baseScale, stagePos, fitToView)
}

// 处理滚轮事件
const onWheel = (e) => {
  const stage = canvasRef.value?.getStage()
  if (!stage) return
  handleWheel(e, stage)
}

// 切换移动端图层面板
const toggleMobileLayers = () => {
  showMobileLayers.value = !showMobileLayers.value
}
</script>

<template>
  <main class="editor-container">
    <!-- 移动端浮动按钮 -->
    <MobileLayerToggle
      :image-count="images.length"
      @toggle="toggleMobileLayers"
    />

    <div class="sidebar" :class="{ 'mobile-show': showMobileLayers }">
      <h2>图片叠加编辑器</h2>

      <div class="toolbar">
        <div class="control-group upload-group">
          <UploadButton @upload="handleUpload" />
        </div>

        <ZoomControls
          :zoom-level="zoomLevel"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @reset-zoom="resetZoom"
        />

        <ExportControls
          v-model:export-format="exportFormat"
          v-model:export-quality="exportQuality"
          :has-images="images.length > 0"
          @export="handleExport"
          @preview="handlePreview"
        />
      </div>

      <LayerPanel
        :images="images"
        :selected-id="selectedId"
        @select="selectedId = $event"
        @move-layer="moveLayer"
        @remove-layer="removeLayer"
      />
    </div>

    <!-- 移动端遮罩层 -->
    <div
      class="mobile-overlay"
      v-if="showMobileLayers"
      @click="toggleMobileLayers"
    ></div>

    <ImageCanvas
      ref="canvasRef"
      :images="images"
      v-model:selected-id="selectedId"
      v-model:container-size="containerSize"
      v-model:stage-pos="stagePos"
      :base-scale="baseScale"
      :zoom-level="zoomLevel"
      @transform-end="onTransformEnd"
      @drag-end="onDragEnd"
      @wheel="onWheel"
    />
  </main>
</template>

<style scoped>
.editor-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.sidebar {
  width: 300px;
  background: #f8f9fa;
  padding: 15px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e9ecef;
  z-index: 2;
}

.sidebar h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  color: #333;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.control-group {
  margin-bottom: 0;
}

.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 98;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
  }

  .editor-container {
    flex-direction: column;
  }

  .sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    max-height: 50vh;
    background: rgba(248, 249, 250, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid #e9ecef;
    padding: 12px;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    z-index: 99;
    transform: translateY(100%);
    transition: transform 0.3s ease;
  }

  .sidebar.mobile-show {
    transform: translateY(0);
  }

  .sidebar h2 {
    display: none;
  }

  /* 移动端工具栏布局优化 */
  .toolbar {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto auto;
    gap: 8px;
    margin-bottom: 8px;
  }

  .upload-group {
    grid-column: 1;
    grid-row: 1;
  }

  .control-group,
  .actions {
    flex: 1;
    margin: 0;
  }
}
</style>
