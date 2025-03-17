const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const axios = require('axios');

// 获取最新消息
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const messages = await Message.getLatestMessages(limit);
    res.json(messages);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ message: '获取消息失败' });
  }
});

// 获取更多历史消息
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const before = req.query.before; // 时间戳，获取此时间之前的消息
    
    let query = {};
    if (before) {
      query.createdAt = { $lt: new Date(parseInt(before)) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
      
    res.json(messages);
  } catch (error) {
    console.error('获取历史消息失败:', error);
    res.status(500).json({ message: '获取历史消息失败' });
  }
});

// 验证reCAPTCHA或Turnstile
async function verifyRecaptcha(token) {
  try {
    // 检查token长度来判断是reCAPTCHA还是Turnstile
    // Turnstile token通常比reCAPTCHA token短
    if (token.length < 100) {
      // 验证Cloudflare Turnstile
      const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // 测试密钥
      const response = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          secret: turnstileSecretKey,
          response: token
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.success;
    } else {
      // 验证Google reCAPTCHA
      const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // 测试密钥
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: recaptchaSecretKey,
            response: token
          }
        }
      );
      
      return response.data.success;
    }
  } catch (error) {
    console.error('验证码验证失败:', error);
    return false;
  }
}

// 发送新消息
router.post('/', async (req, res) => {
  try {
    const { content, author, isAnonymous, recaptchaToken } = req.body;
    
    // 验证reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ message: '人机验证失败，请重试' });
    }
    
    // 验证内容
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '消息内容不能为空' });
    }
    
    // 创建新消息
    const message = new Message({
      content,
      author: isAnonymous ? '匿名信徒' : (author || '匿名信徒'),
      isAnonymous: !!isAnonymous
    });
    
    const savedMessage = await message.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ message: '发送消息失败' });
  }
});

module.exports = router; 