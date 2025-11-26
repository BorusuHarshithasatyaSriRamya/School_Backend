import Attendance from '../models/attendance.model.js';
import Student from '../models/student.model.js';
import Teacher from '../models/teacher.model.js';
import Parent from "../models/parent.model.js";
import xlsx from 'xlsx'; 
import { sendAbsenceAlertEmail } from '../utils/emailService.js'; // Nodemailer utility

export const markAttendance = async (req, res) => {
  try {
    const { attendanceData } = req.body;
    const records = [];
    const skippedStudents = [];

    const groupedByDate = {}; // Prevent querying DB repeatedly for same student/date combo

    for (let record of attendanceData) {
      const { studentId, status, reason, date } = record;
      
      // Fix date handling to avoid timezone issues
      const rawDate = date ? new Date(date) : new Date();
      const dayStart = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 23, 59, 59, 999);
      const key = `${studentId}-${dayStart.toISOString()}`;
      
      console.log('Processing attendance for:', {
        studentId,
        status,
        date: rawDate,
        dayStart,
        dayEnd,
        dayStartISO: dayStart.toISOString(),
        dayStartLocal: dayStart.toLocaleString()
      });

      if (groupedByDate[key]) {
        skippedStudents.push(studentId); // already processed in this request
        continue;
      }

      const existing = await Attendance.findOne({
        student: studentId,
        date: { $gte: dayStart, $lte: dayEnd },
      });

      if (existing) {
        // Update existing attendance record
        existing.status = status;
        existing.reason = reason || "";
        existing.updatedAt = new Date();
        await existing.save();
        records.push(existing);
        continue;
      }

      const student = await Student.findById(studentId).populate('parent');
      if (!student) {
        console.warn(`Skipping student ${studentId} — student not found`);
        continue;
      }
      
      // Log parent status for debugging
      if (!student.parent) {
        console.warn(`Student ${student.name} (${student.studentId}) has no parent record, but attendance will still be saved`);
      }

      const newAttendance = await Attendance.create({
        student: student._id,
        status,
        reason: status === 'absent' ? reason : '',
        date: dayStart,
      });

      records.push(newAttendance);
      groupedByDate[key] = true;

      if (status === 'absent') {
        try {
          // Email functionality removed - just log the absence
          if (student.parent) {
            console.log(`Student ${student.name} (${student.studentId}) marked absent. Parent: ${student.parent.name}`);
          } else {
            console.log(`Student ${student.name} (${student.studentId}) marked absent. No parent record found.`);
          }
          // await sendAbsenceAlertEmail({
          //   parentEmail: student.parent.email,
          //   parentName: student.parent.name,
          //   studentName: student.name,
          //   reason,
          //   date: dayStart,
          // });
        } catch (err) {
          console.error(`Email send failed: ${err.message}`);
        }
      }
    }

    res.status(200).json({
      message: records.length > 0 ? "Attendance updated successfully" : "No changes made",
      count: records.length,
      skippedStudents,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { month, year, filter } = req.query;

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Step 1: Generate full date range
    const dateRange = [];
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(new Date(d).toISOString().slice(0, 10)); // yyyy-mm-dd
    }

    // Step 2: Fetch Students
    let students = [];
    if (req.user.role === "admin") {
      students = await Student.find();
    } else if (req.user.role === "teacher") {
      const teacher = await Teacher.findById(req.user.teacherId);
      const queries = teacher.sectionAssignments.map(({ className, section }) => ({
        class: className,
        section,
      }));
      students = await Student.find({ $or: queries });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const studentIds = students.map((s) => s._id);

    // Step 3: Fetch Attendance
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: startDate, $lt: endDate },
    }).populate("student");

    // Step 4: Group attendance by student
    const grouped = {}; // { class-section: [{...student row}] }

    for (let student of students) {
      const key = `${student.class}-${student.section}`;
      if (!grouped[key]) grouped[key] = [];

      const baseRow = {
        Name: student.name,
        Class: student.class,
        Section: student.section,
        Presents: 0,
        Absents: 0,
      };

      // Initialize attendance for each date
      dateRange.forEach((d) => {
        baseRow[d] = "";
      });

      // Filter attendance for this student
      const records = attendanceRecords.filter(
        (r) => r.student._id.toString() === student._id.toString()
      );

      for (let rec of records) {
        const dateKey = rec.date.toISOString().slice(0, 10);
        baseRow[dateKey] = rec.status === "present" ? "Present" : "Absent";
        if (rec.status === "present") baseRow.Presents++;
        else baseRow.Absents++;
      }

      const totalDays = baseRow.Presents + baseRow.Absents;
      baseRow["% Attendance"] = totalDays > 0
        ? ((baseRow.Presents / totalDays) * 100).toFixed(1) + "%"
        : "0%";

      grouped[key].push(baseRow);
    }

    // Step 5: Create Workbook with Sheets per Class-Section
    const workbook = xlsx.utils.book_new();

    for (let sectionKey in grouped) {
      const data = grouped[sectionKey];

      const sheet = xlsx.utils.json_to_sheet(data, {
        header: [
          "Name", "Class", "Section", ...dateRange, "Presents", "Absents", "% Attendance"
        ]
      });

      // Apply simple cell styles (we’ll highlight absents as RED using special handling)
      const range = xlsx.utils.decode_range(sheet["!ref"]);
      for (let R = 1; R <= range.e.r; ++R) {
        for (let C = 3; C <= 3 + dateRange.length - 1; ++C) {
          const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
          const cell = sheet[cellRef];
          if (cell && cell.v === "Absent") {
            cell.s = {
              font: { color: { rgb: "FF0000" }, bold: true },
              fill: { fgColor: { rgb: "FFECEC" } },
            };
          }
        }
      }

      xlsx.utils.book_append_sheet(workbook, sheet, sectionKey);
    }

    // Step 6: Return as download
    const buffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
      cellStyles: true,
    });

    res.setHeader("Content-Disposition", `attachment; filename="Attendance-${month}-${year}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Failed to export summary", error: error.message });
  }
};

export const getStudentAttendance = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get student's attendance
    const attendance = await Attendance.find({
      student: req.user.studentId,
      date: { $gte: startDate, $lt: endDate },
    });

    // Format result
    let presents = 0;
    let absents = 0;
    const dailyStatus = {};

    attendance.forEach((rec) => {
      const dateKey = rec.date.toISOString().slice(0, 10);
      dailyStatus[dateKey] = rec.status;
      if (rec.status === "present") presents++;
      else absents++;
    });

    const totalDays = presents + absents;
    const attendancePercentage =
      totalDays > 0 ? ((presents / totalDays) * 100).toFixed(1) + "%" : "0%";

    res.status(200).json({
      month,
      year,
      totalDays,
      presents,
      absents,
      attendancePercentage,
      dailyStatus, // optional: { "2025-07-01": "present", ... }
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAttendanceForParent = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find parent and populate children
    const parent = await Parent.findOne({ userId: req.user._id }).populate("children");

    if (!parent || parent.children.length === 0) {
      return res.status(404).json({ message: "No student found for this parent" });
    }

    const attendanceData = [];

    for (const student of parent.children) {
      const records = await Attendance.find({
        student: student._id,
        date: { $gte: startDate, $lt: endDate },
      });

      let presents = 0;
      let absents = 0;
      const dailyStatus = {};

      records.forEach((rec) => {
        const dateKey = rec.date.toISOString().slice(0, 10);
        dailyStatus[dateKey] = rec.status;
        if (rec.status === "present") presents++;
        else absents++;
      });

      const totalDays = presents + absents;
      const attendancePercentage = totalDays > 0
        ? ((presents / totalDays) * 100).toFixed(1) + "%"
        : "0%";

      attendanceData.push({
        studentId: student._id,
        studentName: student.name,
        class: student.class,
        section: student.section,
        month,
        year,
        totalDays,
        presents,
        absents,
        attendancePercentage,
        dailyStatus,
      });
    }

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error("Parent attendance fetch error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getDailyAttendanceSummary = async (req, res) => {
  try {
    const { date, class: className, section: sectionName } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    let students = [];
    
    // Get students based on user role
    if (req.user.role === "admin") {
      // Admin can see all students
      students = await Student.find();
    } else if (req.user.role === "teacher") {
      // Teacher can only see their assigned students
      const teacher = await Teacher.findById(req.user.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const sectionQueries = teacher.sectionAssignments.map(({ className, section }) => ({
        class: className,
        section,
      }));

      students = await Student.find({ $or: sectionQueries });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // Apply class and section filters if provided
    if (className && className !== 'all' && className !== null) {
      const [classNum, section] = className.split('-');
      students = students.filter(s => s.class === classNum && s.section === section);
    }
    
    // Additional section filtering if section is specified separately
    if (sectionName && sectionName !== 'all' && className && className !== 'all' && className !== null) {
      const [classNum] = className.split('-');
      students = students.filter(s => s.class === classNum && s.section === sectionName);
    }

    console.log('Daily Summary Request:', { date, className, sectionName });
    console.log('Total Students Found:', students.length);
    console.log('Filter Applied:', className && className !== 'all' ? `Class ${className}` : 'All assigned classes');

    const studentIds = students.map(s => s._id);

    // Get attendance records for the specific date
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: dayStart, $lte: dayEnd }
    });

    // Calculate summary statistics
    const totalStudents = students.length;
    const presents = attendanceRecords.filter(record => record.status === 'present').length;
    const absents = attendanceRecords.filter(record => record.status === 'absent').length;
    
    // Calculate attendance percentage
    const attendancePercentage = totalStudents > 0 
      ? Math.round((presents / totalStudents) * 100)
      : 0;

    const responseData = {
      totalStudents,
      presents,
      absents,
      attendancePercentage,
      date: dayStart.toISOString().slice(0, 10)
    };
    
    console.log('Daily Summary Response:', responseData);
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error("Error fetching daily attendance summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




