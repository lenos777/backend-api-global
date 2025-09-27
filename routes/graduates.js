import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Graduate from '../models/Graduate.js';
import Group from '../models/Group.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/graduates/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'graduate-' + uniqueSuffix + path.extname(file.originalname));
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

// Create uploads/graduates directory if it doesn't exist
import fs from 'fs';
const graduatesDir = path.join(__dirname, '../uploads/graduates/');
if (!fs.existsSync(graduatesDir)) {
  fs.mkdirSync(graduatesDir, { recursive: true });
}

// GET /api/graduates - Get all graduates with pagination
router.get('/', async (req, res) => {
  try {
    const { published, admissionType, field, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (published !== undefined) {
      query.isPublished = published === 'true';
    }
    
    if (admissionType && ['grant', 'contract'].includes(admissionType)) {
      query.admissionType = admissionType;
    }
    
    if (field) {
      query.field = new RegExp(field, 'i'); // Case-insensitive search
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [graduates, total] = await Promise.all([
      Graduate.find(query)
        .populate({
          path: 'previousGroup',
          populate: {
            path: 'subject',
            select: 'name teacherName'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Graduate.countDocuments(query)
    ]);
    
    res.json({
      data: graduates,
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
    res.status(500).json({ message: 'Error fetching graduates', error: error.message });
  }
});

// GET /api/graduates/:id - Get graduate by ID
router.get('/:id', async (req, res) => {
  try {
    const graduate = await Graduate.findById(req.params.id)
      .populate({
        path: 'previousGroup',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      });
    
    if (!graduate) {
      return res.status(404).json({ message: 'Graduate not found' });
    }
    
    res.json(graduate);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching graduate', error: error.message });
  }
});

// POST /api/graduates - Create new graduate
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      admissionType, 
      field, 
      university,
      admissionYear,
      previousGroup,
      graduationYear,
      finalScore,
      notes,
      isPublished 
    } = req.body;
    
    if (!firstName || !lastName || !admissionType || !field || !university || !admissionYear) {
      return res.status(400).json({ 
        message: 'First name, last name, admission type, field, university, and admission year are required' 
      });
    }

    // Verify group exists if provided
    if (previousGroup) {
      const groupExists = await Group.findById(previousGroup);
      if (!groupExists) {
        return res.status(400).json({ message: 'Group not found' });
      }
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/graduates/${req.file.filename}`;
    }

    const graduate = new Graduate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      imageUrl,
      admissionType,
      field: field.trim(),
      university: university.trim(),
      admissionYear: parseInt(admissionYear),
      previousGroup: previousGroup || null,
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      finalScore: finalScore ? parseFloat(finalScore) : null,
      notes: notes?.trim(),
      isPublished: isPublished !== undefined ? isPublished === 'true' : true
    });

    const savedGraduate = await graduate.save();
    const populatedGraduate = await Graduate.findById(savedGraduate._id)
      .populate({
        path: 'previousGroup',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      });
    
    res.status(201).json(populatedGraduate);
  } catch (error) {
    res.status(500).json({ message: 'Error creating graduate', error: error.message });
  }
});

// PUT /api/graduates/:id - Update graduate
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      admissionType, 
      field, 
      university,
      admissionYear,
      previousGroup,
      graduationYear,
      finalScore,
      notes,
      isPublished 
    } = req.body;
    
    if (!firstName || !lastName || !admissionType || !field || !university || !admissionYear) {
      return res.status(400).json({ 
        message: 'First name, last name, admission type, field, university, and admission year are required' 
      });
    }

    // Verify group exists if provided
    if (previousGroup) {
      const groupExists = await Group.findById(previousGroup);
      if (!groupExists) {
        return res.status(400).json({ message: 'Group not found' });
      }
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      admissionType,
      field: field.trim(),
      university: university.trim(),
      admissionYear: parseInt(admissionYear),
      previousGroup: previousGroup || null,
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      finalScore: finalScore ? parseFloat(finalScore) : null,
      notes: notes?.trim(),
      isPublished: isPublished !== undefined ? isPublished === 'true' : true,
      updatedAt: Date.now()
    };

    if (req.file) {
      updateData.imageUrl = `/uploads/graduates/${req.file.filename}`;
    }

    const graduate = await Graduate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'previousGroup',
      populate: {
        path: 'subject',
        select: 'name teacherName'
      }
    });

    if (!graduate) {
      return res.status(404).json({ message: 'Graduate not found' });
    }

    res.json(graduate);
  } catch (error) {
    res.status(500).json({ message: 'Error updating graduate', error: error.message });
  }
});

// PATCH /api/graduates/:id/publish - Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const graduate = await Graduate.findById(req.params.id);
    
    if (!graduate) {
      return res.status(404).json({ message: 'Graduate not found' });
    }

    graduate.isPublished = !graduate.isPublished;
    graduate.updatedAt = Date.now();
    
    const updatedGraduate = await graduate.save();
    const populatedGraduate = await Graduate.findById(updatedGraduate._id)
      .populate({
        path: 'previousGroup',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      });

    res.json(populatedGraduate);
  } catch (error) {
    res.status(500).json({ message: 'Error updating publish status', error: error.message });
  }
});

// DELETE /api/graduates/:id - Delete graduate
router.delete('/:id', async (req, res) => {
  try {
    const graduate = await Graduate.findByIdAndDelete(req.params.id);
    
    if (!graduate) {
      return res.status(404).json({ message: 'Graduate not found' });
    }

    // TODO: Delete associated image file if exists
    // if (graduate.imageUrl) {
    //   const imagePath = path.join(__dirname, '../', graduate.imageUrl);
    //   if (fs.existsSync(imagePath)) {
    //     fs.unlinkSync(imagePath);
    //   }
    // }

    res.json({ message: 'Graduate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting graduate', error: error.message });
  }
});

export default router;