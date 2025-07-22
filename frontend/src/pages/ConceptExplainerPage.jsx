// frontend/src/pages/ConceptExplainerPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

const generateTextFn = httpsCallable(functions, 'generateTextContent');

// A dedicated component to render a single concept from the history
const ConceptHistoryCard = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-soft mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div>
          <p className="text-xs text-gray-500">Question Asked</p>
          <h3 className="font-bold text-md text-gray-800 truncate">
            "{doc.userPrompt}"
          </h3>
        </div>
        <span className={`transform transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-4 md:p-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Generated on: {formatDate(doc.createdAt)}</p>
          <h4 className="font-semibold text-primary mb-2">Simple Explanation:</h4>
          <pre className="whitespace-pre-wrap font-poppins text-gray-700">
            {doc.generatedContent}
          </pre>
        </div>
      )}
    </div>
  );
};

const ConceptExplainerPage = () => {
  const { user } = useOutletContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyDocs, setHistoryDocs] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Real-time listener for the 'concepts' collection
  useEffect(() => {
    if (!user?.uid) return setIsHistoryLoading(false);
    
    const q = query(
      collection(db, "concepts"), // Listen to the 'concepts' collection
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsHistoryLoading(false);
    }, (err) => {
      setError("Could not load concept history. " + err);
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError('');
    try {
      const fullPrompt = `You are an AI assistant for a teacher in a multi-grade Indian classroom. A student asked: "${prompt}". Explain this concept in the local language requested (or simple English if not specified). Use a very simple analogy that a child can easily understand.`;
      
      // Call the backend function and tell it to save the result
      await generateTextFn({
        userPrompt: prompt,
        fullPrompt: fullPrompt,
        saveOptions: {
          collection: 'concepts' // The collection to save to
        }
      });
      setPrompt('');
    } catch (err) {
      setError("Sorry, an error occurred while generating the explanation.");
      console.error("Error generating explanation:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Generator Section */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-4 text-left">
        <h2 className="text-xl font-semibold text-gray-800">Instant Knowledge Base</h2>
        <p className="text-sm text-gray-600">Get simple explanations for complex student questions.</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Why is the sky blue?"
          className="w-full p-2 border rounded"
          rows="3"
        ></textarea>
        <button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:bg-gray-400">
          {isLoading ? "Explaining..." : "Explain Concept"}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* History Section */}
      <div className="mt-6 text-left">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Explained Concepts</h3>
        {isHistoryLoading && <LoadingSpinner message="Loading concept history..." />}
        {!isHistoryLoading && historyDocs.length === 0 && (
          <div className="text-center py-10 px-4 bg-white rounded-lg border">
            <p className="text-gray-500">No concepts explained yet. Ask your first question!</p>
          </div>
        )}
        {!isHistoryLoading && historyDocs.map(doc => <ConceptHistoryCard key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};

export default ConceptExplainerPage;