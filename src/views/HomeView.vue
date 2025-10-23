<script setup>
import { ref, watch, nextTick, computed } from 'vue'

const canvasAreaRef = ref(null)
const stageSize = ref({
  width: 800,
  height: 600,
})
const zoomLevel = ref(1)

// 导出选项
const exportFormat = ref('image/jpeg')
const exportQuality = ref(0.92)

// 存储图片图层信息的数组。最下面的图片在索引 0
const images = ref([])
const selectedId = ref(null)
const stageRef = ref(null)
const transformerRef = ref(null)

// 移动端图层面板显示状态
const showMobileLayers = ref(false)

// 监听选中变化，更新 Transformer
watch(selectedId, (newId) => {
  if (newId && transformerRef.value && stageRef.value) {
    const stage = stageRef.value.getStage()
    const selectedNode = stage.findOne('#' + newId)
    if (selectedNode) {
      transformerRef.value.getNode().nodes([selectedNode])
    } else {
      transformerRef.value.getNode().nodes([])
    }
  } else if (transformerRef.value) {
    transformerRef.value.getNode().nodes([])
  }
})

// 监听图片数组变化，确保底层图片决定画布大小
watch(
  () => images.value[0],
  (newBase) => {
    if (newBase) {
      updateStageSizeToBaseImage()
    }
  },
  { deep: true },
)

// 处理文件上传
const handleUpload = (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  files.forEach((file) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        // 生成缩略图
        const thumbnail = generateThumbnail(img, 60) // 60px 的正方形缩略图

        images.value.push({
          id: 'img_' + Date.now() + Math.random().toString(36).substr(2, 9),
          image: img,
          thumbnail: thumbnail,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        })
        // 如果是第一张，更新舞台
        if (images.value.length === 1) {
          updateStageSizeToBaseImage()
        }
        // 每次上传图片后都重新计算缩放，确保最大的图片能完全显示
        nextTick(() => {
          fitToScreen()
        })
      }
    }
    reader.readAsDataURL(file)
  })
  // 清空 input 以便重复上传同一文件
  e.target.value = ''
}

// 更新舞台大小以适应最底层图片
const updateStageSizeToBaseImage = () => {
  if (images.value.length > 0) {
    const baseImg = images.value[0]
    // 计算基准图片占据的实际物理宽度和高度（考虑缩放，暂不考虑旋转带来的复杂边界变化，以简化"以底层为准"的定义）
    stageSize.value = {
      width: baseImg.width * baseImg.scaleX,
      height: baseImg.height * baseImg.scaleY,
    }
  }
}

// 自动缩放以适应屏幕
const fitToScreen = () => {
  if (!canvasAreaRef.value || images.value.length === 0) return

  const containerWidth = canvasAreaRef.value.clientWidth
  const containerHeight = canvasAreaRef.value.clientHeight

  // 如果容器尺寸为0（可能未挂载好），稍后重试
  if (containerWidth === 0 || containerHeight === 0) {
    setTimeout(fitToScreen, 100)
    return
  }

  // 找出所有图片中的最大尺寸
  let maxWidth = 0
  let maxHeight = 0

  images.value.forEach(img => {
    // 计算每个图片的实际占用尺寸（考虑位置和缩放）
    const rightEdge = img.x + (img.width * img.scaleX)
    const bottomEdge = img.y + (img.height * img.scaleY)

    // 如果图片有负的x或y坐标，也要考虑进去
    const leftEdge = Math.min(0, img.x)
    const topEdge = Math.min(0, img.y)

    const totalWidth = rightEdge - leftEdge
    const totalHeight = bottomEdge - topEdge

    maxWidth = Math.max(maxWidth, totalWidth)
    maxHeight = Math.max(maxHeight, totalHeight)
  })

  const padding = 40 // 留一点边距

  if (maxWidth === 0 || maxHeight === 0) return

  const scaleX = (containerWidth - padding) / maxWidth
  const scaleY = (containerHeight - padding) / maxHeight

  // 选择较小的缩放比，确保完全显示
  let newZoom = Math.min(scaleX, scaleY)
  // 限制缩放范围，避免过大或过小. 但如果图片非常小，允许放大一些以便编辑
  newZoom = Math.min(Math.max(newZoom, 0.05), 10)

  zoomLevel.value = newZoom
}

// 选中图片
const onSelect = (id) => {
  selectedId.value = id
}

// 点击舞台空白处取消选中
const onStageMouseDown = (e) => {
  if (e.target === e.target.getStage()) {
    selectedId.value = null
    return
  }
  const clickedOnTransformer = e.target.getParent().className === 'Transformer'
  if (clickedOnTransformer) {
    return
  }

  const id = e.target.id()
  if (id && id.startsWith('img_')) {
    selectedId.value = id
  } else {
    selectedId.value = null
  }
}

// Transformer 变化结束时同步回数据
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

// 图层排序
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

// 导出
const handleExport = async () => {
  if (!stageRef.value || images.value.length === 0) return

  const stage = stageRef.value.getStage()
  // 暂存当前状态
  const currentSelected = selectedId.value
  const currentZoom = zoomLevel.value

  // 取消选中（隐藏 Transformer），并重置缩放为 1:1 以便精确导出
  selectedId.value = null
  zoomLevel.value = 1

  // 等待 DOM 和 Konva 更新到 1:1 状态
  await nextTick()

  try {
    const baseImg = images.value[0]
    // 在 1:1 舞台状态下，使用 pixelRatio: 1 即可获得原始质量
    const dataURL = stage.toDataURL({
      pixelRatio: 1,
      x: baseImg.x,
      y: baseImg.y,
      width: baseImg.width * baseImg.scaleX,
      height: baseImg.height * baseImg.scaleY,
      mimeType: exportFormat.value,
      quality: exportQuality.value,
    })

    const ext = exportFormat.value === 'image/jpeg' ? 'jpg' : 'png'
    const link = document.createElement('a')
    link.download = `stacked-${Date.now()}.${ext}`
    link.href = dataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e) {
    console.error('Export failed:', e)
    alert('导出失败，请重试')
  } finally {
    // 无论成功失败，都恢复之前的视图状态
    selectedId.value = currentSelected
    zoomLevel.value = currentZoom
  }
}

const rotationSnaps = [0, 90, 180, 270, 360]

const zoomIn = () => {
  zoomLevel.value = Math.min(5, zoomLevel.value + 0.1)
}
const zoomOut = () => {
  zoomLevel.value = Math.max(0.1, zoomLevel.value - 0.1)
}
const resetZoom = () => {
  zoomLevel.value = 1
}

const zoomPercentage = computed(() => Math.round(zoomLevel.value * 100) + '%')

// 生成缩略图
const generateThumbnail = (img, size) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = size
  canvas.height = size

  // 计算如何裁剪和缩放以填充正方形
  const scale = Math.max(size / img.width, size / img.height)
  const scaledWidth = img.width * scale
  const scaledHeight = img.height * scale
  const x = (size - scaledWidth) / 2
  const y = (size - scaledHeight) / 2

  ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
  return canvas.toDataURL()
}

// 切换移动端图层面板
const toggleMobileLayers = () => {
  showMobileLayers.value = !showMobileLayers.value
}
</script>

<template>
  <main class="editor-container">
    <!-- 移动端浮动按钮 -->
    <button class="mobile-layers-toggle" @click="toggleMobileLayers">
      <span class="layer-count" v-if="images.length > 0">{{ images.length }}</span>
      <span class="icon">{{ images.length > 0 ? '📑' : '📂' }}</span>
    </button>

    <div class="sidebar" :class="{ 'mobile-show': showMobileLayers }">
      <h2>图片叠加编辑器</h2>

      <div class="toolbar">
        <div class="control-group upload-group">
          <div class="upload-btn-wrapper">
            <button class="btn btn-primary full-width" title="上传图片">
              <span class="icon">📂</span>
              <span class="text">上传图片</span>
            </button>
            <input type="file" multiple @change="handleUpload" accept="image/*" />
          </div>
        </div>

        <div class="control-group zoom-group">
          <button class="btn btn-sm zoom-btn" @click="zoomOut" title="缩小">-</button>
          <span class="zoom-text">{{ zoomPercentage }}</span>
          <button class="btn btn-sm zoom-btn" @click="zoomIn" title="放大">+</button>
          <button class="btn btn-sm zoom-btn" @click="resetZoom" title="重置缩放">1:1</button>
        </div>

        <div class="control-group export-config" v-if="images.length > 0">
          <div class="config-item">
            <label>格式:</label>
            <select v-model="exportFormat" class="form-select">
              <option value="image/png">PNG (无损)</option>
              <option value="image/jpeg">JPEG (小文件)</option>
            </select>
          </div>
          <div class="config-item" v-if="exportFormat === 'image/jpeg'">
            <label title="质量越低文件越小，但画质会下降">
              质量: {{ Math.round(exportQuality * 100) }}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              v-model.number="exportQuality"
              class="quality-range"
            />
          </div>
        </div>

        <div class="actions export-group">
          <button
            class="btn btn-success full-width"
            @click="handleExport"
            :disabled="images.length === 0"
            title="导出合成图片"
          >
            <span class="icon">💾</span>
            <span class="text">导出</span>
          </button>
        </div>
      </div>

      <div class="layer-list-header">
        <h3>图层 ({{ images.length }})</h3>
        <p class="tip desktop-only">* 导出范围以"基准底图"为准</p>
      </div>
      <div class="layer-list">
        <div v-if="images.length === 0" class="empty-tip">请上传图片</div>
        <div
          v-for="(img, rIndex) in images.slice().reverse()"
          :key="img.id"
          class="layer-item"
          :class="{ selected: img.id === selectedId }"
          @click="onSelect(img.id)"
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
              @click.stop="moveLayer(images.length - 1 - rIndex, 'up')"
              :disabled="rIndex === 0"
              title="上移"
            >
              ↑
            </button>
            <button
              @click.stop="moveLayer(images.length - 1 - rIndex, 'down')"
              :disabled="rIndex === images.length - 1"
              title="下移"
            >
              ↓
            </button>
            <button
              @click.stop="removeLayer(images.length - 1 - rIndex)"
              class="btn-danger"
              title="删除"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端遮罩层 -->
    <div
      class="mobile-overlay"
      v-if="showMobileLayers"
      @click="toggleMobileLayers"
    ></div>

    <div class="canvas-area" ref="canvasAreaRef">
      <div
        class="stage-wrapper"
        :style="{
          width: stageSize.width * zoomLevel + 'px',
          height: stageSize.height * zoomLevel + 'px',
        }"
      >
        <v-stage
          ref="stageRef"
          :config="{
            width: stageSize.width * zoomLevel,
            height: stageSize.height * zoomLevel,
            scale: { x: zoomLevel, y: zoomLevel },
          }"
          @mousedown="onStageMouseDown"
          @touchstart="onStageMouseDown"
        >
          <v-layer>
            <v-image
              v-for="item in images"
              :key="item.id"
              :config="{
                id: item.id,
                image: item.image,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                rotation: item.rotation,
                scaleX: item.scaleX,
                scaleY: item.scaleY,
                draggable: true,
              }"
              @transformend="onTransformEnd"
              @dragend="onDragEnd"
            />

            <v-transformer
              ref="transformerRef"
              :config="{
                rotationSnaps: rotationSnaps,
                keepRatio: true,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                anchorSize: 10,
                anchorCornerRadius: 5,
                borderStroke: '#0099ff',
                anchorStroke: '#0099ff',
                anchorFill: 'white',
                borderDash: [4, 4],
              }"
            />
          </v-layer>
        </v-stage>
      </div>
      <div v-if="images.length === 0" class="placeholder">
        <p>点击"上传图片"开始</p>
      </div>
    </div>
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

.canvas-area {
  flex: 1;
  background: #e9ecef;
  display: flex;
  /* justify-content: center;  Removed to fix clipping when scrolling */
  /* align-items: center;      Removed to fix clipping when scrolling */
  position: relative;
  overflow: auto;
  touch-action: none; /* 禁止移动端默认手势 */
  background-image:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

.stage-wrapper {
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
  background: white;
  transition: all 0.3s ease;
  margin: auto; /* Center when smaller than container, allow scroll when larger */
  flex-shrink: 0;
}

.placeholder {
  position: absolute;
  color: #999;
  font-size: 24px;
  pointer-events: none;
  text-align: center;
}

.full-width {
  width: 100%;
}

.upload-btn-wrapper {
  position: relative;
  overflow: hidden;
  display: inline-block;
  width: 100%;
}

.upload-btn-wrapper input[type='file'] {
  font-size: 100px;
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
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

.icon {
  margin-right: 6px;
  display: none; /* 默认隐藏图标，大屏显示文字 */
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

.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-success {
  background-color: #28a745;
  color: white;
}
.btn-danger {
  background-color: #dc3545 !important;
  color: white !important;
  padding: 2px 6px !important; /* 更紧凑的删除按钮 */
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tip {
  font-size: 12px;
  color: #999;
}

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
  min-width: 0; /* 防止溢出 */
}

.quality-range {
  flex: 1;
  min-width: 0; /* 防止溢出 */
}

/* 移动端浮动按钮 */
.mobile-layers-toggle {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.mobile-layers-toggle:active {
  transform: scale(0.95);
}

.mobile-layers-toggle .layer-count {
  font-size: 12px;
  font-weight: bold;
}

.mobile-layers-toggle .icon {
  display: block;
  margin-right: 0;
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
  .mobile-layers-toggle {
    display: flex;
  }

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

  .canvas-area {
    flex: 1;
    width: 100%;
    height: 100vh;
  }

  .sidebar h2,
  .desktop-only {
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

  .zoom-group {
    grid-column: 2;
    grid-row: 1;
  }

  .export-config {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .export-group {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .control-group,
  .actions {
    flex: 1;
    margin: 0;
  }

  /* 移动端 Zoom 控件调整 */
  .zoom-group {
    flex: 2; /* 给 zoom 多一点空间 */
    padding: 2px;
  }

  /* 移动端按钮图标化 */
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

  /* 缩放按钮在移动端保持显示 */
  .btn.zoom-btn {
    padding: 4px 8px;
    min-width: 32px;
  }

  /* 缩放文字在移动端调整 */
  .zoom-text {
    font-size: 12px;
    min-width: 40px;
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

  /* 移动端导出配置简化显示 */
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
}
</style>
