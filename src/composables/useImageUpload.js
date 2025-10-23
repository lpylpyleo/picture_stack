import { nextTick } from 'vue'

// 生成缩略图
export const generateThumbnail = (img, size) => {
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

// 处理图片上传
export const useImageUpload = (images, fitToView) => {
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
              // 如果是第一次上传多张图片，找出最大的图片
              let maxSize = 0
              let maxSizeIndex = 0

              newImages.forEach((img, index) => {
                const size = img.width * img.height
                if (size > maxSize) {
                  maxSize = size
                  maxSizeIndex = index
                }
              })

              // 将最大的图片移到数组开头（底层）
              const largestImage = newImages.splice(maxSizeIndex, 1)[0]
              newImages.unshift(largestImage)

              // 计算这批图片的平均尺寸
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

            // 自动调整视图
            nextTick(() => {
              fitToView()
            })
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }

  return {
    handleUpload
  }
}
