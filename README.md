# 红流云创 v3.0

<div align="center">

**AI驱动的图文创作助手 - 全栈版本**

[功能特性](#功能特性) • [快速开始](#快速开始) • [服务器部署](#服务器部署) • [Docker部署](#docker部署) • [贡献指南](./CONTRIBUTING.md) • [更新日志](./CHANGELOG.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com/)

</div>

## 项目简介

红流云创 v3.0 是一个全栈 AI 图文创作助手，面向小红书场景，支持两种创作模式：

1. **文本生成图文**：输入主题，AI 生成小红书图文大纲和配图建议，并批量生成海报图片
2. **图生图**：上传产品图片，AI 分析并生成营销文案和风格化图片

### 🆕 V3.0 新特性

- ✅ **用户认证系统**：注册、登录、Session 管理
- ✅ **服务器端存储**：历史记录存储在 MySQL 数据库
- ✅ **RESTful API**：完整的后端 API 服务
- ✅ **数据安全**：密码加密、Session 管理
- ✅ **Docker 部署**：一键部署 MySQL + 后端 + 前端

## 效果展示

### 文本生成图文模式

<div align="center">

#### 1. 输入主题生成大纲
![文本生成大纲](./docs/images/text-to-outline.png)

#### 2. 编辑大纲和配图建议
![编辑大纲](./docs/images/edit-outline.png)

#### 3. 批量生成海报图片
![生成结果](./docs/images/text-result.png)

</div>

### 图生图模式

<div align="center">

#### 1. 上传产品图片
![上传图片](./docs/images/upload-image.png)

#### 2. AI分析产品特征
![产品分析](./docs/images/image-analysis.png)

#### 3. 生成营销文案和风格化图片
![图生图结果](./docs/images/image-to-image-result.png)

</div>

### 用户认证

<div align="center">

#### 登录注册界面
![登录注册](./docs/images/auth-view.png)

</div>

### 历史记录

<div align="center">

![历史记录](./docs/images/history-view.png)

</div>

> 💡 **提示**: 以上示例图片需要您自行添加。将截图保存到 `docs/images/` 目录，并按照上述命名规范命名即可。

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **构建工具**: Vite

### 后端
- **框架**: Node.js + Express
- **数据库**: MySQL 8.0
- **认证**: Session (MySQL 存储)
- **密码加密**: bcrypt

### AI 服务
- **文本生成**: DeepSeek API
- **图片生成**: Google GenAI API

## 项目结构

```
V3/
├── src/                    # 前端源码
│   ├── assets/            # 静态资源
│   ├── components/        # 组件
│   │   ├── ui/           # UI组件库
│   │   ├── layout/       # 布局组件
│   │   └── common/       # 通用组件
│   ├── composables/       # 组合式函数
│   ├── config/           # 配置文件
│   ├── router/           # 路由配置
│   ├── services/          # 服务层
│   │   ├── api/          # API服务（新增）
│   │   ├── ai/           # AI服务模块
│   │   └── storage/      # 存储服务
│   ├── stores/           # 状态管理
│   │   └── auth.ts       # 用户认证Store（新增）
│   ├── types/            # TypeScript类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面视图
│   │   └── AuthView.vue  # 登录注册页面（新增）
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── backend/              # 后端源码（新增）
│   ├── config/           # 配置文件
│   │   ├── database.js   # 数据库配置
│   │   └── session.js    # Session配置
│   ├── database/         # 数据库脚本
│   │   └── schema.sql    # 数据库表结构
│   ├── middleware/       # 中间件
│   │   ├── auth.js       # 认证中间件
│   │   └── errorHandler.js # 错误处理
│   ├── routes/           # 路由
│   │   ├── auth.js       # 认证路由
│   │   └── history.js    # 历史记录路由
│   ├── utils/            # 工具函数
│   │   ├── password.js   # 密码加密
│   │   └── validation.js # 数据验证
│   └── package.json      # 后端依赖
├── docker/               # Docker配置文件
├── Dockerfile.backend    # 后端Dockerfile（新增）
├── Dockerfile.nginx      # 前端Nginx Dockerfile
├── docker-compose.yml    # Docker Compose配置（更新）
├── server.js             # Express服务器（更新）
├── package.json          # 前端依赖
└── .env.example          # 环境变量模板（新增）
```

## 安装和运行

### 前置要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

### 1. 安装依赖

```bash
# 安装前端依赖
cd 02.红流云创/V3
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 2. 配置数据库

#### 2.1 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE redflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'redflow_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON redflow_db.* TO 'redflow_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 2.2 初始化数据库表

```bash
# 导入数据库 schema
mysql -u redflow_user -p redflow_db < backend/database/schema.sql
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=redflow_user
DB_PASSWORD=your_password
DB_NAME=redflow_db

# Session配置
SESSION_SECRET=your_secret_key_here

# 服务器配置
PORT=3000
NODE_ENV=development

# CORS配置
CORS_ORIGIN=http://localhost:5174
```

### 4. 配置API密钥

在浏览器中打开应用后，进入"系统设置"页面，配置以下API密钥：

- **DeepSeek API Key**: 用于文本生成
  - 获取地址: https://platform.deepseek.com/
  - 配置项: `DEEPSEEK_API_KEY`

- **Google GenAI API Key**: 用于图片生成
  - 获取地址: https://aistudio.google.com/app/apikey
  - 配置项: `GOOGLE_API_KEY`

### 5. 启动服务

#### 启动后端服务

```bash
cd backend
npm start
# 或开发模式（自动重启）
npm run dev
```

后端服务将在 `http://localhost:3000` 启动。

#### 启动前端开发服务器

```bash
# 在项目根目录（新终端）
npm run dev
```

前端开发服务器将在 `http://localhost:5174` 启动。

### 6. 访问应用

- **前端应用**: http://localhost:5174
- **后端API**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/health

### 7. 构建生产版本

```bash
# 构建前端
npm run build

# 构建产物在 dist/ 目录
```

## 服务器部署

**📚 详细部署指南**: 请查看 [部署文档](./DEPLOYMENT.md)，包含完整的部署说明和常见问题解答。

### 快速部署（Docker - 推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库密码等

# 2. 启动所有服务（MySQL + 后端 + 前端）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# 前端: http://localhost:8080
# 后端API: http://localhost:3000
```

### 快速部署脚本

```bash
# 使用部署脚本（自动构建并部署）
chmod +x deploy.sh
./deploy.sh docker    # Docker 部署
```

> 💡 **提示**: 首次使用需要先注册账号。部署后，每个用户需要在浏览器中配置自己的 API 密钥。

## Docker部署

项目支持完整的 Docker Compose 部署，包含 MySQL、后端 API 和前端服务。

### 一键部署

```bash
# 使用 docker-compose 部署所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f mysql
```

### 服务说明

- **mysql**: MySQL 8.0 数据库（端口 3306）
- **backend**: Node.js 后端 API 服务（端口 3000）
- **frontend**: Nginx 前端静态文件服务（端口 8080）

### 环境变量

详细的环境变量配置请参考 `.env.example` 和 [部署文档](./DEPLOYMENT.md#环境变量配置)。

## 功能特性

### 用户认证系统
- ✅ 用户注册（用户名、邮箱、密码）
- ✅ 用户登录（邮箱、密码）
- ✅ Session 认证（MySQL 存储）
- ✅ 密码加密（bcrypt）
- ✅ 路由守卫保护

### 文本生成图文模式
- 输入创意主题
- AI生成小红书风格图文大纲
- 支持多页面内容生成
- 批量生成海报图片
- 编辑大纲和配图建议

### 图生图模式
- 上传产品图片
- AI分析产品特征（颜色、材质、类别等）
- 生成营销文案
- 生成风格化产品图片
- 支持多种风格选择

### 历史记录
- ✅ 服务器端存储（MySQL）
- ✅ 自动保存创作历史
- ✅ 查看历史作品详情
- ✅ 支持分页查询
- ✅ 删除历史记录

### 系统设置
- API密钥配置（本地存储）
- 配置即时生效

## API配置说明

### DeepSeek API
- **默认端点**: `https://api.deepseek.com/chat/completions`
- **默认模型**: `deepseek-chat`
- **支持自定义端点和模型**

### Google GenAI API
- **获取地址**: https://aistudio.google.com/app/apikey
- **图片生成模型**: `gemini-2.5-flash-image`
- **文本分析模型**: `gemini-2.5-flash`

## 后端API

### 认证API

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 历史记录API

- `GET /api/history` - 获取历史记录列表（分页）
- `GET /api/history/:id` - 获取历史记录详情
- `POST /api/history` - 创建历史记录
- `PUT /api/history/:id` - 更新历史记录
- `DELETE /api/history/:id` - 删除历史记录

## 开发计划

- [x] 基础项目结构
- [x] 路由和布局
- [x] API服务集成（DeepSeek + Google）
- [x] 图生图功能
- [x] 文本生成大纲功能
- [x] 用户认证系统
- [x] 服务器端历史记录存储
- [x] Docker部署支持
- [x] 单元测试框架
- [ ] 图片生成流程优化
- [ ] 深色模式支持
- [ ] 数据迁移工具（从V2迁移）

## 注意事项

1. **数据库安全**: 生产环境请使用强密码，并限制数据库访问
2. **Session密钥**: 生产环境必须修改 `SESSION_SECRET` 为随机字符串
3. **API密钥安全**: API密钥存储在浏览器本地存储中，不会上传到服务器
4. **数据备份**: 定期备份 MySQL 数据库
5. **网络要求**: 需要能够访问 DeepSeek 和 Google API 服务

## 测试

```bash
# 运行测试
npm test

# 运行测试并查看覆盖率
npm run test:coverage

# 运行测试UI
npm run test:ui
```

## 贡献

我们欢迎所有形式的贡献！请查看 [贡献指南](./CONTRIBUTING.md) 了解详细信息。

### 贡献方式

- 🐛 [报告Bug](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 [提出功能建议](./.github/ISSUE_TEMPLATE/feature_request.md)
- 📝 [提交代码](./CONTRIBUTING.md#提交代码)
- 📖 [改进文档](./CONTRIBUTING.md)

## 常见问题（FAQ）

### Q: 如何注册账号？

A: 首次访问应用会自动跳转到登录页面，点击"注册"标签页即可注册新账号。

### Q: 忘记密码怎么办？

A: V3.0 目前不支持密码重置功能，请妥善保管您的密码。如需重置，请联系管理员或删除数据库中的用户记录后重新注册。

### Q: 历史记录存储在哪里？

A: V3.0 的历史记录存储在 MySQL 数据库中，不再使用浏览器本地存储。数据更安全，且支持多设备访问。

### Q: 如何备份历史记录？

A: 可以通过备份 MySQL 数据库来备份所有历史记录：

```bash
# 备份数据库
docker exec redflow-mysql mysqldump -u root -p redflow_db > backup.sql
```

### Q: API密钥安全吗？

A: 所有API密钥存储在浏览器本地存储（localStorage）中，不会上传到任何服务器。请妥善保管您的API密钥。

### Q: 支持哪些浏览器？

A: 支持所有现代浏览器（Chrome、Firefox、Safari、Edge等），需要支持ES6+和Vue 3。

### Q: 数据库连接失败怎么办？

A: 请检查：
1. MySQL 服务是否运行
2. `.env` 中的数据库配置是否正确
3. 数据库用户权限是否正确
4. 防火墙设置

详细解决方案请参考 [部署文档](./DEPLOYMENT.md#常见问题)。

### Q: 图片生成失败怎么办？

A: 请检查：
1. API密钥是否正确配置
2. 网络连接是否正常
3. API服务是否可用
4. 查看浏览器控制台的错误信息

## 版本对比

### V3.0 vs V2.0

| 特性 | V2.0 | V3.0 |
|------|------|------|
| 用户认证 | ❌ | ✅ |
| 历史记录存储 | localStorage | MySQL |
| 后端API | ❌ | ✅ |
| 数据持久化 | 浏览器本地 | 服务器端 |
| 多设备同步 | ❌ | ✅ |
| Docker部署 | 前端 only | 全栈 |

## 许可证

本项目采用 [MIT许可证](./LICENSE) 开源。

## 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Express](https://expressjs.com/) - Node.js Web框架
- [MySQL](https://www.mysql.com/) - 关系型数据库
- [DeepSeek](https://platform.deepseek.com/) - AI文本生成服务
- [Google GenAI](https://aistudio.google.com/) - AI图片生成服务

## 相关链接

- [更新日志](./CHANGELOG.md)
- [贡献指南](./CONTRIBUTING.md)
- [部署文档](./DEPLOYMENT.md) ⭐
- [Docker部署文档](./docker/README.md)
- [问题反馈](https://github.com/your-username/redflow-v3/issues)
