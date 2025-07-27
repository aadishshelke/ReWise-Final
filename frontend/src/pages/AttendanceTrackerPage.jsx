import React, { useState, useEffect, useMemo } from 'react';
import { studentList } from '../data/students'; // Import our hardcoded list
import { motion } from 'framer-motion';
import { Calendar, Check, X, Clock, FileText, UserCheck, UserX } from 'lucide-react';

// A map to hold the styling for each attendance status
const statusStyles = {
  Present: { icon: Check, color: 'bg-green-500', hover: 'hover:bg-green-600' },
  Absent: { icon: X, color: 'bg-red-500', hover: 'hover:bg-red-600' },
  Late: { icon: Clock, color: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  Excused: { icon: FileText, color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
};

const AttendanceTrackerPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('Grade 3');
  const [attendance, setAttendance] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize attendance with all students marked as "Present" by default
  useEffect(() => {
    const initialAttendance = {};
    studentList.forEach(student => {
      initialAttendance[student.id] = 'Present';
    });
    setAttendance(initialAttendance);
  }, [selectedDate, selectedClass]); // Reset when date or class changes

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newAttendance = {};
    studentList.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  };

  // Calculate summary stats
  const summary = useMemo(() => {
    return Object.values(attendance).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [attendance]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 text-text-main">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Attendance Tracker</h1>
        <p className="text-text-secondary mb-8">Select a date and class to log daily attendance.</p>
      </motion.div>

      {/* --- Control Panel --- */}
      <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-lg flex flex-wrap items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="text-primary" />
          <label htmlFor="date-select" className="font-semibold text-text-secondary">Date:</label>
          <input
            type="date"
            id="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
            className="p-2 border border-gray-700 rounded-lg text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="class-select" className="font-semibold text-text-secondary">Class:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
            className="p-2 border border-gray-700 rounded-lg text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option>Grade 1</option>
            <option>Grade 2</option>
            <option>Grade 3</option>
            <option>Grade 4</option>
            <option>Grade 5</option>
          </select>
        </div>
      </div>

      {/* --- Summary & Bulk Actions --- */}
      <div className="bg-surface p-4 rounded-xl border border-border-subtle mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
                <span>Present: <strong className="text-green-400">{summary.Present || 0}</strong></span>
                <span>Absent: <strong className="text-red-400">{summary.Absent || 0}</strong></span>
                <span>Late: <strong className="text-yellow-400">{summary.Late || 0}</strong></span>
                <span>Excused: <strong className="text-blue-400">{summary.Excused || 0}</strong></span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => markAll('Present')} className="flex items-center gap-1.5 text-xs font-bold bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/40 transition">
                    <UserCheck size={16} /> Mark All Present
                </button>
                 <button onClick={() => markAll('Absent')} className="flex items-center gap-1.5 text-xs font-bold bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/40 transition">
                    <UserX size={16} /> Mark All Absent
                </button>
            </div>
        </div>
      </div>

      {/* --- Student Roster --- */}
      <div className="space-y-3">
        {studentList.map((student) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: student.id * 0.02 }}
            className="bg-surface p-3 pr-2 rounded-xl border border-border-subtle flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-text-secondary w-6 text-center">{student.rollNo}.</span>
              <p className="font-semibold">{student.name}</p>
            </div>
            <div className="flex gap-1.5">
              {Object.entries(statusStyles).map(([status, { icon: Icon, color, hover }]) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(student.id, status)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-white transition-transform transform hover:scale-110
                    ${attendance[student.id] === status ? `${color}` : `bg-surface-sunken hover:${color}/50`}
                  `}
                  title={status}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* --- Save Button --- */}
       <div className="mt-8 flex justify-end">
         <button 
           onClick={handleSave}
           disabled={isSaving}
           className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
         >
           {isSaving ? (
             <>
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
               Saving...
             </>
           ) : saveSuccess ? (
             <>
               <Check size={20} />
               Saved!
             </>
           ) : (
             'Save Attendance'
           )}
         </button>
       </div>
    </div>
  );
};

export default AttendanceTrackerPage; 