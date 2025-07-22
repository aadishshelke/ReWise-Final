// frontend/src/pages/ChalkboardViewPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

// Callable function for our NEW backend endpoint
const generateChalkboardAidFn = httpsCallable(functions, 'generateChalkboardAid');

// Component to display a single history item
const ChalkboardHistoryCard = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-soft mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div>
          <h3 className="font-bold text-md text-gray-800 truncate">
            Diagram of: "{doc.userPrompt}"
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Generated on: {formatDate(doc.createdAt)}
          </p>
        </div>
        <span className={`transform transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-4 md:p-6 border-t border-gray-100 flex justify-center">
          <img src={doc.imageUrl} alt={doc.userPrompt} className="max-w-full h-auto rounded-md border" />
        </div>
      )}
    </div>
  );
};

const ChalkboardViewPage = () => {
  const { user } = useOutletContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyDocs, setHistoryDocs] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Real-time listener for the 'chalkboardAids' collection
  useEffect(() => {
    if (!user?.uid) return setIsHistoryLoading(false);

    const q = query(
      collection(db, "chalkboardAids"),
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsHistoryLoading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setError("Could not load history. Please check your Firestore rules and index.");
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError('');
    try {
      // Call the NEW backend function
      await generateChalkboardAidFn({ prompt });
      setPrompt(''); // Clear input on success
    } catch (err) {
      console.error("Error generating diagram:", err);
      setError("Sorry, an error occurred while generating the diagram.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Generator Section */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-4 text-left">
        <h2 className="text-xl font-semibold text-gray-800">Design Visual Aids (ShikshaBox)</h2>
        <p className="text-sm text-gray-600">Enter a concept, and Sahayak will generate a simple diagram for your blackboard.</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., The human digestive system"
          className="w-full p-2 border rounded"
          rows="2"
        ></textarea>
        <button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:bg-gray-400">
          {isLoading ? "Drawing..." : "Generate Diagram"}
        </button>
        {error && <p className="text-red-500 mt-2 font-semibold">{error}</p>}
        {isLoading && <LoadingSpinner message="Sahayak is sketching the diagram... This may take up to a minute." />}
      </div>

      {/* History Section */}
      <div className="mt-6 text-left">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Generated Diagrams</h3>
        {isHistoryLoading && <LoadingSpinner message="Loading diagram history..." />}
        {!isHistoryLoading && historyDocs.length === 0 && (
          <div className="text-center py-10 px-4 bg-white rounded-lg border">
            <p className="text-gray-500">No diagrams generated yet. Create your first one!</p>
          </div>
        )}
        {!isHistoryLoading && historyDocs.map(doc => <ChalkboardHistoryCard key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};

export default ChalkboardViewPage;