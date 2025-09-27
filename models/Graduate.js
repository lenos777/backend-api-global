import mongoose from 'mongoose';

const graduateSchema = new mongoose.Schema({
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
  imageUrl: {
    type: String,
    trim: true
  },
  admissionType: {
    type: String,
    required: true,
    enum: ['grant', 'contract'],
    trim: true
  },
  field: {
    type: String,
    required: true,
    trim: true // e.g., "Computer Science", "Medicine", "Engineering"
  },
  university: {
    type: String,
    required: true,
    trim: true
  },
  admissionYear: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear() + 5
  },
  previousGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  graduationYear: {
    type: Number, // Year they graduated from our center
    min: 2015,
    max: new Date().getFullYear()
  },
  finalScore: {
    type: Number, // Their final test score
    min: 0,
    max: 100
  },
  notes: {
    type: String,
    trim: true
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

graduateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
graduateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
graduateSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model('Graduate', graduateSchema);