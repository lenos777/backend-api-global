import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Achievement from '../models/Achievement.js';
import Group from '../models/Group.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/achievements/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'achievement-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create uploads/achievements directory if it doesn't exist
import fs from 'fs';
const achievementsDir = path.join(__dirname, '../uploads/achievements/');
if (!fs.existsSync(achievementsDir)) {
  fs.mkdirSync(achievementsDir, { recursive: true });
}

// GET /api/achievements - Get all achievements with pagination
router.get('/', async (req, res) => {
  try {
    console.log('Achievements API: GET / chaqirildi');
    
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      return res.status(503).json({ 
        message: 'Database connection unavailable', 
        error: 'MongoDB not connected' 
      });
    }
    
    const { published, groupId, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (published !== undefined) {
      query.isPublished = published === 'true';
    }
    
    if (groupId) {
      query.group = groupId;
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [achievements, total] = await Promise.all([
      Achievement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .maxTimeMS(30000), // 30 second timeout
      Achievement.countDocuments(query)
    ]);
    
    console.log(`Achievements API: ${achievements.length} ta yutuq topildi`);
    res.json({
      data: achievements,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Achievements API xatosi:', error.message);
    
    if (error.name === 'MongoTimeoutError' || error.name === 'MongoServerSelectionError') {
      return res.status(503).json({ 
        message: 'Database connection timeout', 
        error: 'Unable to connect to database' 
      });
    }
    
    res.status(500).json({ message: 'Error fetching achievements', error: error.message });
  }
});

// GET /api/achievements/:id - Get achievement by ID
router.get('/:id', async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    res.json(achievement);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching achievement', error: error.message });
  }
});

// POST /api/achievements - Create new achievement
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { 
      studentName, 
      age, 
      school,
      title, 
      level
    } = req.body;
    
    // Only studentName, age, title, and level are required
    if (!studentName || !age || !title || !level) {
      return res.status(400).json({ 
        message: 'Student name, age, title, and level are required' 
      });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/achievements/${req.file.filename}`;
    }

    const achievement = new Achievement({
      studentName: studentName.trim(),
      age: parseInt(age),
      school: school?.trim() || '',
      title: title.trim(),
      level: level.trim(),
      imageUrl,
      achievementDate: new Date(), // Auto-set to current date
      isPublished: true // Auto-publish new achievements
    });

    const savedAchievement = await achievement.save();
    
    res.status(201).json(savedAchievement);
  } catch (error) {
    res.status(500).json({ message: 'Error creating achievement', error: error.message });
  }
});

// PUT /api/achievements/:id - Update achievement
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { 
      studentName, 
      age, 
      school,
      title, 
      level,
      isPublished 
    } = req.body;
    
    if (!studentName || !age || !title || !level) {
      return res.status(400).json({ 
        message: 'Student name, age, title, and level are required' 
      });
    }

    const updateData = {
      studentName: studentName.trim(),
      age: parseInt(age),
      school: school?.trim() || '',
      title: title.trim(),
      level: level.trim(),
      isPublished: isPublished !== undefined ? isPublished === 'true' : true,
      updatedAt: Date.now()
    };

    if (req.file) {
      updateData.imageUrl = `/uploads/achievements/${req.file.filename}`;
    }

    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    res.json(achievement);
  } catch (error) {
    res.status(500).json({ message: 'Error updating achievement', error: error.message });
  }
});

// PATCH /api/achievements/:id/publish - Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    achievement.isPublished = !achievement.isPublished;
    achievement.updatedAt = Date.now();
    
    const updatedAchievement = await achievement.save();

    res.json(updatedAchievement);
  } catch (error) {
    res.status(500).json({ message: 'Error updating publish status', error: error.message });
  }
});

// DELETE /api/achievements/:id - Delete achievement
router.delete('/:id', async (req, res) => {
  try {
    const achievement = await Achievement.findByIdAndDelete(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // TODO: Delete associated image file if exists
    // if (achievement.imageUrl) {
    //   const imagePath = path.join(__dirname, '../', achievement.imageUrl);
    //   if (fs.existsSync(imagePath)) {
    //     fs.unlinkSync(imagePath);
    //   }
    // }

    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting achievement', error: error.message });
  }
});

export default router;