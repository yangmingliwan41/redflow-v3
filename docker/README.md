# Docker 部署说明

本项目支持两种Docker部署方式：

## 方式一：Nginx静态文件部署（推荐）

使用Nginx提供静态文件服务，性能好，资源占用少。

### 构建和运行

```bash
# 构建镜像
docker build -f Dockerfile.nginx -t redflow-nginx .

# 运行容器
docker run -d -p 8080:80 --name redflow-nginx redflow-nginx

# 或使用docker-compose
docker-compose -f docker-compose.nginx.yml up -d
```

### 访问

打开浏览器访问：http://localhost:8080

## 方式二：Node.js服务器部署

使用Express提供静态文件服务，便于扩展API功能。

### 构建和运行

```bash
# 构建镜像
docker build -f Dockerfile.node -t redflow-node .

# 运行容器
docker run -d -p 3000:3000 --name redflow-node redflow-node

# 或使用docker-compose
docker-compose -f docker-compose.node.yml up -d
```

### 访问

打开浏览器访问：http://localhost:3000

## 环境变量

### Nginx部署

- `PORT`: 映射端口（默认8080）

### Node.js部署

- `PORT`: 服务器端口（默认3000）
- `NODE_ENV`: 环境变量（默认production）

## 健康检查

两种部署方式都支持健康检查：

- Nginx: http://localhost:8080/health
- Node.js: http://localhost:3000/health

## 注意事项

1. 确保端口未被占用
2. 首次构建可能需要较长时间（下载依赖）
3. 生产环境建议使用HTTPS
4. 如需配置反向代理，请修改相应的配置文件




