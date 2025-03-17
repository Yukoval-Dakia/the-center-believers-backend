const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  author: {
    type: String,
    default: '匿名信徒',
    trim: true,
    maxlength: 50
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 按时间倒序排序的静态方法
messageSchema.statics.getLatestMessages = function(limit = 5) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 