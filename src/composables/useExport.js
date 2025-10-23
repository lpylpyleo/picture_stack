import { ref, nextTick } from 'vue'

export const useExport = () => {
  const exportFormat = ref('image/jpeg')
  const exportQuality = ref(0.92)

  // 计算底图的边界框（考虑旋转）
  const calculateImageBounds = (img) => {
    const rad = (img.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // 底图四个角的坐标（相对于底图中心）
    const halfWidth = (img.width * img.scaleX) / 2
    const halfHeight = (img.height * img.scaleY) / 2

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
    const minX = Math.min(...rotatedCorners.map(c => c.x)) + img.x + halfWidth
    const maxX = Math.max(...rotatedCorners.map(c => c.x)) + img.x + halfWidth
    const minY = Math.min(...rotatedCorners.map(c => c.y)) + img.y + halfHeight
    const maxY = Math.max(...rotatedCorners.map(c => c.y)) + img.y + halfHeight

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // 导出舞台为图片数据
  const exportStageAsImage = async (stage, bounds) => {
    return stage.toDataURL({
      pixelRatio: 1,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      mimeType: exportFormat.value,
      quality: exportQuality.value,
    })
  }

  // 生成预览页面的HTML内容
  const generatePreviewHTML = (dataURL, fileName) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>${fileName}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .container {
            text-align: center;
            padding: 20px;
          }
          img {
            max-width: 100%;
            max-height: 90vh;
            display: block;
            margin: 0 auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border-radius: 8px;
          }
          .tip {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
          }
          .tip-mobile {
            display: none;
          }
          @media (max-width: 768px) {
            .tip-mobile {
              display: block;
            }
            .tip-desktop {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${dataURL}" alt="${fileName}">
          <div class="tip">
            <p class="tip-mobile">长按图片可保存到相册</p>
            <p class="tip-desktop">右键点击图片可保存</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // 准备导出状态
  const prepareExportState = (selectedId, zoomLevel, baseScale, stagePos) => {
    return {
      selectedId: selectedId.value,
      zoomLevel: zoomLevel.value,
      baseScale: baseScale.value,
      stagePos: { ...stagePos.value }
    }
  }

  // 重置视图状态以便精确导出
  const resetViewForExport = (selectedId, zoomLevel, baseScale, stagePos) => {
    selectedId.value = null
    zoomLevel.value = 1
    baseScale.value = 1
    stagePos.value = { x: 0, y: 0 }
  }

  // 恢复视图状态
  const restoreViewState = (state, selectedId, zoomLevel, baseScale, stagePos) => {
    selectedId.value = state.selectedId
    zoomLevel.value = state.zoomLevel
    baseScale.value = state.baseScale
    stagePos.value = state.stagePos
  }

  // 导出图片
  const handleExport = async (stage, images, selectedId, zoomLevel, baseScale, stagePos, fitToView) => {
    if (!stage || images.length === 0) return

    // 暂存当前状态
    const currentState = prepareExportState(selectedId, zoomLevel, baseScale, stagePos)

    resetViewForExport(selectedId, zoomLevel, baseScale, stagePos)
    await nextTick()

    try {
      // 计算导出边界
      const bounds = calculateImageBounds(images[0])

      // 导出图片
      const dataURL = await exportStageAsImage(stage, bounds)

      // 下载文件
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
      restoreViewState(currentState, selectedId, zoomLevel, baseScale, stagePos)
      fitToView()
    }
  }

  // 在新页面预览
  const handlePreview = async (stage, images, selectedId, zoomLevel, baseScale, stagePos, fitToView) => {
    if (!stage || images.length === 0) return

    // 暂存当前状态
    const currentState = prepareExportState(selectedId, zoomLevel, baseScale, stagePos)

    resetViewForExport(selectedId, zoomLevel, baseScale, stagePos)
    await nextTick()

    try {
      // 计算导出边界
      const bounds = calculateImageBounds(images[0])

      // 导出图片
      const dataURL = await exportStageAsImage(stage, bounds)

      // 创建预览窗口
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        const ext = exportFormat.value === 'image/jpeg' ? 'jpg' : 'png'
        const fileName = `stacked-${Date.now()}.${ext}`

        // 写入HTML内容
        const htmlContent = generatePreviewHTML(dataURL, fileName)
        newWindow.document.open()
        newWindow.document.write(htmlContent)
        newWindow.document.close()
      }
    } catch (e) {
      console.error('Preview failed:', e)
      alert('预览失败，请重试')
    } finally {
      // 恢复之前的视图状态
      restoreViewState(currentState, selectedId, zoomLevel, baseScale, stagePos)
      fitToView()
    }
  }

  return {
    exportFormat,
    exportQuality,
    handleExport,
    handlePreview
  }
}
