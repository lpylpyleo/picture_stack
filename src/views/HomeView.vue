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
const {
  stagePos,
  baseScale,
  zoomLevel,
  fitToView,
  handleWheel,
  zoomIn,
  zoomOut,
  resetZoom,
  setZoom,
} = useZoom(containerSize, images)
const { handleUpload } = useImageUpload(images, fitToView)
const {
  exportFormat,
  exportQuality,
  handleExport: doExport,
  handlePreview: doPreview,
} = useExport()

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
    <Transition name="bounce">
      <MobileLayerToggle
        v-show="!showMobileLayers"
        :image-count="images.length"
        @toggle="toggleMobileLayers"
      />
    </Transition>

    <div class="sidebar" :class="{ 'mobile-show': showMobileLayers }">
      <h2>图片叠加编辑器</h2>

      <div class="toolbar">
        <!-- 移动端按钮行容器 -->
        <div class="mobile-buttons-row">
          <div class="control-group upload-group">
            <UploadButton @upload="handleUpload" />
          </div>

          <ExportControls
            v-model:export-format="exportFormat"
            v-model:export-quality="exportQuality"
            :has-images="images.length > 0"
            @export="handleExport"
            @preview="handlePreview"
          />
        </div>

        <ZoomControls
          :zoom-level="zoomLevel"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @reset-zoom="resetZoom"
          @set-zoom="setZoom"
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
    <div class="mobile-overlay" v-if="showMobileLayers" @click="toggleMobileLayers"></div>

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

/* 桌面端隐藏移动端按钮行 */
.mobile-buttons-row {
  display: contents;
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
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }

  /* 移动端按钮行样式 */
  .mobile-buttons-row {
    display: flex;
    gap: 6px;
    width: 100%;
  }

  /* 上传按钮容器 */
  .mobile-buttons-row .upload-group {
    flex: 1;
    margin: 0;
  }

  /* 导出控件容器 - 占2/3宽度 */
  .mobile-buttons-row > :last-child {
    flex: 2;
  }

  /* 隐藏导出配置部分 */
  .toolbar :deep(.export-config) {
    display: none !important;
  }

  /* 导出按钮组样式 */
  .toolbar :deep(.export-group) {
    display: flex;
    gap: 6px;
    margin-bottom: 0;
  }

  /* 所有按钮样式统一 */
  .toolbar :deep(.btn) {
    padding: 8px;
    min-width: auto;
  }

  .toolbar :deep(.btn .text) {
    display: none;
  }

  .toolbar :deep(.btn .icon) {
    display: inline;
    margin: 0;
    font-size: 16px;
  }
}

/* 弹性动画效果 */
.bounce-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.bounce-leave-active {
  animation: bounce-out 0.3s ease-in-out;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}
</style>
