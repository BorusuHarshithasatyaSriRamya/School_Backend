import mongoose from 'mongoose';
import Attendance from './models/attendance.model.js';
import TeacherAttendance from './models/TeacherAttendance.js';
import Student from './models/student.model.js';
import Teacher from './models/teacher.model.js';

async function addSampleAttendanceData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/edureach');
    console.log('Connected to MongoDB');
    
    // Get some students and teachers
    const students = await Student.find().limit(10);
    const teachers = await Teacher.find().limit(5);
    
    if (students.length === 0) {
      console.log('No students found in database');
      return;
    }
    
    if (teachers.length === 0) {
      console.log('No teachers found in database');
      return;
    }
    
    console.log(`Found ${students.length} students and ${teachers.length} teachers`);
    
    // Add today's student attendance
    const today = new Date();
    const attendanceRecords = [];
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const status = Math.random() > 0.2 ? 'present' : 'absent'; // 80% present
      
      attendanceRecords.push({
        student: student._id,
        date: today,
        status: status,
        reason: status === 'absent' ? 'Sick' : ''
      });
    }
    
    // Insert student attendance records
    await Attendance.insertMany(attendanceRecords);
    console.log(`Added ${attendanceRecords.length} student attendance records for today`);
    
    // Add today's teacher attendance
    const teacherAttendanceRecords = [];
    
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      const status = Math.random() > 0.1 ? 'present' : 'absent'; // 90% present
      
      teacherAttendanceRecords.push({
        teacher: teacher._id,
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        subject: teacher.subject,
        date: today,
        status: status,
        reason: status === 'absent' ? 'Personal leave' : '',
        markedBy: teacher._id, // Assuming teacher marks their own attendance
        markedByRole: 'teacher'
      });
    }
    
    // Insert teacher attendance records
    await TeacherAttendance.insertMany(teacherAttendanceRecords);
    console.log(`Added ${teacherAttendanceRecords.length} teacher attendance records for today`);
    
    // Verify the data
    const todayStudentCount = await Attendance.countDocuments({
      date: { 
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      }
    });
    
    const todayTeacherCount = await TeacherAttendance.countDocuments({
      date: { 
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      }
    });
    
    console.log(`Verification - Today's records: ${todayStudentCount} students, ${todayTeacherCount} teachers`);
    
    await mongoose.disconnect();
    console.log('Sample attendance data added successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleAttendanceData();
