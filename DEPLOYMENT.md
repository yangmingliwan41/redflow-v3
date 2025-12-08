# 红流云创 V3 部署指南

## 📋 目录

- [项目概述](#项目概述)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [数据库配置](#数据库配置)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

## 项目概述

红流云创 V3 是一个全栈应用，包含：

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Node.js + Express
- **数据库**: MySQL 8.0
- **认证**: Session 基于 MySQL 存储

### 主要特性

- ✅ 用户注册/登录/登出
- ✅ 服务器端历史记录存储
- ✅ Session 认证（MySQL 存储）
- ✅ RESTful API
- ✅ Docker 容器化部署

## 环境要求

### 必需环境

- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **npm**: >= 9.0.0 或 **yarn**: >= 1.22.0

### 可选环境

- **Docker**: >= 20.10.0（用于容器化部署）
- **Docker Compose**: >= 2.0.0

## 快速开始

### 方式一：Docker 一键部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd 02.红流云创/V3

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库密码等

# 3. 启动所有服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost:8080
# 后端API: http://localhost:3000
```

### 方式二：本地开发部署

```bash
# 1. 安装前端依赖
npm install

# 2. 安装后端依赖
cd backend
npm install
cd ..

# 3. 配置数据库（见下方数据库配置章节）

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 5. 启动后端服务
cd backend
npm start
# 或使用开发模式
npm run dev

# 6. 启动前端开发服务器（新终端）
npm run dev
```

## 开发环境部署

### 1. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd backend
npm install
```

### 2. 配置 MySQL 数据库

#### 2.1 安装 MySQL

**Windows:**
```bash
# 下载 MySQL Installer
# https://dev.mysql.com/downloads/installer/
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

#### 2.2 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE redflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选，也可以使用 root）
CREATE USER 'redflow_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON redflow_db.* TO 'redflow_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 2.3 初始化数据库表

```bash
# 导入数据库 schema
mysql -u redflow_user -p redflow_db < backend/database/schema.sql
```

### 3. 配置环境变量

创建 `.env` 文件（在项目根目录）：

```bash
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
SESSION_SECRET=your_secret_key_here_change_in_production

# 服务器配置
PORT=3000
NODE_ENV=development

# CORS配置
CORS_ORIGIN=http://localhost:5174
```

### 4. 启动服务

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
# 在项目根目录
npm run dev
```

前端开发服务器将在 `http://localhost:5174` 启动。

### 5. 访问应用

- **前端应用**: http://localhost:5174
- **后端API**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/health

## 生产环境部署

### 方式一：Docker Compose 部署（推荐）

#### 1. 准备环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env，设置生产环境配置
# 特别注意：
# - DB_ROOT_PASSWORD: MySQL root 密码
# - DB_PASSWORD: 应用数据库用户密码
# - SESSION_SECRET: 随机生成的密钥
# - NODE_ENV=production
```

#### 2. 构建并启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 3. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 检查前端
curl http://localhost:8080
```

#### 4. 停止服务

```bash
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

### 方式二：手动部署

#### 1. 构建前端

```bash
npm run build
```

构建产物在 `dist/` 目录。

#### 2. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/redflow`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /opt/redflow-v3/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/redflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 使用 PM2 管理后端服务

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start server.js --name redflow-backend

# 设置开机自启
pm2 startup
pm2 save
```

## Docker 部署

### 服务架构

```
┌─────────────┐
│   Frontend  │  (Nginx, 端口 8080)
│   (Nginx)   │
└──────┬──────┘
       │
       │ /api/*
       ▼
┌─────────────┐
│   Backend   │  (Node.js, 端口 3000)
│   (Express) │
└──────┬──────┘
       │
       │ SQL
       ▼
┌─────────────┐
│    MySQL    │  (端口 3306)
│   Database  │
└─────────────┘
```

### Docker Compose 配置说明

`docker-compose.yml` 包含三个服务：

1. **mysql**: MySQL 8.0 数据库
2. **backend**: Node.js 后端 API 服务
3. **frontend**: Nginx 前端静态文件服务

### 数据持久化

数据库数据存储在 Docker volume `mysql_data` 中，即使容器删除，数据也会保留。

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f
```

## 数据库配置

### 数据库表结构

项目使用以下数据库表：

- **users**: 用户信息
- **sessions**: Session 存储
- **history_records**: 历史记录
- **history_images**: 历史记录图片

### 数据库初始化

数据库 schema 文件位于 `backend/database/schema.sql`。

**使用 Docker:**
数据库会在容器首次启动时自动初始化。

**手动初始化:**
```bash
mysql -u redflow_user -p redflow_db < backend/database/schema.sql
```

### 数据库备份

```bash
# 备份数据库
docker exec redflow-mysql mysqldump -u root -p redflow_db > backup.sql

# 恢复数据库
docker exec -i redflow-mysql mysql -u root -p redflow_db < backup.sql
```

### 数据库迁移

如果需要修改数据库结构，请：

1. 修改 `backend/database/schema.sql`
2. 创建迁移脚本（可选）
3. 在测试环境验证
4. 在生产环境执行迁移

## 环境变量配置

### 必需环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | `localhost` 或 `mysql` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USER` | 数据库用户名 | `redflow_user` |
| `DB_PASSWORD` | 数据库密码 | `your_password` |
| `DB_NAME` | 数据库名称 | `redflow_db` |
| `SESSION_SECRET` | Session 密钥 | 随机字符串 |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 后端服务端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `CORS_ORIGIN` | CORS 允许的源 | `http://localhost:5174` |
| `DB_ROOT_PASSWORD` | MySQL root 密码（Docker） | `redflow_root_password` |
| `FRONTEND_PORT` | 前端服务端口（Docker） | `8080` |

### 生成 Session Secret

```bash
# 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -hex 32
```

## 常见问题

### Q1: 数据库连接失败

**问题**: 后端启动时提示数据库连接失败

**解决方案**:
1. 检查 MySQL 服务是否运行
2. 检查 `.env` 中的数据库配置是否正确
3. 检查数据库用户权限
4. 检查防火墙设置

```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 测试数据库连接
mysql -u redflow_user -p -h localhost redflow_db
```

### Q2: Session 不持久化

**问题**: 登录后刷新页面需要重新登录

**解决方案**:
1. 检查 Session 配置中的 `cookie.secure` 设置（生产环境应为 `true`）
2. 检查 CORS 配置，确保 `credentials: true`
3. 检查浏览器 Cookie 设置

### Q3: CORS 错误

**问题**: 前端请求后端 API 时出现 CORS 错误

**解决方案**:
1. 检查 `.env` 中的 `CORS_ORIGIN` 配置
2. 确保前端地址与 `CORS_ORIGIN` 匹配
3. 检查后端 `server.js` 中的 CORS 配置

### Q4: Docker 容器无法启动

**问题**: `docker-compose up` 失败

**解决方案**:
1. 检查端口是否被占用
2. 检查 Docker 和 Docker Compose 版本
3. 查看详细错误日志: `docker-compose logs`

```bash
# 检查端口占用
netstat -tulpn | grep :3000
netstat -tulpn | grep :3306
netstat -tulpn | grep :8080

# 查看容器日志
docker-compose logs mysql
docker-compose logs backend
```

### Q5: 数据库表不存在

**问题**: API 请求时提示表不存在

**解决方案**:
1. 检查数据库是否已初始化
2. 手动执行 schema.sql

```bash
# 检查表是否存在
mysql -u redflow_user -p redflow_db -e "SHOW TABLES;"

# 重新初始化
mysql -u redflow_user -p redflow_db < backend/database/schema.sql
```

### Q6: 前端无法访问后端 API

**问题**: 前端请求 `/api/*` 返回 404 或连接失败

**解决方案**:
1. 检查后端服务是否运行
2. 检查前端 `src/services/api/client.ts` 中的 `API_BASE_URL` 配置
3. 检查 Nginx 配置（如果使用 Nginx）

### Q7: 密码加密错误

**问题**: 注册或登录时提示密码错误

**解决方案**:
1. 检查 `bcrypt` 是否正确安装
2. 检查 Node.js 版本（需要 >= 18）

```bash
# 检查 bcrypt
cd backend
npm list bcrypt

# 重新安装
npm install bcrypt
```

### Q8: 生产环境性能优化

**建议**:
1. 使用 Nginx 反向代理
2. 启用 Gzip 压缩（已配置）
3. 配置数据库连接池（已配置）
4. 使用 CDN 加速静态资源
5. 配置 Redis 缓存（可选）

## 安全建议

### 生产环境安全检查清单

- [ ] 修改默认的 `SESSION_SECRET`
- [ ] 使用强密码作为数据库密码
- [ ] 配置 HTTPS（使用 Let's Encrypt）
- [ ] 限制数据库访问（仅允许应用服务器）
- [ ] 定期备份数据库
- [ ] 配置防火墙规则
- [ ] 启用日志记录和监控
- [ ] 定期更新依赖包

### 配置 HTTPS

使用 Let's Encrypt 配置 HTTPS:

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 监控和维护

### 查看日志

```bash
# Docker 日志
docker-compose logs -f backend
docker-compose logs -f mysql

# PM2 日志（如果使用 PM2）
pm2 logs redflow-backend
```

### 健康检查

```bash
# 后端健康检查
curl http://localhost:3000/health

# 数据库连接检查
docker exec redflow-mysql mysqladmin ping -h localhost -u root -p
```

### 性能监控

建议使用以下工具监控应用性能：

- **PM2**: 进程管理
- **New Relic**: APM 监控
- **Grafana + Prometheus**: 指标监控

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新信息。

## 获取帮助

- 📖 [完整文档](./README.md)
- 🐛 [报告问题](https://github.com/your-username/redflow-v3/issues)
- 💬 [讨论区](https://github.com/your-username/redflow-v3/discussions)

## 许可证

本项目采用 [MIT 许可证](./LICENSE) 开源。

