# 拜中心会后端服务 (Stone)

这是拜中心会的后端服务，提供API接口支持前端应用。

## 项目描述

本项目是一个基于Node.js的RESTful API服务，为拜中心会应用提供数据支持。主要功能包括:
- 科学家信息管理
- 消息处理
- ACG图片资源获取

## 技术栈

### 主要框架和库
- **Express**: 基于Node.js的Web应用框架
- **Mongoose**: MongoDB对象模型工具
- **Axios**: 基于Promise的HTTP客户端
- **Cheerio**: 用于服务器端的HTML解析库
- **Cloudinary**: 云图片存储服务
- **dotenv**: 环境变量管理
- **Multer**: 文件上传中间件

### 开发工具
- **Nodemon**: 开发时自动重启服务器

## 开源项目依赖

本项目使用了以下开源项目:

| 项目名称 | 版本 | 描述 | 许可证 |
|---------|------|------|-------|
| [Express](https://expressjs.com/) | ^4.18.2 | Web应用框架 | MIT |
| [Mongoose](https://mongoosejs.com/) | ^8.1.3 | MongoDB对象模型工具 | MIT |
| [Axios](https://axios-http.com/) | ^1.6.7 | 基于Promise的HTTP客户端 | MIT |
| [Cheerio](https://cheerio.js.org/) | ^1.0.0-rc.12 | 服务器端的jQuery实现，用于HTML解析 | MIT |
| [Cloudinary](https://cloudinary.com/) | ^1.41.3 | 云图像和视频管理服务 | MIT |
| [CORS](https://github.com/expressjs/cors) | ^2.8.5 | Express中间件，启用CORS | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.4.5 | 从.env文件加载环境变量 | BSD-2-Clause |
| [Multer](https://github.com/expressjs/multer) | ^1.4.5-lts.1 | 处理multipart/form-data的中间件 | MIT |
| [Multer Storage Cloudinary](https://github.com/affanshahid/multer-storage-cloudinary) | ^4.0.0 | Cloudinary的Multer存储引擎 | MIT |
| [Sharp](https://sharp.pixelplumbing.com/) | ^0.33.2 | 高性能Node.js图像处理库 | Apache-2.0 |
| [Nodemon](https://nodemon.io/) | ^3.0.3 | 监视文件变化并自动重启服务器 | MIT |

## 运行环境要求
- Node.js >= 18.0.0

## 安装和启动

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## Docker支持
项目包含Dockerfile，可以构建Docker镜像:
```bash
docker build -t center-believer-backend .
docker run -p 5000:5000 center-believer-backend
```

## 环境变量配置
创建一个.env文件在项目根目录，参考以下配置:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/centerbeliever
WP_URL=http://wordpress:80
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 接口文档
API接口包括科学家信息管理和消息处理等功能，详细文档请参考代码中的路由定义。

## 许可证

本项目采用MIT许可证。详情请参阅[LICENSE](LICENSE)文件。