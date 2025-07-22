// frontend/src/pages/WorksheetGeneratorPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db, storage } from '../firebase'; // Ensure path is correct
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

// --- COMPONENT 1: Renders a single question based on its type ---
const Question = ({ question, index }) => {
  return (
    <div className="py-4 border-b border-gray-200 last:border-b-0 text-left">
      <div className="flex justify-between items-start mb-2">
        <p className="font-semibold text-gray-800 pr-4">
          {index + 1}. {question.questionText}
        </p>
        <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
          [{question.marks} Marks]
        </span>
      </div>

      {/* Render different inputs based on question type */}
      {question.type === "MCQ" && (
        <div className="space-y-2 mt-2 pl-4">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center">
              <input type="radio" name={`mcq-${index}`} className="mr-2" />
              <label className="text-gray-700">{option}</label>
            </div>
          ))}
        </div>
      )}

      {question.type === "Fill in the Blanks" && (
        <div className="mt-3">
          <input type="text" className="w-full p-2 border border-gray-300 rounded-md" />
        </div>
      )}

      {question.type === "True/False" && (
        <div className="space-x-4 mt-2 pl-4">
          <label><input type="radio" name={`tf-${index}`} className="mr-1" /> True</label>
          <label><input type="radio" name={`tf-${index}`} className="mr-1" /> False</label>
        </div>
      )}

      {question.type === "Short Answer" && (
        <div className="mt-3">
          <textarea rows="3" className="w-full p-2 border border-gray-300 rounded-md"></textarea>
        </div>
      )}

      {question.type === "Match the Following" && (
        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 pl-4">
          {/* Column A */}
          <div className="font-semibold">Column A</div>
          <div className="font-semibold">Column B</div>
          {question.columnA.map((itemA, i) => (
            <React.Fragment key={i}>
              <div className="p-2 bg-gray-50 rounded">{itemA}</div>
              <div className="p-2 bg-gray-50 rounded">{question.columnB[i]}</div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENT 2: Renders a collapsible accordion for one grade level ---
const GradeLevelWorksheet = ({ worksheet }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200 transition"
      >
        <span className="font-semibold text-primary">{worksheet.title} ({worksheet.gradeLevel})</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="p-4 md:p-6 bg-white border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold">{worksheet.title}</h4>
            <span className="font-bold">Total Marks: {worksheet.totalMarks}</span>
          </div>
          {worksheet.questions.map((q, i) => (
            <Question key={i} question={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENT 3: The main card for a single generated document ---
const WorksheetHistoryCard = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-soft mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div>
          <h3 className="font-bold text-lg text-gray-800">Topic: {doc.topic}</h3>
          <p className="text-xs text-gray-500">
            Generated on: {formatDate(doc.createdAt)}
          </p>
        </div>
        <span className={`transform transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-100 space-y-2">
          {doc.generatedContent.worksheets.map((ws) => (
            <GradeLevelWorksheet key={ws.gradeLevel} worksheet={ws} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENT 4: The main page ---
const WorksheetGeneratorPage = () => {
  const { user } = useOutletContext();
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [historyDocs, setHistoryDocs] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return setIsHistoryLoading(false);

    const q = query(
      collection(db, "worksheets"),
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsHistoryLoading(false);
      setIsUploading(false); // Stop loading spinner when new data arrives
    }, (err) => {
      setError("Could not load worksheet history. " + err);
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = () => {
    if (!file || !topic || !user) {
      setError("Please select a file and enter a topic.");
      return;
    }
    setError('');
    setIsUploading(true);
    const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      customMetadata: { teacherId: user.uid, topic: topic },
    });
    uploadTask.on('state_changed', null, (err) => {
      setError("File upload failed. Please try again. " + err);
      setIsUploading(false);
    });
  };

  return (
    <div className="space-y-8">
      {/* Section 1: The Generator */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-4 text-left">
        <h2 className="text-xl font-semibold text-gray-800">Generate New Worksheets</h2>
        <div className="space-y-2 bg-white p-4 rounded-md shadow-sm border">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Main topic? (e.g., Photosynthesis)" className="w-full p-2 border rounded"/>
          <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded bg-white"/>
        </div>
        <button onClick={handleUpload} disabled={isUploading} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed">
          {isUploading ? "Generating..." : "Generate Worksheets"}
        </button>
        {error && <p className="text-red-500 font-semibold">{error}</p>}
        {isUploading && <LoadingSpinner message="Sahayak is creating your worksheets..." />}
      </div>

      {/* Section 2: The History */}
      <div className="mt-6 text-left">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Generated Worksheets History</h3>
        {isHistoryLoading && <LoadingSpinner message="Loading history..." />}
        {!isHistoryLoading && historyDocs.length === 0 && (
          <div className="text-center py-10 px-4 bg-white rounded-lg border">
            <p className="text-gray-500">No worksheets generated yet. Upload an image to start!</p>
          </div>
        )}
        {!isHistoryLoading && historyDocs.map(doc => <WorksheetHistoryCard key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};

export default WorksheetGeneratorPage;