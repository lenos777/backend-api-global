import express from 'express';
import TestResult from '../models/TestResult.js';
import Group from '../models/Group.js';
import Student from '../models/Student.js';

const router = express.Router();

// GET /api/test-results - Get all test results with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { groupId, subjectId, published, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (groupId) {
      query.group = groupId;
    }
    
    if (published !== undefined) {
      query.isPublished = published === 'true';
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    let [testResults, total] = await Promise.all([
      TestResult.find(query)
        .populate({
          path: 'group',
          populate: {
            path: 'subject',
            select: 'name teacherName'
          }
        })
        .populate('results.student', 'firstName lastName school grade')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      TestResult.countDocuments(query)
    ]);

    // Filter by subject if specified
    if (subjectId) {
      testResults = testResults.filter(result => 
        result.group.subject._id.toString() === subjectId
      );
      
      // Recalculate total after filtering
      total = testResults.length;
    }
    
    res.json({
      data: testResults,
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
    res.status(500).json({ message: 'Error fetching test results', error: error.message });
  }
});

// GET /api/test-results/:id - Get test result by ID
router.get('/:id', async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id)
      .populate({
        path: 'group',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      })
      .populate('results.student', 'firstName lastName school grade');
    
    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }
    
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching test result', error: error.message });
  }
});

// POST /api/test-results - Create new test result
router.post('/', async (req, res) => {
  try {
    const { group, testName, testDate, results, description, isPublished } = req.body;
    
    if (!group || !testName || !testDate || !results || !Array.isArray(results)) {
      return res.status(400).json({ 
        message: 'Group, test name, test date, and results array are required' 
      });
    }

    // Verify group exists
    const groupExists = await Group.findById(group);
    if (!groupExists) {
      return res.status(400).json({ message: 'Group not found' });
    }

    // Validate results
    for (const result of results) {
      if (!result.student || result.score === undefined || result.score < 0) {
        return res.status(400).json({ 
          message: 'Each result must have a valid student and score (0 or higher)' 
        });
      }
      
      // Verify student exists
      const studentExists = await Student.findById(result.student);
      if (!studentExists) {
        return res.status(400).json({ 
          message: `Student with ID ${result.student} not found` 
        });
      }
    }

    const testResult = new TestResult({
      group,
      testName: testName.trim(),
      testDate: new Date(testDate),
      results,
      description: description?.trim(),
      isPublished: isPublished || false
    });

    const savedTestResult = await testResult.save();
    const populatedTestResult = await TestResult.findById(savedTestResult._id)
      .populate({
        path: 'group',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      })
      .populate('results.student', 'firstName lastName school grade');
    
    res.status(201).json(populatedTestResult);
  } catch (error) {
    res.status(500).json({ message: 'Error creating test result', error: error.message });
  }
});

// PUT /api/test-results/:id - Update test result
router.put('/:id', async (req, res) => {
  try {
    const { group, testName, testDate, results, description, isPublished } = req.body;
    
    if (!group || !testName || !testDate || !results || !Array.isArray(results)) {
      return res.status(400).json({ 
        message: 'Group, test name, test date, and results array are required' 
      });
    }

    // Verify group exists
    const groupExists = await Group.findById(group);
    if (!groupExists) {
      return res.status(400).json({ message: 'Group not found' });
    }

    // Validate results
    for (const result of results) {
      if (!result.student || result.score === undefined || result.score < 0) {
        return res.status(400).json({ 
          message: 'Each result must have a valid student and score (0 or higher)' 
        });
      }
      
      // Verify student exists
      const studentExists = await Student.findById(result.student);
      if (!studentExists) {
        return res.status(400).json({ 
          message: `Student with ID ${result.student} not found` 
        });
      }
    }

    const testResult = await TestResult.findByIdAndUpdate(
      req.params.id,
      {
        group,
        testName: testName.trim(),
        testDate: new Date(testDate),
        results,
        description: description?.trim(),
        isPublished: isPublished !== undefined ? isPublished : false,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'group',
      populate: {
        path: 'subject',
        select: 'name teacherName'
      }
    }).populate('results.student', 'firstName lastName school grade');

    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    res.json(testResult);
  } catch (error) {
    res.status(500).json({ message: 'Error updating test result', error: error.message });
  }
});

// PATCH /api/test-results/:id/publish - Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    
    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    testResult.isPublished = !testResult.isPublished;
    testResult.updatedAt = Date.now();
    
    const updatedTestResult = await testResult.save();
    const populatedTestResult = await TestResult.findById(updatedTestResult._id)
      .populate({
        path: 'group',
        populate: {
          path: 'subject',
          select: 'name teacherName'
        }
      })
      .populate('results.student', 'firstName lastName school grade');

    res.json(populatedTestResult);
  } catch (error) {
    res.status(500).json({ message: 'Error updating publish status', error: error.message });
  }
});

// DELETE /api/test-results/:id - Delete test result
router.delete('/:id', async (req, res) => {
  try {
    const testResult = await TestResult.findByIdAndDelete(req.params.id);
    
    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    res.json({ message: 'Test result deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting test result', error: error.message });
  }
});

export default router;