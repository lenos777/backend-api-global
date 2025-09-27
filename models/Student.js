import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  school: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    required: true,
    trim: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  parentContact: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  isActive: {
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

studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
studentSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model('Student', studentSchema);