// In frontend/src/pages/SyllabusUploaderPage.jsx

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

// --- This is the SyllabusViewer component that displays the plan ---
const SyllabusViewer = ({ user }) => {
  const [syllabus, setSyllabus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // We use a real-time listener (onSnapshot) so the page
    // magically updates when the AI is done processing.
    const q = query(
      collection(db, "syllabusPlan"),
      where("teacherId", "==", user.uid),
      orderBy("weekNumber")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const syllabusData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Group the flat list of topics into a nested object by week number
      const groupedByWeek = syllabusData.reduce((acc, item) => {
        const week = item.weekNumber;
        if (!acc[week]) {
          acc[week] = [];
        }
        acc[week].push(item);
        return acc;
      }, {});

      setSyllabus(groupedByWeek);
      setIsLoading(false);
    }, (error) => {
      // This is the Firestore index error handling from before
      console.error("Firestore snapshot error:", error);
      setIsLoading(false);
    });

    // Cleanup the listener when the component is removed
    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return <p className="mt-8 text-center text-gray-500">Loading your syllabus plan...</p>;
  }

  if (!syllabus || Object.keys(syllabus).length === 0) {
    return <p className="mt-8 text-center text-gray-500">No syllabus plan has been generated yet. Paste your syllabus above to begin.</p>;
  }

  const weeks = Object.keys(syllabus).sort((a, b) => parseInt(a) - parseInt(b));
  const term1Weeks = weeks.filter(w => w <= 12);
  const term2Weeks = weeks.filter(w => w > 12 && w <= 24);
  const term3Weeks = weeks.filter(w => w > 24);

  const TermSection = ({ title, termWeeks }) => (
    <details className="mb-4 group border rounded-lg bg-white dark:bg-gray-900" open={title.startsWith('Term 1')}>
      <summary className="font-semibold text-lg cursor-pointer p-4 list-none flex justify-between items-center">
        {title}
        <span className="text-gray-500 transition-transform transform group-open:rotate-180">▼</span>
      </summary>
      <div className="p-4 border-t">
        {termWeeks.length > 0 ? termWeeks.map(weekNumber => (
          <div key={weekNumber} className="mb-4 pl-4 border-l-4 border-primary">
            <h3 className="font-semibold text-md text-gray-800 dark:text-gray-200">Week {weekNumber}</h3>
            <ul className="list-disc pl-5 mt-1 text-gray-600 dark:text-gray-400">
              {syllabus[weekNumber].map(item => (
                <li key={item.id}>{item.topic} {item.grade && `(Grade ${item.grade})`}</li>
              ))}
            </ul>
          </div>
        )) : <p className="text-gray-500">No lessons planned for this term yet.</p>}
      </div>
    </details>
  );

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Your Yearly Syllabus Plan</h2>
      <TermSection title="Term 1 (Weeks 1-12)" termWeeks={term1Weeks} />
      <TermSection title="Term 2 (Weeks 13-24)" termWeeks={term2Weeks} />
      <TermSection title="Term 3 (Weeks 25-36)" termWeeks={term3Weeks} />
    </div>
  );
};


// --- This is the main component for the page ---
const SyllabusUploaderPage = () => {
  const [syllabusText, setSyllabusText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const sampleSyllabus = `Grade 3 Science Syllabus
Academic Year: 2025
Chapter 1: Adaptations in Land Environments
 - Lesson 1: Living Things and Their Needs
 - Lesson 2: Life in the Desert
 - Lesson 3: Life in the Grassland
Chapter 2: Adaptations in Water Environments
 - Lesson 1: The Water Planet
 - Lesson 2: Life in an Ocean
 - Lesson 3: Life in the Wetlands
Chapter 3: Environments Change
 - Lesson 1: Living Things Change Their Environment
 - Lesson 2: Changes Affect Living Things
Chapter 4: Our Earth, Sun, and Moon
 - Lesson 1: Day and Night
 - Lesson 2: The Seasons
 - Lesson 3: The Moon`;

  const handleProcess = async () => {
    if (!syllabusText || !user) return;

    setIsProcessing(true);
    setStatusMessage('Sending syllabus to Sahayak. This is a complex task and may take a few minutes...');
    setError(null);

    try {
      const functions = getFunctions(undefined, 'us-east1');

      // Ensure you use the correct function name here
      const processSyllabusText = httpsCallable(functions, 'processSyllabusText');
      
      const result = await processSyllabusText({ syllabusText });

      console.log('Function result:', result.data);
      setStatusMessage('Success! Your syllabus has been processed. The plan below will update automatically.');

    } catch (err) {
      console.error("Processing failed:", err);
      setError('Syllabus processing failed. Please check the function logs in Firebase for details.');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Syllabus Architect</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Paste your yearly curriculum text below. Sahayak will analyze it and automatically create a week-by-week plan for you.
        </p>
        <div className="flex flex-col space-y-4">
          <div>
            <label htmlFor="syllabus-text" className="mb-2 font-semibold text-gray-700 dark:text-gray-300 block">
              Paste Syllabus Text
            </label>
            <textarea
              id="syllabus-text"
              rows="15"
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              disabled={isProcessing}
              className="p-3 border border-gray-300 rounded-md w-full font-mono text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Paste your curriculum here, including chapter names, lesson titles, etc."
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <button
              onClick={handleProcess}
              disabled={isProcessing || !syllabusText}
              className="w-full sm:w-auto bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary/90 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Architecting Your Plan...' : 'Process Syllabus'}
            </button>
            <button
              onClick={() => setSyllabusText(sampleSyllabus)}
              disabled={isProcessing}
              className="text-sm text-primary hover:underline"
            >
              Load Sample Text
            </button>
          </div>
        </div>
        
        {statusMessage && (
          <div className="mt-6 p-4 bg-green-100 text-green-800 border-l-4 border-green-500 rounded-r-lg">
            <p>{statusMessage}</p>
          </div>
        )}
        {error && (
          <div className="mt-6 p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r-lg">
            <h3 className="font-bold">Error:</h3>
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* This will render the yearly plan once it's available */}
      {user && <SyllabusViewer user={user} />}
    </div>
  );
};

export default SyllabusUploaderPage;