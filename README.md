# Picture Stack - 图片叠加编辑器

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=flat-square&logo=vue.js" alt="Vue.js">
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Konva-10.0-FF6B6B?style=flat-square" alt="Konva">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

## 📸 简介

Picture Stack 是一个基于 Vue 3 和 Konva.js 构建的在线图片叠加编辑器。它允许用户上传多张图片，通过拖拽、缩放、旋转等操作来创建图片合成效果，并支持导出为多种格式。

### ✨ 主要特性

- 🎨 **多图层编辑** - 支持上传和管理多个图片图层
- 🖱️ **直观操作** - 拖拽移动、缩放、旋转图片
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🔍 **缩放控制** - 支持放大、缩小和自适应视图
- 💾 **多格式导出** - 支持 PNG、JPEG、WebP 格式导出
- 🎯 **图层管理** - 调整图层顺序、删除图层
- 👁️ **实时预览** - 导出前预览最终效果

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- Bun 包管理器

### 安装

```bash
# 克隆项目
git clone https://github.com/lpylpyleo/picture_stack.git

# 进入项目目录
cd picture_stack

# 安装依赖
bun install
```

### 开发

```bash
# 启动开发服务器
bun run dev
```

访问 `http://localhost:5173` 查看应用

### 构建

```bash
# 构建生产版本
bun run build

# 预览构建结果
bun run preview
```

### 部署到 Cloudflare Workers

```bash
# 部署到 Cloudflare Workers
bun run deploy
```

## 📖 使用指南

1. **上传图片**：点击"上传图片"按钮，选择要编辑的图片文件
2. **编辑图片**：
   - 拖拽图片调整位置
   - 使用变换控制点缩放和旋转图片
   - 在图层面板中管理图层顺序
3. **导出结果**：
   - 选择导出格式（PNG/JPEG/WebP）
   - 调整导出质量（仅 JPEG/WebP）
   - 点击"导出图片"下载合成结果

## 🛠️ 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **画布引擎**: Konva.js + vue-konva
- **状态管理**: Pinia
- **路由**: Vue Router
- **部署**: Cloudflare Workers

## 📁 项目结构

```
picture_stack/
├── public/              # 静态资源
├── src/
│   ├── assets/         # 样式和图片资源
│   ├── components/     # Vue 组件
│   │   └── editor/     # 编辑器相关组件
│   ├── composables/    # 组合式函数
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 状态管理
│   └── views/          # 页面组件
├── worker.js           # Cloudflare Worker 入口
└── wrangler.json       # Cloudflare Worker 配置
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

- [@lpylpyleo](https://github.com/lpylpyleo)

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Konva.js](https://konvajs.org/) - 2D Canvas 库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Cloudflare Workers](https://workers.cloudflare.com/) - 边缘计算平台
