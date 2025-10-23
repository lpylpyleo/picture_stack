<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'

const canvasAreaRef = ref(null)
const containerSize = ref({ width: 0, height: 0 }) // 容器尺寸
const stagePos = ref({ x: 0, y: 0 }) // 舞台位置（平移）
const baseScale = ref(1) // 100% 时对应的实际缩放比例
const zoomLevel = ref(1) // 用户视角的缩放等级 (1.0 = 100%)

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

// 监听容器尺寸变化，调整舞台大小
let resizeObserver = null
onMounted(() => {
  if (canvasAreaRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        containerSize.value = { width, height }
      }
    })
    resizeObserver.observe(canvasAreaRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 监听图片添加，自动调整视图
watch(
  () => images.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen && newLen > 0) {
      nextTick(() => {
        // 如果是第一张图片，或者新添加的图片较小，重新计算缩放
        fitToView()
      })
    }
  }
)

// 处理文件上传
const handleUpload = (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  // 过滤出图片文件
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  // 记录是否是第一次上传
  const isFirstUpload = images.value.length === 0

  // 用于存储所有新加载的图片
  const newImages = []
  let loadedCount = 0

  imageFiles.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        // 生成缩略图
        const thumbnail = generateThumbnail(img, 60) // 60px 的正方形缩略图

        const newImage = {
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
        }

        newImages.push(newImage)
        loadedCount++

        // 当所有图片都加载完成后，统一处理
        if (loadedCount === imageFiles.length) {
          // 如果不是第一次上传，需要根据已有图片调整新图片的缩放
          if (!isFirstUpload && images.value.length > 0) {
            // 获取当前所有图片的平均尺寸
            const avgSize = images.value.reduce((acc, img) => {
              return acc + (img.width * img.scaleX + img.height * img.scaleY) / 2
            }, 0) / images.value.length

            // 对每个新图片进行缩放调整
            newImages.forEach(newImg => {
              const newSize = (newImg.width + newImg.height) / 2
              // 如果新图片明显小于平均尺寸，适当放大
              if (newSize < avgSize * 0.5) {
                const scaleFactor = (avgSize * 0.7) / newSize
                newImg.scaleX = scaleFactor
                newImg.scaleY = scaleFactor
              }
            })
          } else if (isFirstUpload && newImages.length > 1) {
            // 如果是第一次上传多张图片，计算这批图片的平均尺寸
            const avgSize = newImages.reduce((acc, img) => {
              return acc + (img.width + img.height) / 2
            }, 0) / newImages.length

            // 对明显小于平均尺寸的图片进行缩放
            newImages.forEach(img => {
              const imgSize = (img.width + img.height) / 2
              if (imgSize < avgSize * 0.5) {
                const scaleFactor = (avgSize * 0.7) / imgSize
                img.scaleX = scaleFactor
                img.scaleY = scaleFactor
              }
            })
          }

          // 将所有新图片添加到数组中
          images.value.push(...newImages)
        }
      }
    }
    reader.readAsDataURL(file)
  })

  // 清空 input 以便重复上传同一文件
  e.target.value = ''
}

// 智能调整视图以适应所有图片
const fitToView = () => {
  if (images.value.length === 0 || containerSize.value.width === 0) return

  // 计算所有图片的边界框
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  images.value.forEach(img => {
    const width = img.width * img.scaleX
    const height = img.height * img.scaleY

    // 考虑旋转的边界框
    const rad = (img.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const halfWidth = width / 2
    const halfHeight = height / 2

    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ]

    corners.forEach(corner => {
      const rotatedX = corner.x * cos - corner.y * sin
      const rotatedY = corner.x * sin + corner.y * cos
      const finalX = img.x + halfWidth + rotatedX
      const finalY = img.y + halfHeight + rotatedY

      minX = Math.min(minX, finalX)
      minY = Math.min(minY, finalY)
      maxX = Math.max(maxX, finalX)
      maxY = Math.max(maxY, finalY)
    })
  })

  const boundingWidth = maxX - minX
  const boundingHeight = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const padding = 40
  const containerW = containerSize.value.width
  const containerH = containerSize.value.height

  const scaleX = (containerW - padding) / boundingWidth
  const scaleY = (containerH - padding) / boundingHeight

  baseScale.value = Math.min(scaleX, scaleY, 1) // 不超过 100%
  zoomLevel.value = 1

  const finalScale = baseScale.value * zoomLevel.value
  stagePos.value = {
    x: containerW / 2 - centerX * finalScale,
    y: containerH / 2 - centerY * finalScale
  }
}

// 选中图片
const onSelect = (id) => {
  selectedId.value = id
}

// 滚轮缩放
const handleWheel = (e) => {
  const stage = stageRef.value.getStage()
  if (!stage) return
  e.evt.preventDefault()

  const oldScale = baseScale.value * zoomLevel.value
  const pointer = stage.getPointerPosition()

  const scaleBy = 1.1
  let newZoomLevel = e.evt.deltaY > 0 ? zoomLevel.value / scaleBy : zoomLevel.value * scaleBy

  // 限制用户缩放等级在 5% 到 500% 之间 (相对于 baseScale)
  newZoomLevel = Math.max(0.05, Math.min(newZoomLevel, 5))

  zoomLevel.value = newZoomLevel
  const newScale = baseScale.value * newZoomLevel

  // 计算新的舞台位置，使缩放以鼠标为中心
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  stagePos.value = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  }
}

// 点击舞台空白处取消选中
const onStageMouseDown = (e) => {
  // 如果点击的是舞台本身，说明是点击了空白处
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

  // 取消选中（隐藏 Transformer），重置缩放和位置为原始状态以便精确导出
  selectedId.value = null
  zoomLevel.value = 1
  baseScale.value = 1
  stagePos.value = { x: 0, y: 0 }

  // 等待 DOM 和 Konva 更新到原始状态
  await nextTick()

  try {
    const baseImg = images.value[0]

    // 计算底图的实际边界框（考虑旋转）
    const rad = (baseImg.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // 底图四个角的坐标（相对于底图中心）
    const halfWidth = (baseImg.width * baseImg.scaleX) / 2
    const halfHeight = (baseImg.height * baseImg.scaleY) / 2

    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ]

    // 旋转后的角坐标
    const rotatedCorners = corners.map(corner => ({
      x: corner.x * cos - corner.y * sin,
      y: corner.x * sin + corner.y * cos
    }))

    // 计算边界框
    const minX = Math.min(...rotatedCorners.map(c => c.x)) + baseImg.x + halfWidth
    const maxX = Math.max(...rotatedCorners.map(c => c.x)) + baseImg.x + halfWidth
    const minY = Math.min(...rotatedCorners.map(c => c.y)) + baseImg.y + halfHeight
    const maxY = Math.max(...rotatedCorners.map(c => c.y)) + baseImg.y + halfHeight

    const exportWidth = maxX - minX
    const exportHeight = maxY - minY

    // 导出指定区域
    const dataURL = stage.toDataURL({
      pixelRatio: 1,
      x: minX,
      y: minY,
      width: exportWidth,
      height: exportHeight,
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
    // 恢复之前的视图状态
    selectedId.value = currentSelected

    // 重新计算视图以适应所有图片
    fitToView()
  }
}

const rotationSnaps = [0, 90, 180, 270, 360]

const zoomAroundCenter = (newZoomLevel) => {
  const stage = stageRef.value?.getStage()
  if (!stage) return

  const oldScale = baseScale.value * zoomLevel.value
  const newScale = baseScale.value * newZoomLevel

  // 屏幕中心点
  const cx = containerSize.value.width / 2
  const cy = containerSize.value.height / 2

  // 中心点在舞台上的相对坐标
  const centerOnStage = {
    x: (cx - stage.x()) / oldScale,
    y: (cy - stage.y()) / oldScale,
  }

  // 新的舞台位置，保持屏幕中心点对应舞台上的同一点
  stagePos.value = {
    x: cx - centerOnStage.x * newScale,
    y: cy - centerOnStage.y * newScale,
  }
  zoomLevel.value = newZoomLevel
}

const zoomIn = () => {
  const newZoom = Math.min(5, zoomLevel.value * 1.2)
  zoomAroundCenter(newZoom)
}
const zoomOut = () => {
  const newZoom = Math.max(0.05, zoomLevel.value / 1.2)
  zoomAroundCenter(newZoom)
}
const resetZoom = () => {
  fitToView()
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
      <v-stage
        ref="stageRef"
        :config="{
          width: containerSize.width,
          height: containerSize.height,
          scale: { x: baseScale * zoomLevel, y: baseScale * zoomLevel },
          x: stagePos.x,
          y: stagePos.y,
          draggable: true,
        }"
        @mousedown="onStageMouseDown"
        @touchstart="onStageMouseDown"
        @wheel="handleWheel"
        @dragend="(e) => {
          // 如果是舞台本身的拖动结束，更新位置
          if (e.target === e.target.getStage()) {
             stagePos.value = { x: e.target.x(), y: e.target.y() }
          }
        }"
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
  position: relative;
  overflow: hidden; /* 隐藏滚动条，使用无限画布平移 */
  touch-action: none;
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

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
