# GitHub 手动上传指南

由于网络问题导致 `git push` 失败，可以通过 GitHub 网页界面手动上传文件。

## 📋 需要上传的文件清单

### 1. 更新的文件（需要编辑）
- ✅ `README.md` - 已添加效果展示部分
- ✅ `src/views/HomeView.vue` - 已更新默认主题示例

### 2. 新建的文件（需要创建）
- ✅ `docs/ADD_SCREENSHOTS.md` - 截图添加指南
- ✅ `docs/images/.gitkeep` - 保持目录存在
- ✅ `docs/images/README.md` - 图片说明文档
- ✅ `docs/images/edit-outline.png` - 编辑大纲截图
- ✅ `docs/images/image-analysis.png` - 产品分析截图
- ✅ `docs/images/text-result.png` - 文本生成结果截图
- ✅ `docs/images/upload-image.png` - 上传图片截图

## 🚀 详细操作步骤

### 步骤 1：打开 GitHub 仓库

1. 在浏览器中访问：`https://github.com/yangmingliwan41/redflow`
2. 确保已登录你的 GitHub 账号

### 步骤 2：创建 `docs` 目录（如果不存在）

1. 在仓库根目录，点击 **"Add file"** → **"Create new file"**
2. 在文件名输入框中输入：`docs/images/.gitkeep`
3. 文件内容留空（或输入 `# 此文件用于确保目录被 Git 追踪`）
4. 滚动到页面底部，填写提交信息：
   ```
   docs: create images directory
   ```
5. 点击 **"Commit new file"**

### 步骤 3：上传图片文件

#### 上传第一张图片：`edit-outline.png`

1. 点击 **"Add file"** → **"Upload files"**
2. 拖拽或点击选择文件：`docs/images/edit-outline.png`
3. 滚动到页面底部，填写提交信息：
   ```
   docs: add edit-outline screenshot
   ```
4. 点击 **"Commit changes"**

#### 重复上述步骤上传其他图片：
- `docs/images/image-analysis.png` - 提交信息：`docs: add image-analysis screenshot`
- `docs/images/text-result.png` - 提交信息：`docs: add text-result screenshot`
- `docs/images/upload-image.png` - 提交信息：`docs: add upload-image screenshot`

💡 **提示**：可以一次上传多张图片，在 "Upload files" 页面同时选择多张图片。

### 步骤 4：创建文档文件

#### 创建 `docs/images/README.md`

1. 点击 **"Add file"** → **"Create new file"**
2. 文件名：`docs/images/README.md`
3. 复制以下内容到编辑器：

```markdown
# 示例图片说明

本目录用于存放项目的示例截图和效果展示图片。

## 图片命名规范

请按照以下命名规范添加图片：

### 文本生成图文模式
- `text-to-outline.png` - 输入主题生成大纲的界面截图
- `edit-outline.png` - 编辑大纲和配图建议的界面截图
- `text-result.png` - 批量生成海报图片的结果展示

### 图生图模式
- `upload-image.png` - 上传产品图片的界面截图
- `image-analysis.png` - AI分析产品特征的界面截图
- `image-to-image-result.png` - 生成营销文案和风格化图片的结果展示

### 其他功能
- `history-view.png` - 历史记录界面截图
- `settings-view.png` - 系统设置界面截图（可选）

## 图片要求

1. **格式**: 推荐使用 PNG 格式，支持透明背景
2. **尺寸**: 建议宽度 1200-1600px，保持 16:9 或 4:3 比例
3. **大小**: 单张图片建议不超过 500KB，可使用图片压缩工具优化
4. **内容**: 确保截图清晰，关键功能点突出

## 如何添加图片

1. 运行项目：`npm run dev`
2. 使用截图工具（如 Windows 的 Snipping Tool、Snipaste）截取界面
3. 将截图保存到 `docs/images/` 目录
4. 按照命名规范重命名文件
5. 提交到 Git 仓库

## 图片压缩工具推荐

- [TinyPNG](https://tinypng.com/) - 在线 PNG 压缩
- [Squoosh](https://squoosh.app/) - Google 在线图片压缩工具
- [ImageOptim](https://imageoptim.com/) - Mac 图片优化工具

## 注意事项

- 确保截图中的 API 密钥、敏感信息已打码或隐藏
- 使用真实的效果图，避免使用占位图
- 保持图片风格统一，建议使用相同的截图工具和设置
```

4. 填写提交信息：`docs: add images README`
5. 点击 **"Commit new file"**

#### 创建 `docs/ADD_SCREENSHOTS.md`

1. 点击 **"Add file"** → **"Create new file"**
2. 文件名：`docs/ADD_SCREENSHOTS.md`
3. 打开本地文件 `docs/ADD_SCREENSHOTS.md`，复制全部内容到 GitHub 编辑器
4. 填写提交信息：`docs: add screenshot guide`
5. 点击 **"Commit new file"**

### 步骤 5：更新 `README.md`

1. 在仓库中找到 `README.md` 文件
2. 点击文件，然后点击右上角的 **"✏️ Edit"**（铅笔图标）
3. 打开本地的 `README.md` 文件，复制全部内容
4. 粘贴到 GitHub 编辑器中（替换原有内容）
5. 滚动到页面底部，填写提交信息：
   ```
   docs: add screenshots and update README
   ```
6. 点击 **"Commit changes"**

### 步骤 6：更新 `src/views/HomeView.vue`

1. 在仓库中找到 `src/views/HomeView.vue` 文件
2. 点击文件，然后点击右上角的 **"✏️ Edit"**
3. 打开本地的 `src/views/HomeView.vue` 文件，复制全部内容
4. 粘贴到 GitHub 编辑器中（替换原有内容）
5. 填写提交信息：
   ```
   feat: update default topic example
   ```
6. 点击 **"Commit changes"**

## ✅ 验证上传结果

完成所有文件上传后：

1. 刷新仓库页面
2. 检查以下文件是否存在：
   - ✅ `README.md` - 应包含"效果展示"部分
   - ✅ `src/views/HomeView.vue` - 默认主题应为"西安周末旅游攻略"
   - ✅ `docs/ADD_SCREENSHOTS.md`
   - ✅ `docs/images/README.md`
   - ✅ `docs/images/.gitkeep`
   - ✅ `docs/images/edit-outline.png`
   - ✅ `docs/images/image-analysis.png`
   - ✅ `docs/images/text-result.png`
   - ✅ `docs/images/upload-image.png`

3. 查看 README.md 的预览，确认图片是否正常显示

## 🔧 常见问题

### Q: 如何一次上传多个文件？

A: 在 "Upload files" 页面，可以同时选择多个文件（按住 Ctrl 键选择多个文件），然后一次性提交。

### Q: 文件路径不对怎么办？

A: 在创建文件时，文件名输入框支持输入路径，例如：`docs/images/README.md`。GitHub 会自动创建目录结构。

### Q: 图片太大上传失败？

A: 使用图片压缩工具（如 TinyPNG）压缩图片，确保每张图片 < 500KB。

### Q: 如何查看文件是否上传成功？

A: 在仓库页面，点击文件列表中的文件，如果能看到内容，说明上传成功。

## 📝 提交信息参考

建议使用以下提交信息格式：

- 新建文件：`docs: add [文件名]`
- 更新文件：`feat: update [功能描述]` 或 `docs: update [文件名]`
- 上传图片：`docs: add [图片名] screenshot`

## 🎉 完成

上传完成后，你的 GitHub 仓库将包含所有最新的代码和文档！



