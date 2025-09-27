import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes (will be created)
import subjectRoutes from './routes/subjects.js';
import groupRoutes from './routes/groups.js';
import studentRoutes from './routes/students.js';
import testResultRoutes from './routes/testResults.js';
import achievementRoutes from './routes/achievements.js';
import graduateRoutes from './routes/graduates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Shorter timeout for faster fallback
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    });
    
    console.log('MongoDB connected successfully');
    console.log('Database name:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    // In development, you could fall back to local MongoDB
    if (process.env.NODE_ENV === 'development') {
      console.log('Trying to connect to local MongoDB...');
      try {
        await mongoose.connect('mongodb://localhost:27017/global-education-local', {
          serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to local MongoDB');
        return;
      } catch (localError) {
        console.log('Local MongoDB also not available');
      }
    }
    
    console.log('Running in offline mode. Some features may not work.');
    // Don't exit the process, let the server run without database
  }
};

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/subjects', subjectRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/graduates', graduateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[dbStatus] || 'unknown';
  
  res.json({ 
    status: 'OK', 
    message: 'Global Education Center API is running',
    database: {
      status: dbStatusText,
      readyState: dbStatus
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err.stack 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  // Start the server first
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  
  // Then try to connect to database
  await connectDB();
  
  return server;
};

startServer();