import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true  // Add index for faster queries
  },
  teacherName: {
    type: String,
    required: true,
    trim: true,
    index: true  // Add index for faster queries
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true  // Add index for sorting
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

subjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add compound index for better query performance
subjectSchema.index({ name: 1, teacherName: 1 });
subjectSchema.index({ createdAt: -1 });

export default mongoose.model('Subject', subjectSchema);