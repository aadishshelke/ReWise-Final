// frontend/src/pages/ConceptExplainerPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ChevronDown, Loader, Download } from 'lucide-react'; // Import Download icon
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadPdf } from '../utils/pdfGenerator'; // Import our PDF utility

const generateTextFn = httpsCallable(functions, 'generateTextContent');

// --- COMPONENT 1: Renders a single concept from history (with improved Download button) ---
const ConceptHistoryCard = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const formatDate = (ts) => (ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A');

  const contentId = `concept-content-${doc.id}`;

  const handleDownload = (e) => {
    e.stopPropagation(); // Prevents the card from toggling open/close

    if (!isOpen) {
      setIsOpen(true);
    }

    setTimeout(() => {
      downloadPdf(contentId, `Concept - ${doc.userPrompt}`);
    }, 100);
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-xl shadow-lg mb-6 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 text-left transition-colors hover:bg-surface/80 cursor-pointer"
      >
        {/* Left side of header */}
        <div>
          <p className="text-xs text-text-secondary">Question Asked</p>
          <h3 className="font-bold text-lg text-text-main mt-1">
            "{doc.userPrompt}"
          </h3>
        </div>

        {/* Right side of header */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <ChevronDown className={`w-6 h-6 text-text-secondary transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* The expandable content area */}
      {isOpen && (
        <motion.div
          id={contentId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-5 md:p-6 bg-surface border-t border-border-subtle"
        >
          <p className="text-xs text-text-secondary mb-4">Generated on: {formatDate(doc.createdAt)}</p>
          <h4 className="font-semibold text-primary mb-2">Simple Explanation:</h4>
          <div className="whitespace-pre-wrap font-poppins text-text-secondary leading-relaxed">
            {doc.generatedContent}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- COMPONENT 2: The main page component (functionality is unchanged) ---
const ConceptExplainerPage = () => {
  const { user } = useOutletContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyDocs, setHistoryDocs] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return setIsHistoryLoading(false);
    const q = query(collection(db, "concepts"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
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
      await generateTextFn({
        userPrompt: prompt,
        fullPrompt: fullPrompt,
        saveOptions: { collection: 'concepts' }
      });
      setPrompt('');
    } catch (err) {
      setError("Sorry, an error occurred while generating the explanation.");
      console.error("Error generating explanation:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      {/* Section 1: The Generator */}
      <div className="bg-surface p-6 rounded-xl border border-border-subtle shadow-2xl shadow-black/20">
        <h2 className="text-2xl font-bold text-text-main">Instant Knowledge Base</h2>
        <p className="text-text-secondary mt-2 mb-6">Get simple explanations for complex student questions.</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Why is the sky blue?"
          className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200"
          rows="4"
        ></textarea>
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt}
          className="w-full mt-6 bg-primary text-white font-bold px-4 py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && <Loader className="animate-spin" />}
          {isLoading ? "Explaining..." : "Explain Concept"}
        </button>
        {error && <p className="text-red-500 font-semibold mt-4 text-center">{error}</p>}
      </div>

      {/* Section 2: The History */}
      <div className="mt-10">
        <h3 className="text-2xl font-bold mb-6 text-text-main">Your Explained Concepts</h3>
        {isHistoryLoading && <div className="flex justify-center"><LoadingSpinner message="Loading concept history..." /></div>}
        {!isHistoryLoading && historyDocs.length === 0 && (
          <div className="text-center py-16 px-4 bg-surface rounded-lg border-2 border-dashed border-border-subtle">
            <p className="text-text-secondary">No concepts explained yet. Ask your first question!</p>
          </div>
        )}
        {!isHistoryLoading && historyDocs.map(doc => <ConceptHistoryCard key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};

export default ConceptExplainerPage;