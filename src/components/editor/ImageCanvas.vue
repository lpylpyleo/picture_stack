<template>
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
      @wheel="$emit('wheel', $event)"
      @dragend="onStageDragEnd"
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
          @transformend="$emit('transform-end', $event)"
          @dragend="$emit('drag-end', $event)"
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
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    required: true
  },
  selectedId: {
    type: [String, null],
    default: null
  },
  containerSize: {
    type: Object,
    required: true
  },
  stagePos: {
    type: Object,
    required: true
  },
  baseScale: {
    type: Number,
    required: true
  },
  zoomLevel: {
    type: Number,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedId',
  'update:stagePos',
  'update:containerSize',
  'transform-end',
  'drag-end',
  'wheel'
])

const canvasAreaRef = ref(null)
const stageRef = ref(null)
const transformerRef = ref(null)

const rotationSnaps = [0, 90, 180, 270, 360]

// 监听容器尺寸变化
let resizeObserver = null
onMounted(() => {
  if (canvasAreaRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        emit('update:containerSize', { width, height })
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

// 监听选中变化，更新 Transformer
watch(() => props.selectedId, (newId) => {
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

// 点击舞台空白处取消选中
const onStageMouseDown = (e) => {
  if (e.target === e.target.getStage()) {
    emit('update:selectedId', null)
    return
  }

  const clickedOnTransformer = e.target.getParent().className === 'Transformer'
  if (clickedOnTransformer) {
    return
  }

  const id = e.target.id()
  if (id && id.startsWith('img_')) {
    emit('update:selectedId', id)
  } else {
    emit('update:selectedId', null)
  }
}

const onStageDragEnd = (e) => {
  if (e.target === e.target.getStage()) {
    emit('update:stagePos', { x: e.target.x(), y: e.target.y() })
  }
}

const getStage = () => stageRef.value?.getStage()

defineExpose({ getStage })
</script>

<style scoped>
.canvas-area {
  flex: 1;
  background: #e9ecef;
  position: relative;
  overflow: hidden;
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
</style>
