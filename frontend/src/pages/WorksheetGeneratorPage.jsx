// frontend/src/pages/WorksheetGeneratorPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db, storage } from '../firebase';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ChevronDown, FileUp, Loader } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming this is your preferred spinner

// --- COMPONENT 1: Renders a single question (WITH INLINE STYLE FIX) ---
const Question = ({ question, index }) => {
  return (
    <div className="py-4 border-b border-border-subtle last:border-b-0 text-left">
      <div className="flex justify-between items-start mb-3">
        <p className="font-semibold text-text-main pr-4">
          {index + 1}. {question.questionText}
        </p>
        <span className="text-sm font-bold text-text-secondary whitespace-nowrap bg-surface-sunken px-2 py-1 rounded-md">
          {question.marks} Marks
        </span>
      </div>

      {question.type === "MCQ" && (
        <div className="space-y-2 mt-2 pl-4">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center">
              <input type="radio" name={`mcq-${index}`} className="mr-3 h-4 w-4 accent-primary" />
              <label className="text-text-secondary">{option}</label>
            </div>
          ))}
        </div>
      )}
      {question.type === "Fill in the Blanks" && (
        <div className="mt-3">
          <input
            type="text"
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }} // <-- INLINE STYLE FIX
            className="w-full p-2 border border-gray-700 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      )}
      {question.type === "True/False" && (
        <div className="space-x-6 mt-2 pl-4">
          <label className="flex items-center"><input type="radio" name={`tf-${index}`} className="mr-3 h-4 w-4 accent-primary" /> True</label>
          <label className="flex items-center"><input type="radio" name={`tf-${index}`} className="mr-3 h-4 w-4 accent-primary" /> False</label>
        </div>
      )}
      {question.type === "Short Answer" && (
        <div className="mt-3">
          <textarea
            rows="3"
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }} // <-- INLINE STYLE FIX
            className="w-full p-2 border border-gray-700 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
          ></textarea>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT 2: Renders a collapsible accordion for one grade level ---
const GradeLevelWorksheet = ({ worksheet }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-border-subtle rounded-lg bg-surface-sunken overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 hover:bg-surface transition-colors"
      >
        <span className="font-semibold text-primary">{worksheet.title} ({worksheet.gradeLevel})</span>
        <ChevronDown className={`w-5 h-5 text-text-secondary transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 border-t border-border-subtle">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-text-main">{worksheet.title}</h4>
            <span className="font-bold text-text-secondary">Total Marks: {worksheet.totalMarks}</span>
          </div>
          {worksheet.questions.map((q, i) => (
            <Question key={i} question={q} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

// --- COMPONENT 3: The main card for a single generated document ---
const WorksheetHistoryCard = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A';

  return (
    <div className="bg-surface border border-border-subtle rounded-xl shadow-lg mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 text-left transition-colors hover:bg-surface/80"
      >
        <div>
          <h3 className="font-bold text-lg text-text-main">Topic: {doc.topic}</h3>
          <p className="text-xs text-text-secondary mt-1">
            Generated on: {formatDate(doc.createdAt)}
          </p>
        </div>
        <ChevronDown className={`w-6 h-6 text-text-secondary transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 border-t border-border-subtle space-y-4">
          {doc.generatedContent.worksheets.map((ws) => (
            <GradeLevelWorksheet key={ws.gradeLevel} worksheet={ws} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

// --- COMPONENT 4: A styled file input ---
const FileInput = ({ file, onFileChange }) => {
  return (
    <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-surface-sunken transition-colors">
      <FileUp className="w-8 h-8 text-text-secondary mb-2" />
      <span className="font-semibold text-text-main">
        {file ? 'File Selected' : 'Click to Upload Image'}
      </span>
      <span className="text-xs text-text-secondary mt-1">
        {file ? file.name : 'PNG, JPG, or GIF'}
      </span>
      <input type="file" onChange={onFileChange} className="hidden" />
    </label>
  );
};


// --- COMPONENT 5: The main page ---
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
    const q = query(collection(db, "worksheets"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsHistoryLoading(false);
      setIsUploading(false);
    }, (err) => {
      setError("Could not load worksheet history. " + err);
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpload = () => {
    if (!file || !topic || !user) {
      setError("Please provide a topic and select an image file.");
      return;
    }
    setError('');
    setIsUploading(true);
    const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file, { customMetadata: { teacherId: user.uid, topic: topic } });
    uploadTask.on('state_changed', null, (err) => {
      setError("File upload failed. Please try again. " + err);
      setIsUploading(false);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      <div className="bg-surface p-6 rounded-xl border border-border-subtle shadow-2xl shadow-black/20">
        <h2 className="text-2xl font-bold text-text-main mb-6">Generate New Worksheets</h2>
        <div className="space-y-6">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Main topic? (e.g., Photosynthesis, The Solar System)"
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }} // <-- INLINE STYLE FIX
            className="w-full p-3 border border-gray-700 rounded-lg placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <FileInput file={file} onFileChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full mt-6 bg-primary text-white font-bold px-4 py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading && <Loader className="animate-spin" />}
          {isUploading ? "Generating..." : "Generate Worksheets"}
        </button>
        {error && <p className="text-red-500 font-semibold mt-4 text-center">{error}</p>}
      </div>

      <div className="mt-10">
        <h3 className="text-2xl font-bold mb-6 text-text-main">Your Generated Worksheets History</h3>
        {isHistoryLoading && <div className="flex justify-center"><LoadingSpinner message="Loading history..." /></div>}
        {!isHistoryLoading && historyDocs.length === 0 && (
          <div className="text-center py-16 px-4 bg-surface rounded-lg border-2 border-dashed border-border-subtle">
            <p className="text-text-secondary">No worksheets generated yet. Upload an image to start!</p>
          </div>
        )}
        {!isHistoryLoading && historyDocs.map(doc => <WorksheetHistoryCard key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};

export default WorksheetGeneratorPage;