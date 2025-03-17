const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Scientist = require('../models/Scientist');
const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 配置 Cloudinary 存储
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scientists',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // 主图片尺寸限制
    ],
    format: 'jpg', // 统一输出格式
    resource_type: 'auto' // 自动检测资源类型
  }
});

// 文件上传中间件
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('只允许上传 JPG、JPEG、PNG 或 GIF 格式的图片！'), false);
    }
    cb(null, true);
  }
}).single('image');

// 获取所有科学家
router.get('/', async (req, res) => {
  try {
    console.log('收到获取科学家列表请求');
    
    const scientists = await Scientist.find().sort({ createdAt: -1 });
    
    // 为每个科学家生成完整的图片 URL
    const scientistsWithUrls = scientists.map(scientist => {
      const doc = scientist.toObject();
      if (doc.image) {
        if (doc.image.startsWith('http')) {
          // 如果已经是完整的 URL，直接使用
          doc.thumbnail = doc.image;
        } else {
          // 如果是 Cloudinary public_id，生成 URL
          doc.image = cloudinary.url(doc.image);
          doc.thumbnail = cloudinary.url(doc.image, {
            width: 200,
            height: 200,
            crop: 'fill',
            quality: 80
          });
        }
      }
      return doc;
    });
    
    console.log('找到科学家数量:', scientists.length);
    
    // 返回空数组也是正常的
    if (scientists.length === 0) {
      console.log('科学家列表为空，但这是正常的');
    }
    
    return res.status(200).json(scientistsWithUrls);
  } catch (error) {
    console.error('获取科学家列表失败:', error);
    return res.status(500).json({ message: error.message });
  }
});

// 获取单个科学家
router.get('/:id', async (req, res) => {
  try {
    const scientist = await Scientist.findById(req.params.id);
    if (!scientist) {
      return res.status(404).json({ message: '未找到该科学家' });
    }
    
    // 生成完整的图片 URL
    const doc = scientist.toObject();
    if (doc.image) {
      if (doc.image.startsWith('http')) {
        doc.thumbnail = doc.image;
      } else {
        doc.image = cloudinary.url(doc.image);
        doc.thumbnail = cloudinary.url(doc.image, {
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 80
        });
      }
    }
    
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 生成随机颜色
const generateRandomColor = () => {
  const colors = [
    '#3498db', // 蓝色
    '#e74c3c', // 红色
    '#2ecc71', // 绿色
    '#f1c40f', // 黄色
    '#9b59b6', // 紫色
    '#1abc9c', // 青色
    '#e67e22', // 橙色
    '#34495e'  // 深蓝色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 创建新科学家（支持直接数据和文件上传）
router.post('/', async (req, res) => {
  try {
    console.log('收到创建科学家请求');
    console.log('请求体:', req.body);
    console.log('请求头:', req.headers);

    // 使用 Promise 包装 multer 中间件
    await new Promise((resolve, reject) => {
      upload(req, res, function(err) {
        if (err) {
          console.error('文件上传错误:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('文件上传完成，文件信息:', req.file);
    console.log('更新后的请求体:', req.body);

    // 验证必填字段
    if (!req.body.name || !req.body.subject) {
      return res.status(400).json({ message: '姓名和领域为必填项' });
    }

    let scientistData = {
      name: req.body.name,
      subject: req.body.subject,
      color: generateRandomColor()
    };

    // 处理图片
    if (req.file) {
      // 如果是文件上传
      console.log('处理上传的图片文件:', req.file);
      scientistData.image = req.file.path; // Cloudinary 返回的路径
    } else if (req.body.image && req.body.image.startsWith('http')) {
      // 如果是 URL 上传
      console.log('处理图片 URL:', req.body.image);
      scientistData.image = req.body.image;
    } else {
      return res.status(400).json({ message: '请提供图片文件或有效的图片 URL' });
    }

    console.log('准备创建科学家文档:', scientistData);
    const scientist = new Scientist(scientistData);
    
    console.log('保存科学家文档...');
    const newScientist = await scientist.save();
    console.log('科学家文档保存成功');
    
    // 在响应中添加完整的图片 URL
    const response = newScientist.toObject();
    if (!response.image.startsWith('http')) {
      try {
        response.image = cloudinary.url(response.image);
        response.thumbnail = cloudinary.url(response.image, {
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 80
        });
      } catch (urlError) {
        console.error('生成图片 URL 失败:', urlError);
        response.image = '';
        response.thumbnail = '';
      }
    } else {
      response.thumbnail = response.image;
    }
    
    console.log('科学家创建成功:', response);
    res.status(201).json(response);
  } catch (error) {
    console.error('创建科学家失败:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证失败', 
        details: error.message 
      });
    }
    if (error.message.includes('只允许上传')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ 
      message: '创建科学家失败，请重试',
      error: error.message
    });
  }
});

// 更新科学家信息
router.patch('/:id', async (req, res) => {
  try {
    // 使用 Promise 包装 multer 中间件
    await new Promise((resolve, reject) => {
      upload(req, res, function(err) {
        if (err) {
          console.error('文件上传错误:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const scientist = await Scientist.findById(req.params.id);
    if (!scientist) {
      return res.status(404).json({ message: '未找到该科学家' });
    }

    if (req.body.name) scientist.name = req.body.name;
    if (req.body.title) scientist.title = req.body.title;
    if (req.body.description) scientist.description = req.body.description;
    if (req.body.achievements) scientist.achievements = req.body.achievements;
    if (req.body.birthYear) scientist.birthYear = req.body.birthYear;
    if (req.body.deathYear) scientist.deathYear = req.body.deathYear;
    if (req.body.subject) scientist.subject = req.body.subject;
    if (req.body.color) scientist.color = req.body.color;

    if (req.file) {
      // 如果是文件上传
      console.log('处理上传的图片文件:', req.file);
      // 删除旧的 Cloudinary 图片（如果存在）
      if (scientist.image && !scientist.image.startsWith('http')) {
        try {
          await cloudinary.uploader.destroy(scientist.image);
        } catch (deleteError) {
          console.error('删除旧图片失败:', deleteError);
        }
      }
      scientist.image = req.file.path;
    } else if (req.body.image && req.body.image.startsWith('http')) {
      // 如果是 URL 上传
      console.log('处理图片 URL:', req.body.image);
      // 删除旧的 Cloudinary 图片（如果存在）
      if (scientist.image && !scientist.image.startsWith('http')) {
        try {
          await cloudinary.uploader.destroy(scientist.image);
        } catch (deleteError) {
          console.error('删除旧图片失败:', deleteError);
        }
      }
      scientist.image = req.body.image;
    }

    const updatedScientist = await scientist.save();
    
    // 在响应中添加完整的图片 URL
    const response = updatedScientist.toObject();
    if (!response.image.startsWith('http')) {
      try {
        response.image = cloudinary.url(response.image);
        response.thumbnail = cloudinary.url(response.image, {
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 80
        });
      } catch (urlError) {
        console.error('生成图片 URL 失败:', urlError);
        response.image = '';
        response.thumbnail = '';
      }
    } else {
      response.thumbnail = response.image;
    }
    
    res.json(response);
  } catch (error) {
    console.error('更新科学家失败:', error);
    res.status(400).json({ message: error.message });
  }
});

// 删除科学家
router.delete('/:id', async (req, res) => {
  try {
    const scientist = await Scientist.findById(req.params.id);
    if (!scientist) {
      return res.status(404).json({ message: '科学家不存在' });
    }

    // 删除 Cloudinary 上的图片（如果存在）
    if (scientist.image && !scientist.image.startsWith('http')) {
      await cloudinary.uploader.destroy(scientist.image);
    }

    await Scientist.findByIdAndDelete(req.params.id);
    res.json({ message: '科学家已删除' });
  } catch (error) {
    console.error('删除科学家失败:', error);
    res.status(500).json({ message: '删除科学家失败' });
  }
});

module.exports = router; 