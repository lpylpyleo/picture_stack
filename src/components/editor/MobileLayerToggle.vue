<template>
  <button class="mobile-layers-toggle" @click="$emit('toggle')">
    <span class="layer-count" v-if="imageCount > 0">{{ imageCount }}</span>
    <span class="icon">{{ imageCount > 0 ? '📑' : '📂' }}</span>
  </button>
</template>

<script setup>
defineProps({
  imageCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['toggle'])
</script>

<style scoped>
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

@media (max-width: 768px) {
  .mobile-layers-toggle {
    display: flex;
  }
}
</style>
