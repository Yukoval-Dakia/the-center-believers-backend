const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const cheerio = require('cheerio');
const path = require('path');
const scientistsRouter = require('./routes/scientists');
const messagesRouter = require('./routes/messages');
const ACG_IMAGES = require('./acg-images.json');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const WP_URL = process.env.WP_URL || 'http://wordpress:80';

// ACG图片源配置
const ACG_GITHUB_API = 'https://api.github.com/repos/jyeric/acg-pictures/contents';
let acgImageList = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1小时缓存

// 使用 CDN 加速 GitHub raw 内容
function convertToCDN(githubUrl, country) {
  if (country === 'CN') {
    return githubUrl
      .replace('https://raw.githubusercontent.com', 'https://cdn.jsdmirror.com/gh')
      .replace('/master/', '/');
      console.log('使用中国CDN:', githubUrl);
  } else {
    return githubUrl
      .replace('https://raw.githubusercontent.com', 'https://cdn.jsdelivr.net/gh')
      .replace('/master/', '/');
      console.log('使用外国CDN:', githubUrl);
  }
}

// 获取ACG图片列表
const fetchACGImageList = async () => {
  try {
    // 如果缓存有效且存在图片列表，直接返回
    if (acgImageList && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      return acgImageList;
    }

    console.log('从GitHub获取ACG图片列表...');
    const response = await axios.get(ACG_GITHUB_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    // 过滤出图片文件（排除.url文件和其他非图片文件）
    const images = response.data
      .filter(file => /\.(jpg|jpeg|png)$/i.test(file.name) && !file.name.endsWith('.url'))
      .map(file => file.download_url);

    acgImageList = images;
    lastFetchTime = Date.now();
    console.log(`成功获取 ${images.length} 张ACG图片`);
    return images;
  } catch (error) {
    console.error('获取ACG图片列表失败:', error);
    // 如果有缓存的图片列表，使用缓存
    if (acgImageList) {
      console.log('使用缓存的图片列表');
      return acgImageList;
    }
    throw error;
  }
};

// 获取随机ACG图片
const getRandomImage = async (country) => {
  try {
    // 直接从预加载的列表中随机选择
    const randomImage = ACG_IMAGES[Math.floor(Math.random() * ACG_IMAGES.length)];
    // 使用 jsDelivr CDN
    return convertToCDN(randomImage, country);
  } catch (error) {
    console.error('获取随机图片失败:', error);
    // 如果出错则使用 Picsum 作为后备
    return 'https://picsum.photos/800/400';
  }
};

// 预热图片缓存
fetchACGImageList().catch(console.error);

// 请求日志中间件
app.use((req, res, next) => {
  console.log('收到请求:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  const country = req.headers['cf-ipcountry'];
  console.log('国家:', country);
  // 使用 convertToCDN 函数时传入 country 参数
  // 例如：const cdnUrl = convertToCDN(someGithubUrl, country);
  next();
});

// 处理OPTIONS预检请求
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('收到OPTIONS预检请求');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.status(200).end();
    return;
  }
  next();
});

// CORS配置
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
  'https://yukoval-dakia.github.io',
  'http://localhost:3000',
  'https://worship.yukovalstudios.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('不允许的来源:', origin);
      callback(new Error('不允许的来源'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 预检请求结果缓存24小时
}));

// 基本中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static('public'));

// API路由
app.use('/api/scientists', scientistsRouter);
app.use('/api/messages', messagesRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  if (err.message === '不允许的来源') {
    return res.status(403).json({
      message: '不允许的来源',
      error: err.message
    });
  }
  res.status(500).json({
    message: '服务器内部错误',
    error: err.message
  });
});

console.log('启动服务器...');
console.log('环境变量:', {
  PORT,
  WP_URL,
  NODE_ENV: process.env.NODE_ENV
});

// MongoDB连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/center-believer';

const connectWithRetry = () => {
  console.log('尝试连接MongoDB:', MONGODB_URI);
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 2000,
  })
    .then(() => {
      console.log('MongoDB连接成功');
      // 在MongoDB连接成功后启动服务器
      const server = app.listen(PORT, () => {
        console.log(`服务器运行在端口：${PORT}`);
        console.log(`WordPress URL: ${WP_URL}`);
        console.log('CORS origin:', 'http://localhost:3000');
      });

      // 处理进程信号
      process.on('', () => {
        console.log('收到  信号，正在关闭服务器...');
        server.close(() => {
          console.log('服务器已关闭');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('收到 SIGINT 信号，正在关闭服务器...');
        server.close(() => {
          console.log('服务器已关闭');
          process.exit(0);
        });
      });
    })
    .catch((error) => {
      console.error('MongoDB连接失败:', error);
      console.log('5秒后重试连接...');
      setTimeout(connectWithRetry, 5000);
    });
};

// 监听MongoDB连接事件
mongoose.connection.on('error', (err) => {
  console.error('MongoDB连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB连接断开，尝试重新连接...');
  setTimeout(connectWithRetry, 5000);
});

connectWithRetry();

// 内容优化函数
const optimizeContent = (content) => {
  const $ = cheerio.load(content);
  
  // 优化图片
  $('img').each((i, elem) => {
    const img = $(elem);
    // 添加懒加载
    img.attr('loading', 'lazy');
    // 添加alt属性（如果没有）
    if (!img.attr('alt')) {
      img.attr('alt', '图片');
    }
    // 添加响应式类
    img.addClass('responsive-image');
  });
  
  // 优化链接
  $('a').each((i, elem) => {
    const link = $(elem);
    const href = link.attr('href');
    if (href && !href.startsWith('/') && !href.startsWith('#')) {
      // 外部链接
      link.attr('target', '_blank');
      link.attr('rel', 'noopener noreferrer');
      // 添加外部链接图标类
      link.addClass('external-link');
    }
  });
  
  // 优化标题
  $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
    const heading = $(elem);
    // 添加锚点链接
    const id = heading.text().toLowerCase().replace(/\s+/g, '-');
    heading.attr('id', id);
  });
  
  // 优化表格
  $('table').each((i, elem) => {
    const table = $(elem);
    // 添加响应式表格包装
    table.wrap('<div class="table-responsive"></div>');
    table.addClass('table');
  });
  
  // 优化代码块
  $('pre').each((i, elem) => {
    const pre = $(elem);
    pre.addClass('code-block');
  });
  
  return $.html();
};

// API路由
app.get('/api/health', (req, res) => {
  console.log('收到健康检查请求');
  res.json({ status: 'ok', message: '拜中心会后端API服务正常运行' });
});

// WordPress内容API
app.get('/api/wordpress/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!WP_URL) {
      throw new Error('WordPress URL 未配置');
    }
    
    // 从 WP_URL 中提取域名
    const wpDomain = new URL(WP_URL).hostname;
    const apiUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${wpDomain}/posts?type=page&slug=${slug}`;
    
    console.log('请求WordPress.com API:', apiUrl);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }).catch(error => {
      console.error('WordPress.com API请求失败:', error.message);
      if (error.response) {
        throw new Error(`WordPress返回错误: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('无法连接到WordPress服务器');
      } else {
        throw error;
      }
    });
    
    if (!response.data || !response.data.posts || response.data.posts.length === 0) {
      return res.status(404).json({ 
        message: '未找到页面内容',
        slug: slug
      });
    }
    
    const page = response.data.posts[0];
    if (page.content) {
      page.content = optimizeContent(page.content);
    }
    
    // 转换数据格式以匹配前端期望的格式
    const formattedPage = {
      id: page.ID,
      title: {
        rendered: page.title
      },
      content: {
        rendered: page.content
      },
      featured_media: page.featured_image || await getRandomImage(),
      _embedded: {
        author: [{
          name: page.author ? page.author.name : '未知作者'
        }]
      }
    };
    
    res.json(formattedPage);
  } catch (error) {
    console.error('WordPress API错误:', error.message);
    res.status(500).json({ 
      message: '无法获取WordPress内容', 
      error: error.message
    });
  }
});

// 获取最新新闻
app.get('/api/wordpress/posts', async (req, res) => {
  try {
    if (!WP_URL) {
      throw new Error('WordPress URL 未配置');
    }

    // 从 WP_URL 中提取域名
    const wpDomain = new URL(WP_URL).hostname;
    const apiUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${wpDomain}/posts`;
    
    console.log('尝试访问WordPress.com API:', apiUrl);

    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('WordPress.com API响应:', JSON.stringify(response.data, null, 2));
    
    if (!response.data || !response.data.posts) {
      console.error('WordPress.com响应无数据');
      return res.status(404).json({ 
        message: '未找到文章',
        error: 'WordPress.com响应无数据'
      });
    }

    // 转换数据格式以匹配前端期望的格式，并处理缺失的封面图片
    const formattedPosts = await Promise.all(response.data.posts.map(async post => {
      let featured_image = post.featured_image;
      
      // 如果没有封面图片，获取随机图片
      if (!featured_image) {
        console.log(`文章 ${post.ID} 没有封面图片，尝试获取随机图片`);
        featured_image = await getRandomImage();
        console.log(`文章 ${post.ID} 使用随机图片:`, featured_image);
      }

      return {
        ID: post.ID,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        date: post.date,
        featured_image: featured_image,
        author: {
          name: post.author ? post.author.name : '未知作者'
        }
      };
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('处理WordPress.com文章时出错:', error);
    res.status(500).json({
      message: '获取文章列表失败',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取单个文章
app.get('/api/wordpress/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!WP_URL) {
      throw new Error('WordPress URL 未配置');
    }

    // 从 WP_URL 中提取域名
    const wpDomain = new URL(WP_URL).hostname;
    const apiUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${wpDomain}/posts/${id}`;

    console.log('尝试获取WordPress.com文章:', apiUrl);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('WordPress.com API单篇文章响应:', JSON.stringify(response.data, null, 2));
    
    if (!response.data) {
      return res.status(404).json({ message: '未找到文章' });
    }

    // 如果没有封面图片，获取随机图片
    let featured_image = response.data.featured_image;
    if (!featured_image) {
      console.log(`文章 ${id} 没有封面图片，尝试获取随机图片`);
      featured_image = await getRandomImage();
      console.log(`文章 ${id} 使用随机图片:`, featured_image);
    }

    // 转换数据格式以匹配前端期望的格式
    const formattedPost = {
      ID: response.data.ID,
      title: response.data.title,
      content: response.data.content,
      date: response.data.date,
      featured_image: featured_image,
      author: {
        name: response.data.author ? response.data.author.name : '未知作者'
      }
    };
    
    res.json(formattedPost);
  } catch (error) {
    console.error('WordPress.com API错误:', error);
    res.status(500).json({ 
      message: '无法获取文章内容', 
      error: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
  }
}); 
