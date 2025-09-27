import express from 'express';
import mongoose from 'mongoose';
import Subject from '../models/Subject.js';

const router = express.Router();

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    console.log('Subjects API: GET / chaqirildi');
    
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      return res.status(503).json({ 
        message: 'Database connection unavailable', 
        error: 'MongoDB not connected' 
      });
    }
    
    const subjects = await Subject.find()
      .sort({ createdAt: -1 })
      .maxTimeMS(30000); // 30 second timeout
    console.log(`Subjects API: ${subjects.length} ta fan topildi`);
    
    res.json(subjects);
  } catch (error) {
    console.error('Subjects API xatosi:', error.message);
    
    if (error.name === 'MongoTimeoutError' || error.name === 'MongoServerSelectionError') {
      return res.status(503).json({ 
        message: 'Database connection timeout', 
        error: 'Unable to connect to database' 
      });
    }
    
    res.status(500).json({ message: 'Fanlarni yuklashda xatolik', error: error.message });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Fanni yuklashda xatolik', error: error.message });
  }
});

// POST /api/subjects - Create new subject
router.post('/', async (req, res) => {
  try {
    console.log('Subjects API: POST / chaqirildi', {
      body: req.body,
      dbState: mongoose.connection.readyState
    });
    
    const { name, teacherName, description } = req.body;
    
    if (!name || !teacherName) {
      console.log('Validation failed: missing required fields');
      return res.status(400).json({ message: 'Fan nomi va o\'qituvchi nomi majburiy' });
    }

    // Check for existing subject
    console.log('Checking for existing subject with name:', name.trim());
    const existingSubject = await Subject.findOne({ name: name.trim() }).lean();
    if (existingSubject) {
      console.log('Subject already exists:', existingSubject._id);
      return res.status(400).json({ message: 'Bu nomli fan allaqachon mavjud' });
    }

    console.log('Creating new subject...');
    const subject = new Subject({
      name: name.trim(),
      teacherName: teacherName.trim(),
      description: description?.trim()
    });

    const savedSubject = await subject.save();
    console.log('Subjects API: Yangi fan saqlandi', {
      id: savedSubject._id,
      name: savedSubject.name
    });
    
    res.status(201).json(savedSubject);
  } catch (error) {
    console.error('Subjects API POST xatosi:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.name === 'MongoTimeoutError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        message: 'Database ulanishida muammo. Qayta urinib ko\'ring.', 
        error: 'Database timeout'
      });
    }
    
    res.status(500).json({ message: 'Fan yaratishda xatolik', error: error.message });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', async (req, res) => {
  try {
    const { name, teacherName, description } = req.body;
    
    if (!name || !teacherName) {
      return res.status(400).json({ message: 'Fan nomi va o\'qituvchi nomi majburiy' });
    }

    // Check if another subject with the same name exists
    const existingSubject = await Subject.findOne({ 
      name: name.trim(), 
      _id: { $ne: req.params.id } 
    });
    if (existingSubject) {
      return res.status(400).json({ message: 'Bu nomli fan allaqachon mavjud' });
    }

    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        teacherName: teacherName.trim(),
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Fanni yangilashda xatolik', error: error.message });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }

    res.json({ message: 'Fan muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Fanni o\'chirishda xatolik', error: error.message });
  }
});

export default router;