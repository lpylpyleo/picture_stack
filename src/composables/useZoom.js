import { ref, computed } from 'vue'

export const useZoom = (containerSize, images) => {
  const stagePos = ref({ x: 0, y: 0 })
  const baseScale = ref(1)
  const zoomLevel = ref(1)

  const zoomPercentage = computed(() => Math.round(zoomLevel.value * 100) + '%')

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

  // 围绕中心缩放
  const zoomAroundCenter = (newZoomLevel) => {
    const oldScale = baseScale.value * zoomLevel.value
    const newScale = baseScale.value * newZoomLevel

    // 屏幕中心点
    const cx = containerSize.value.width / 2
    const cy = containerSize.value.height / 2

    // 中心点在舞台上的相对坐标
    const centerOnStage = {
      x: (cx - stagePos.value.x) / oldScale,
      y: (cy - stagePos.value.y) / oldScale,
    }

    // 新的舞台位置，保持屏幕中心点对应舞台上的同一点
    stagePos.value = {
      x: cx - centerOnStage.x * newScale,
      y: cy - centerOnStage.y * newScale,
    }
    zoomLevel.value = newZoomLevel
  }

  // 滚轮缩放
  const handleWheel = (e, stage) => {
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

  const setZoom = (newZoomLevel) => {
    // 限制缩放范围
    const clampedZoom = Math.max(0.1, Math.min(newZoomLevel, 3))
    zoomAroundCenter(clampedZoom)
  }

  return {
    stagePos,
    baseScale,
    zoomLevel,
    zoomPercentage,
    fitToView,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom
  }
}
