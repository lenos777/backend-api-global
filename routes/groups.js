import express from 'express';
import Group from '../models/Group.js';
import Subject from '../models/Subject.js';

const router = express.Router();

// GET /api/groups - Get all groups or groups by subject
router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = {};
    
    if (subjectId) {
      query.subject = subjectId;
    }

    const groups = await Group.find(query)
      .populate('subject', 'name teacherName')
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
});

// GET /api/groups/:id - Get group by ID
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('subject', 'name teacherName');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group', error: error.message });
  }
});

// POST /api/groups - Create new group
router.post('/', async (req, res) => {
  try {
    const { name, teacherName, subject, description } = req.body;
    
    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required' });
    }

    // Verify subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({ message: 'Subject not found' });
    }

    // Check if group name already exists for this subject
    const existingGroup = await Group.findOne({ name: name.trim(), subject });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group with this name already exists for this subject' });
    }

    const group = new Group({
      name: name.trim(),
      teacherName: teacherName?.trim(),
      subject,
      description: description?.trim()
    });

    const savedGroup = await group.save();
    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('subject', 'name teacherName');
    
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', async (req, res) => {
  try {
    const { name, teacherName, subject, description } = req.body;
    
    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required' });
    }

    // Verify subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({ message: 'Subject not found' });
    }

    // Check if another group with the same name exists for this subject
    const existingGroup = await Group.findOne({ 
      name: name.trim(), 
      subject,
      _id: { $ne: req.params.id } 
    });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group with this name already exists for this subject' });
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        teacherName: teacherName?.trim(),
        subject,
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('subject', 'name teacherName');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error updating group', error: error.message });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group', error: error.message });
  }
});

export default router;