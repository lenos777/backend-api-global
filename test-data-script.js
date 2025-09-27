import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import Group from './models/Group.js';
import Student from './models/Student.js';
import TestResult from './models/TestResult.js';
import Achievement from './models/Achievement.js';
import Graduate from './models/Graduate.js';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education-platform');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleSubjects = [
  { name: 'Matematika', teacherName: 'Rustam Aliyev', description: 'Algebra va geometriya asoslari' },
  { name: 'Fizika', teacherName: 'Malika Karimova', description: 'Mexanika va elektr fizikasi' },
  { name: 'Kimyo', teacherName: 'Davron Saidov', description: 'Organik va noorganik kimyo' },
  { name: 'Ingliz tili', teacherName: 'Sarah Johnson', description: 'Grammar va conversation' },
  { name: 'Biologiya', teacherName: 'Nigora Yusupova', description: 'Inson biologiyasi va ekologiya' },
  { name: 'Geografiya', teacherName: 'Oybek Abdullayev', description: 'Yer geografiyasi va ekologiya' },
  { name: 'Tarix', teacherName: 'Zarina Rahimova', description: 'O\'zbekiston va jahon tarixi' },
  { name: 'Adabiyot', teacherName: 'Gulnora Toshmatova', description: 'O\'zbek va jahon adabiyoti' }
];

const sampleStudents = [
  { firstName: 'Ali', lastName: 'Karimov', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-05-15') },
  { firstName: 'Madina', lastName: 'Yusupova', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-03-22') },
  { firstName: 'Sardor', lastName: 'Abdullayev', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-07-10') },
  { firstName: 'Dilfuza', lastName: 'Rahimova', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-01-18') },
  { firstName: 'Bobur', lastName: 'Toshmatov', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-09-05') },
  { firstName: 'Zilola', lastName: 'Saidova', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-11-30') },
  { firstName: 'Javohir', lastName: 'Aliyev', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-04-12') },
  { firstName: 'Malika', lastName: 'Umarova', school: '25-maktab', grade: '10-sinf', birthDate: new Date('2008-06-25') },
  { firstName: 'Aziz', lastName: 'Nematov', school: '12-maktab', grade: '11-sinf', birthDate: new Date('2007-08-14') },
  { firstName: 'Sitora', lastName: 'Mahmudova', school: '12-maktab', grade: '11-sinf', birthDate: new Date('2007-12-03') },
  { firstName: 'Otabek', lastName: 'Hasanov', school: '12-maktab', grade: '11-sinf', birthDate: new Date('2007-02-28') },
  { firstName: 'Iroda', lastName: 'Kamilova', school: '12-maktab', grade: '11-sinf', birthDate: new Date('2007-10-17') },
  { firstName: 'Nodir', lastName: 'Ergashev', school: '7-maktab', grade: '9-sinf', birthDate: new Date('2009-03-08') },
  { firstName: 'Mohira', lastName: 'Qodirov', school: '7-maktab', grade: '9-sinf', birthDate: new Date('2009-05-20') },
  { firstName: 'Jasur', lastName: 'Mirzoev', school: '7-maktab', grade: '9-sinf', birthDate: new Date('2009-07-11') }
];

const generateTestResults = (students, maxScore = 100) => {
  return students.map(student => ({
    student: student._id,
    score: Math.floor(Math.random() * (maxScore - 40) + 40), // Random score between 40-100
    maxScore: maxScore,
    notes: Math.random() > 0.7 ? 'Yaxshi ishladi' : undefined
  }));
};

const createTestData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      TestResult.deleteMany({}),
      Group.deleteMany({}),
      Student.deleteMany({}),
      Subject.deleteMany({}),
      Achievement.deleteMany({}),
      Graduate.deleteMany({})
    ]);

    // Create subjects
    console.log('Creating subjects...');
    const subjects = await Subject.insertMany(sampleSubjects);
    console.log(`Created ${subjects.length} subjects`);

    // Create groups first (without students)
    console.log('Creating groups...');
    const groups = [];
    for (const subject of subjects) {
      const group1 = new Group({
        name: `${subject.name}-Guruh-A`,
        subject: subject._id,
        students: [], // We'll add students later
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-31'),
        description: `${subject.name} fani bo'yicha A guruh`
      });
      groups.push(await group1.save());

      const group2 = new Group({
        name: `${subject.name}-Guruh-B`,
        subject: subject._id,
        students: [], // We'll add students later
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-31'),
        description: `${subject.name} fani bo'yicha B guruh`
      });
      groups.push(await group2.save());
    }
    console.log(`Created ${groups.length} groups`);

    // Create students and assign them to groups
    console.log('Creating students...');
    const students = [];
    
    console.log('Groups available:', groups.length);
    
    for (let i = 0; i < sampleStudents.length; i++) {
      const studentData = sampleStudents[i];
      const groupIndex = i % groups.length; // Distribute students across groups
      const targetGroup = groups[groupIndex];
      
      console.log(`Creating student ${i + 1}, assigning to group ${groupIndex}`);
      
      if (!targetGroup) {
        console.error(`Target group at index ${groupIndex} is undefined`);
        continue;
      }
      
      const student = new Student({
        ...studentData,
        group: targetGroup._id
      });
      const savedStudent = await student.save();
      students.push(savedStudent);
      
      // Add student to the group's students array
      if (!targetGroup.students) {
        targetGroup.students = [];
      }
      targetGroup.students.push(savedStudent._id);
    }
    
    // Update groups with their students
    console.log('Updating groups with students...');
    for (const group of groups) {
      await group.save();
    }
    
    console.log(`Created ${students.length} students`);
    console.log('Updated groups with students');

    // Create test results
    console.log('Creating test results...');
    const testResults = [];
    
    for (const group of groups) {
      // Get students for this group
      const groupStudents = students.filter(student => 
        student.group && student.group.toString() === group._id.toString()
      );
      
      console.log(`Creating tests for group ${group.name} with ${groupStudents.length} students`);
      
      if (groupStudents.length === 0) {
        console.log(`Skipping group ${group.name} - no students`);
        continue;
      }

      // Create 2-3 test results per group
      const testCount = Math.floor(Math.random() * 2) + 2; // 2-3 tests
      
      for (let i = 1; i <= testCount; i++) {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - Math.floor(Math.random() * 60)); // Random date within last 60 days
        
        const testResult = new TestResult({
          group: group._id,
          testName: `${i}-test (${Math.floor(Math.random() * 3) + 1}-modul)`,
          testDate: testDate,
          results: generateTestResults(groupStudents),
          description: `${group.name} guruhi uchun ${i}-test natijalari`,
          isPublished: Math.random() > 0.2 // 80% chance to be published
        });
        
        const savedTestResult = await testResult.save();
        testResults.push(savedTestResult);
      }
    }
    console.log(`Created ${testResults.length} test results`);

    // Create achievements
    console.log('Creating achievements...');
    const achievements = [
      {
        studentName: `${students[0].firstName} ${students[0].lastName}`,
        age: 16,
        group: students[0].group,
        achievementType: 'award',
        title: 'Eng yaxshi o\'quvchi',
        level: '1st Place',
        description: 'Barcha fanlar bo\'yicha eng yuqori natijalar',
        achievementDate: new Date('2024-11-15'),
        organization: 'Ta\'lim markazi',
        isPublished: true
      },
      {
        studentName: `${students[1].firstName} ${students[1].lastName}`,
        age: 16,
        group: students[1].group,
        achievementType: 'medal',
        title: 'Matematika bo\'yicha g\'olib',
        level: 'Gold Medal',
        description: 'Matematika olimpiadasida 1-o\'rin',
        achievementDate: new Date('2024-10-20'),
        organization: 'Respublika olimpiadasi',
        isPublished: true
      },
      {
        studentName: `${students[2].firstName} ${students[2].lastName}`,
        age: 16,
        group: students[2].group,
        achievementType: 'certificate',
        title: 'Ingliz tili sertifikati',
        level: 'B2 Level',
        description: 'IELTS 7.0 natijasi',
        achievementDate: new Date('2024-09-30'),
        organization: 'British Council',
        isPublished: true
      }
    ];
    
    const createdAchievements = await Achievement.insertMany(achievements);
    console.log(`Created ${createdAchievements.length} achievements`);

    // Create graduates
    console.log('Creating graduates...');
    const graduates = [
      {
        firstName: 'Muhammadali',
        lastName: 'Qodirov',
        imageUrl: '/images/graduates/muhammadali.jpg',
        admissionType: 'grant',
        field: 'Computer Science',
        university: 'TATU',
        admissionYear: 2023,
        graduationYear: 2023,
        finalScore: 95.5,
        notes: 'Matematika olimpiadasi g\'olibi, IELTS 8.0',
        isPublished: true
      },
      {
        firstName: 'Zarina',
        lastName: 'Abdullayeva',
        imageUrl: '/images/graduates/zarina.jpg',
        admissionType: 'grant',
        field: 'Physics',
        university: 'Harvard University',
        admissionYear: 2023,
        graduationYear: 2023,
        finalScore: 98.0,
        notes: 'Fizika bo\'yicha xalqaro olimpiada, SAT 1580',
        isPublished: true
      },
      {
        firstName: 'Doston',
        lastName: 'Yusupov',
        imageUrl: '/images/graduates/doston.jpg',
        admissionType: 'grant',
        field: 'Computer Engineering',
        university: 'MIT',
        admissionYear: 2022,
        graduationYear: 2022,
        finalScore: 96.8,
        notes: 'Informatika olimpiadasi, Google Code Jam finalist',
        isPublished: true
      }
    ];
    
    const createdGraduates = await Graduate.insertMany(graduates);
    console.log(`Created ${createdGraduates.length} graduates`);

    console.log('\n✅ Test data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Subjects: ${subjects.length}`);
    console.log(`   Students: ${students.length}`);
    console.log(`   Groups: ${groups.length}`);
    console.log(`   Test Results: ${testResults.length}`);
    console.log(`   Achievements: ${createdAchievements.length}`);
    console.log(`   Graduates: ${createdGraduates.length}`);
    
    // Show published test results
    const publishedTests = testResults.filter(t => t.isPublished);
    console.log(`\n📢 Published Test Results: ${publishedTests.length}`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
};

const main = async () => {
  await connectDB();
  await createTestData();
  mongoose.connection.close();
  console.log('\n🔄 Database connection closed.');
  process.exit(0);
};

// Run the script
main().catch(console.error);