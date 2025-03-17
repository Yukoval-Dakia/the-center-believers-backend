const mongoose = require('mongoose');

const scientistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  achievements: [{
    type: String,
    trim: true
  }],
  birthYear: {
    type: Number
  },
  deathYear: {
    type: Number
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: '#3498db'
  },
  image: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
scientistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Scientist = mongoose.model('Scientist', scientistSchema);

module.exports = Scientist; 