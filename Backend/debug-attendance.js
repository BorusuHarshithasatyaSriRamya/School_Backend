import mongoose from 'mongoose';
import Attendance from './models/attendance.model.js';

async function checkAttendanceRecords() {
  try {
    // Try to connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/edureach');
    console.log('Connected to MongoDB');
    
    // Get all attendance records
    const allRecords = await Attendance.find().sort({ date: -1 }).limit(10);
    console.log('\n=== ALL ATTENDANCE RECORDS (Latest 10) ===');
    console.log('Total records found:', allRecords.length);
    
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. Student: ${record.student}, Status: ${record.status}, Date: ${record.date}`);
    });
    
    // Check today's records with different date calculations
    const today = new Date();
    console.log('\n=== TODAY\'S DATE CALCULATIONS ===');
    console.log('Current Date:', today);
    console.log('Current Date (Local):', today.toLocaleString());
    console.log('Current Date (UTC):', today.toISOString());
    
    // Method 1: Local timezone
    const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    console.log('\nLocal Timezone Calculation:');
    console.log('Start of Day (Local):', startOfDayLocal);
    console.log('End of Day (Local):', endOfDayLocal);
    
    const todayRecordsLocal = await Attendance.find({
      date: { $gte: startOfDayLocal, $lte: endOfDayLocal }
    });
    console.log('Records found with Local calculation:', todayRecordsLocal.length);
    
    // Method 2: UTC timezone
    const startOfDayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
    
    console.log('\nUTC Timezone Calculation:');
    console.log('Start of Day (UTC):', startOfDayUTC);
    console.log('End of Day (UTC):', endOfDayUTC);
    
    const todayRecordsUTC = await Attendance.find({
      date: { $gte: startOfDayUTC, $lte: endOfDayUTC }
    });
    console.log('Records found with UTC calculation:', todayRecordsUTC.length);
    
    // Method 3: Simple date string matching
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('\nSimple Date String:', todayString);
    
    const todayRecordsString = await Attendance.find({
      date: { $regex: todayString }
    });
    console.log('Records found with string matching:', todayRecordsString.length);
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAttendanceRecords();
