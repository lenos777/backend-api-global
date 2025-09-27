import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  testName: {
    type: String,
    required: true,
    trim: true
  },
  testDate: {
    type: Date,
    required: true
  },
  results: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      default: 100,
      min: 1
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  averageScore: {
    type: Number,
    min: 0,
    max: 100
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
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

testResultSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate average score and total students
  if (this.results && this.results.length > 0) {
    // Calculate percentage for each result if not provided
    this.results.forEach(result => {
      if (!result.percentage && result.score !== undefined && result.maxScore) {
        result.percentage = Math.round((result.score / result.maxScore) * 100);
      }
    });
    
    // Calculate average based on percentages
    const totalPercentage = this.results.reduce((sum, result) => {
      return sum + (result.percentage || Math.round((result.score / (result.maxScore || 100)) * 100));
    }, 0);
    this.averageScore = totalPercentage / this.results.length;
    this.totalStudents = this.results.length;
  } else {
    this.averageScore = 0;
    this.totalStudents = 0;
  }
  
  next();
});

export default mongoose.model('TestResult', testResultSchema);