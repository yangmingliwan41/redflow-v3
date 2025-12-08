# 如何添加示例图片到 README

本指南将帮助您将项目效果截图添加到 README 中。

## 快速步骤

### 1. 启动项目

```bash
npm run dev
```

在浏览器中打开 `http://localhost:5174`

### 2. 截取界面截图

使用截图工具截取以下界面：

#### 文本生成图文模式
1. **输入主题页面** (`HomeView.vue`)
   - 输入一个主题（如"春季穿搭指南"）
   - 点击"生成大纲"
   - 截图保存为 `docs/images/text-to-outline.png`

2. **编辑大纲页面** (`OutlineView.vue`)
   - 查看生成的大纲
   - 编辑配图建议
   - 截图保存为 `docs/images/edit-outline.png`

3. **生成结果页面** (`ResultView.vue`)
   - 查看生成的所有海报图片
   - 截图保存为 `docs/images/text-result.png`

#### 图生图模式
1. **上传图片页面** (`HomeView.vue`)
   - 切换到"图生图"模式
   - 上传一张产品图片
   - 截图保存为 `docs/images/upload-image.png`

2. **产品分析结果** (`HomeView.vue`)
   - 查看 AI 分析的产品特征
   - 截图保存为 `docs/images/image-analysis.png`

3. **生成结果** (`HomeView.vue`)
   - 查看生成的营销文案和风格化图片
   - 截图保存为 `docs/images/image-to-image-result.png`

#### 其他功能
1. **历史记录页面** (`HistoryView.vue`)
   - 查看历史创作记录
   - 截图保存为 `docs/images/history-view.png`

### 3. 优化图片

使用图片压缩工具优化图片大小（推荐 [TinyPNG](https://tinypng.com/)）：

- 目标大小：每张图片 < 500KB
- 格式：PNG（支持透明背景）
- 尺寸：宽度 1200-1600px

### 4. 添加到项目

将优化后的图片复制到 `docs/images/` 目录：

```bash
# Windows PowerShell
Copy-Item "C:\Users\YourName\Pictures\screenshot.png" "docs\images\text-to-outline.png"

# 或直接使用文件管理器拖拽
```

### 5. 提交到 Git

```bash
git add docs/images/*.png
git commit -m "docs: add screenshots for README"
git push
```

### 6. 验证效果

访问 GitHub 仓库页面，查看 README 中的图片是否正常显示。

## 截图工具推荐

### Windows
- **Snipaste** - 功能强大的截图工具，支持标注
- **Windows 截图工具** - 系统自带，按 `Win + Shift + S`
- **ShareX** - 开源截图工具，功能丰富

### Mac
- **系统截图工具** - 按 `Cmd + Shift + 4`
- **CleanShot X** - 专业截图工具

### 在线工具
- **TinyPNG** - 图片压缩
- **Squoosh** - Google 图片优化工具

## 注意事项

⚠️ **重要安全提示**：
- 截图前请确保隐藏或打码所有 API 密钥
- 不要包含个人信息或敏感数据
- 使用测试数据，避免使用真实业务数据

## 图片命名对照表

| 功能 | 文件名 | 说明 |
|------|--------|------|
| 文本生成大纲 | `text-to-outline.png` | 输入主题生成大纲界面 |
| 编辑大纲 | `edit-outline.png` | 编辑大纲和配图建议界面 |
| 文本生成结果 | `text-result.png` | 批量生成海报结果 |
| 上传图片 | `upload-image.png` | 图生图上传界面 |
| 产品分析 | `image-analysis.png` | AI分析产品特征界面 |
| 图生图结果 | `image-to-image-result.png` | 生成营销文案和图片结果 |
| 历史记录 | `history-view.png` | 历史记录列表界面 |

## 问题排查

### 图片不显示
- 检查文件路径是否正确
- 确认图片文件名与 README 中的引用一致
- 检查图片是否已提交到 Git 仓库

### 图片太大
- 使用图片压缩工具优化
- 考虑使用 WebP 格式（需要更新 README 中的引用）

### 截图不清晰
- 使用高分辨率截图
- 确保浏览器缩放比例为 100%
- 使用专业截图工具而非浏览器截图插件



