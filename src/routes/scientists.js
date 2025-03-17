const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Scientist = require('../models/Scientist');
const sharp = require('sharp');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/scientists';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('只允许上传图片文件！'), false);
    }
    cb(null, true);
  }
});

// 获取所有科学家
router.get('/', async (req, res) => {
  try {
    console.log('收到获取科学家列表请求');
    
    // 添加CORS头
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    
    const scientists = await Scientist.find().sort({ createdAt: -1 });
    console.log('找到科学家数量:', scientists.length);
    
    // 返回空数组也是正常的
    if (scientists.length === 0) {
      console.log('科学家列表为空，但这是正常的');
    }
    
    return res.status(200).json(scientists);
  } catch (error) {
    console.error('获取科学家列表失败:', error);
    // 添加CORS头到错误响应
    res.header('Access-Control-Allow-Origin', '*');
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
    res.json(scientist);
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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('收到创建科学家请求，请求体:', req.body);
    let scientistData = {
      name: req.body.name,
      subject: req.body.subject,
      color: generateRandomColor()
    };
    console.log('处理后的科学家数据:', scientistData);

    if (req.file) {
      console.log('收到图片文件:', req.file);
      // 如果有文件上传，处理图片
      const thumbnailPath = req.file.path.replace(/\.[^/.]+$/, '') + '-thumb.jpg';
      await sharp(req.file.path)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      scientistData.image = `/uploads/scientists/${path.basename(req.file.path)}`;
      scientistData.thumbnail = `/uploads/scientists/${path.basename(thumbnailPath)}`;
      console.log('处理后的图片路径:', { image: scientistData.image, thumbnail: scientistData.thumbnail });
    } else {
      console.log('没有收到图片文件');
      // 如果没有文件上传，使用提供的图片路径
      scientistData.image = req.body.image;
      scientistData.thumbnail = req.body.thumbnail || req.body.image;
    }

    console.log('准备创建科学家文档');
    const scientist = new Scientist(scientistData);
    console.log('保存科学家文档');
    const newScientist = await scientist.save();
    console.log('科学家创建成功:', newScientist);
    res.status(201).json(newScientist);
  } catch (error) {
    console.error('创建科学家失败:', error);
    res.status(400).json({ message: error.message });
  }
});

// 更新科学家信息
router.patch('/:id', upload.single('image'), async (req, res) => {
  try {
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
      // 删除旧图片
      const oldImagePath = path.join('public', scientist.image);
      const oldThumbPath = path.join('public', scientist.thumbnail);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);

      // 生成新缩略图
      const thumbnailPath = req.file.path.replace(/\.[^/.]+$/, '') + '-thumb.jpg';
      await sharp(req.file.path)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      scientist.image = `/uploads/scientists/${path.basename(req.file.path)}`;
      scientist.thumbnail = `/uploads/scientists/${path.basename(thumbnailPath)}`;
    }

    const updatedScientist = await scientist.save();
    res.json(updatedScientist);
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

    // 删除图片文件
    if (scientist.image && scientist.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', 'public', scientist.image);
      const thumbnailPath = path.join(__dirname, '..', 'public', scientist.thumbnail);
      
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      } catch (fileError) {
        console.error('删除图片文件失败:', fileError);
        // 继续执行，即使删除文件失败
      }
    }

    await Scientist.findByIdAndDelete(req.params.id);
    res.json({ message: '科学家已删除' });
  } catch (error) {
    console.error('删除科学家失败:', error);
    res.status(500).json({ message: '删除科学家失败' });
  }
});

module.exports = router; 