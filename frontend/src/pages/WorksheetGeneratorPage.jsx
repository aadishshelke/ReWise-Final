// frontend/src/components/DifferentiatedWorksheets.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db, storage } from '../firebase'; // Ensure this path is correct for your project
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

// A dedicated component to render a single, detailed worksheet from the history.
const WorksheetHistoryItem = ({ worksheet }) => {
  // State to manage which grade level's accordion is open
  const [openGrade, setOpenGrade] = useState(null);

  // Helper to format the Firestore timestamp into a readable date
  const formatDate = (timestamp) => {
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return 'Date not available';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-6 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="font-bold text-lg text-gray-800">Topic: {worksheet.topic}</h3>
        <p className="text-xs text-gray-500">
          Generated on: {formatDate(worksheet.createdAt)}
        </p>
      </div>

      {/* Card Body - Accordion for each grade level */}
      <div className="p-4 space-y-2">
        {worksheet.generatedContent?.worksheets?.map((gradeWorksheet) => (
          <div key={gradeWorksheet.gradeLevel} className="border rounded">
            <button
              onClick={() => setOpenGrade(openGrade === gradeWorksheet.gradeLevel ? null : gradeWorksheet.gradeLevel)}
              className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200 focus:outline-none"
            >
              <span className="font-semibold text-blue-700">{gradeWorksheet.title} (Grade Level: {gradeWorksheet.gradeLevel})</span>
              <span className={`transform transition-transform duration-200 ${openGrade === gradeWorksheet.gradeLevel ? 'rotate-180' : 'rotate-0'}`}>
                ▼
              </span>
            </button>
            {openGrade === gradeWorksheet.gradeLevel && (
              <div className="p-4 border-t bg-white">
                <ul className="space-y-4">
                  {gradeWorksheet.activities?.map((activity, index) => (
                    <li key={index} className="pb-4 border-b last:border-b-0">
                      <p className="font-semibold text-gray-700 mb-1">Activity {index + 1}:</p>
                      <p className="text-gray-600 mb-2">{activity.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">Materials:</span>
                        <span>{activity.materials}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// The main component for the page
const WorksheetGeneratorPage = () => {
  const { user } = useOutletContext();
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [worksheets, setWorksheets] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setIsHistoryLoading(false);
      return;
    }
    setIsHistoryLoading(true);
    const q = query(
      collection(db, "worksheets"),
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWorksheets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorksheets(fetchedWorksheets);
      setIsHistoryLoading(false);
      if (isUploading) setIsUploading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setError("Could not load worksheet history.");
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!file || !topic || !user) {
      setError("Please select a file and enter a topic before generating.");
      return;
    }
    setError('');
    setIsUploading(true);
    setUploadProgress(0);
    const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      customMetadata: { teacherId: user.uid, topic: topic },
    });
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (uploadError) => {
        console.error("Upload failed:", uploadError);
        setError("File upload failed. Please check storage rules.");
        setIsUploading(false);
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Section 1: The Generator */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Generate New Worksheets</h2>
        <div className="space-y-2 bg-white p-4 rounded-md shadow-sm border">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Main topic? (e.g., Photosynthesis)" className="w-full p-2 border rounded"/>
          <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded bg-white"/>
        </div>
        <button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed">
          {isUploading ? "Generating..." : "Generate Worksheets"}
        </button>
        {error && <p className="text-red-500 font-semibold">{error}</p>}
        {isUploading && (
          <div className="mt-4">
            <p className="text-sm font-medium text-blue-700">Step 1: Uploading file...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-1">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            {uploadProgress === 100 && <p className="text-sm font-medium text-blue-700 mt-2">Step 2: Sahayak is analyzing and creating worksheets...</p>}
          </div>
        )}
      </div>

      {/* Section 2: The History */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Generated Worksheets History</h3>
        {isHistoryLoading && <LoadingSpinner message="Loading history..." />}
        {!isHistoryLoading && worksheets.length === 0 && (
          <div className="text-center py-10 px-4 bg-white rounded-lg border">
            <p className="text-gray-500">No worksheets generated yet. Upload an image to start!</p>
          </div>
        )}
        {!isHistoryLoading && worksheets.map(ws => <WorksheetHistoryItem key={ws.id} worksheet={ws} />)}
      </div>
    </div>
  );
};

export default WorksheetGeneratorPage;