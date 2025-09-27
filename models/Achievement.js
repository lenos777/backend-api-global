import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 5,
    max: 30
  },
  school: {
    type: String,
    trim: true // Optional school field
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false // Make group optional since we're focusing on individual achievements
  },
  achievementType: {
    type: String,
    required: true,
    enum: ['certificate', 'award', 'medal', 'diploma', 'other'],
    default: 'certificate'
  },
  title: {
    type: String,
    required: true,
    trim: true // Achievement name like "IELTS", "TOEFL", etc.
  },
  level: {
    type: String,
    required: true,
    trim: true // Achievement level like "7.5", "8.0", etc.
  },
  description: {
    type: String,
    trim: true,
    default: '' // Optional description
  },
  imageUrl: {
    type: String,
    trim: true
  },
  achievementDate: {
    type: Date,
    default: Date.now // Auto-set to current date
  },
  organization: {
    type: String,
    trim: true,
    default: '' // Optional organization
  },
  isPublished: {
    type: Boolean,
    default: true
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

achievementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Achievement', achievementSchema);