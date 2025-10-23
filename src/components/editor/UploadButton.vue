<template>
  <div class="upload-btn-wrapper">
    <button class="btn btn-primary full-width" title="上传图片">
      <span class="icon">📂</span>
      <span class="text">上传图片</span>
    </button>
    <input
      type="file"
      multiple
      @change="handleChange"
      accept="image/*"
    />
  </div>
</template>

<script setup>
const emit = defineEmits(['upload'])

const handleChange = (e) => {
  emit('upload', e)
  // 清空 input 以便重复上传同一文件
  e.target.value = ''
}
</script>

<style scoped>
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

.full-width {
  width: 100%;
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

.btn-primary {
  background-color: #007bff;
  color: white;
}

.icon {
  margin-right: 6px;
  display: none;
}

@media (max-width: 768px) {
  .btn .text {
    display: none;
  }
  .btn .icon {
    display: inline;
    margin-right: 0;
    font-size: 16px;
  }
}
</style>
