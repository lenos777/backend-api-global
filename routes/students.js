import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from '../models/Student.js';
import Group from '../models/Group.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/students/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
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

// Create uploads/students directory if it doesn't exist
import fs from 'fs';
const studentsDir = path.join(__dirname, '../uploads/students/');
if (!fs.existsSync(studentsDir)) {
  fs.mkdirSync(studentsDir, { recursive: true });
}

// GET /api/students - Get all students or students by group with pagination
router.get('/', async (req, res) => {
  try {
    const { groupId, page = 1, limit = 10 } = req.query;
    let query = { isActive: true };
    
    if (groupId) {
      query.group = groupId;
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate({
          path: 'group',
          populate: {
            path: 'subject',
            select: 'name teacherName'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Student.countDocuments(query)
    ]);
    
    res.json({
      data: students,
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
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'group',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
});

// POST /api/students - Create new student
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { firstName, lastName, school, grade, group, parentContact, notes } = req.body;
    
    if (!firstName || !lastName || !school || !grade || !group) {
      return res.status(400).json({ 
        message: 'First name, last name, school, grade, and group are required' 
      });
    }

    // Verify group exists
    const groupExists = await Group.findById(group);
    if (!groupExists) {
      return res.status(400).json({ message: 'Group not found' });
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/students/${req.file.filename}`;
    }

    const student = new Student({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      school: school.trim(),
      grade: grade.trim(),
      group,
      parentContact: parentContact?.trim(),
      notes: notes?.trim(),
      imageUrl
    });

    const savedStudent = await student.save();
    const populatedStudent = await Student.findById(savedStudent._id)
      .populate({
        path: 'group',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      });
    
    res.status(201).json(populatedStudent);
  } catch (error) {
    res.status(500).json({ message: 'Error creating student', error: error.message });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { firstName, lastName, school, grade, group, parentContact, notes, isActive } = req.body;
    
    if (!firstName || !lastName || !school || !grade || !group) {
      return res.status(400).json({ 
        message: 'First name, last name, school, grade, and group are required' 
      });
    }

    // Verify group exists
    const groupExists = await Group.findById(group);
    if (!groupExists) {
      return res.status(400).json({ message: 'Group not found' });
    }

    // Prepare update data
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      school: school.trim(),
      grade: grade.trim(),
      group,
      parentContact: parentContact?.trim(),
      notes: notes?.trim(),
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: Date.now()
    };

    // Handle image upload if provided
    if (req.file) {
      updateData.imageUrl = `/uploads/students/${req.file.filename}`;
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'group',
      populate: {
        path: 'subject',
        select: 'name teacherName'
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
});

// DELETE /api/students/:id - Delete (deactivate) student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating student', error: error.message });
  }
});

// DELETE /api/students/:id/permanent - Permanently delete student
router.delete('/:id/permanent', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error permanently deleting student', error: error.message });
  }
});

export default router;