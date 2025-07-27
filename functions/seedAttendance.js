// THIS IS THE DEFINITIVE, LINT-FREE VERSION OF THE SEEDER SCRIPT.
// It is correctly formatted and includes better comments and a safety check.
// Replace the entire contents of your seedAttendance.js file with this.

/**
 * @fileoverview This script seeds the Firestore database with random attendance
 * data for a list of students over the last 30 days. It is intended to be
 * run once locally using Node.js to set up demonstration data.
 */

const admin = require("firebase-admin");

// --- IMPORTANT SETUP ---
// 1. Make sure you have your serviceAccountKey.json file in this directory.
// 2. You can get this file from Firebase Console > Project Settings > Service accounts.
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * A hardcoded list of 30 students for demonstration purposes.
 * @type {Array<{id: number, rollNo: number, name: string}>}
 */
const studentList = [
  {id: 1, rollNo: 1, name: "Aarav Sharma"},
  {id: 2, rollNo: 2, name: "Vivaan Singh"},
  {id: 3, rollNo: 3, name: "Aditya Kumar"},
  {id: 4, rollNo: 4, name: "Vihaan Patel"},
  {id: 5, rollNo: 5, name: "Arjun Gupta"},
  {id: 6, rollNo: 6, name: "Sai Reddy"},
  {id: 7, rollNo: 7, name: "Reyansh Mishra"},
  {id: 8, rollNo: 8, name: "Krishna Verma"},
  {id: 9, rollNo: 9, name: "Ishaan Joshi"},
  {id: 10, rollNo: 10, name: "Ananya Mehta"},
  {id: 11, rollNo: 11, name: "Diya Shah"},
  {id: 12, rollNo: 12, name: "Saanvi Agarwal"},
  {id: 13, rollNo: 13, name: "Myra Das"},
  {id: 14, rollNo: 14, name: "Aadhya Nair"},
  {id: 15, rollNo: 15, name: "Kiara Iyer"},
  {id: 16, rollNo: 16, name: "Pari Choudhary"},
  {id: 17, rollNo: 17, name: "Zara Khan"},
  {id: 18, rollNo: 18, name: "Riya Pillai"},
  {id: 19, rollNo: 19, name: "Advait Menon"},
  {id: 20, rollNo: 20, name: "Kabir Kumar"},
  {id: 21, rollNo: 21, name: "Ayaan Tiwari"},
  {id: 22, rollNo: 22, name: "Rohan Sharma"},
  {id: 23, rollNo: 23, name: "Aryan Patel"},
  {id: 24, rollNo: 24, name: "Zoya Gupta"},
  {id: 25, rollNo: 25, name: "Navya Reddy"},
  {id: 26, rollNo: 26, name: "Ira Mishra"},
  {id: 27, rollNo: 27, name: "Aarohi Verma"},
  {id: 28, rollNo: 28, name: "Ved Joshi"},
  {id: 29, rollNo: 29, name: "Neha Mehta"},
  {id: 30, rollNo: 30, name: "Arnav Shah"},
];

/**
 * Returns a random attendance status, weighted towards "Present".
 * @return {string} The random status.
 */
const getRandomStatus = () => {
  const statuses = [
    "Present", "Present", "Present", "Present", "Present",
    "Absent", "Late",
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

/**
 * Generates and saves random attendance data to Firestore.
 * @param {string} teacherId The Firebase Auth UID of the teacher.
 */
const seedData = async (teacherId) => {
  console.log("Starting to seed attendance data...");
  const batch = db.batch();
  const today = new Date();

  // Generate data for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    studentList.forEach((student) => {
      const docRef = db.collection("attendance").doc(); // New doc with auto-ID
      batch.set(docRef, {
        teacherId: teacherId,
        studentId: student.id,
        studentName: student.name,
        date: dateString,
        status: getRandomStatus(),
        grade: `Grade ${Math.ceil(student.rollNo / 10)}`,
      });
    });
  }

  try {
    await batch.commit();
    console.log(
        "SUCCESS: Attendance data for 30 days has been seeded to Firestore.",
    );
  } catch (error) {
    console.error("ERROR: Failed to seed data:", error);
  }
};

// =============================================================================
// --- SCRIPT EXECUTION ---
// =============================================================================

// !!! IMPORTANT !!!
// Replace this placeholder with your actual Teacher User ID from Firebase
// You can find this in the Firebase Console > Authentication tab.
const YOUR_TEACHER_ID = "KwxsOIC12HVNVnmwFYN5nwLKv012";

/**
 * Main execution function to run the seeder.
 */
const main = async () => {
  // Safety check to prevent running with the placeholder value.
  if (!YOUR_TEACHER_ID || YOUR_TEACHER_ID.includes("PASTE")) {
    console.error("\n\n!!! ERROR: Please edit seedAttendance.js and replace the placeholder for YOUR_TEACHER_ID before running this script.\n\n");
    return;
  }
  await seedData(YOUR_TEACHER_ID);
};

// Run the main function.
main();
