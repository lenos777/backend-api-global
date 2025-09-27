import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  teacherName: {
    type: String,
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  description: {
    type: String,
    trim: true
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

groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique group names per subject
groupSchema.index({ name: 1, subject: 1 }, { unique: true });

export default mongoose.model('Group', groupSchema);