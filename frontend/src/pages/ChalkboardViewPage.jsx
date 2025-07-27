// FILE: frontend/src/pages/ChalkboardViewPage.jsx (REPLACE ENTIRE FILE)

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { PenSquare, Loader, Download, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- This callable function reference is correct ---
const generateChalkboardAidFn = httpsCallable(functions, 'generateChalkboardAid');

// --- NEW: A fully redesigned, interactive history card ---
const DiagramCard = ({ doc }) => {
  // This helper function allows downloading the image directly
  const handleDownload = async () => {
    try {
      const response = await fetch(doc.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${doc.userPrompt.replace(/ /g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Could not download the image.');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative aspect-square bg-surface/50 rounded-xl overflow-hidden border border-border-subtle"
    >
      <img
        src={doc.imageUrl}
        alt={doc.userPrompt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Overlay for hover effect */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
        <p className="text-white font-semibold text-sm">{doc.userPrompt}</p>
        <button
          onClick={handleDownload}
          className="self-end p-2 rounded-full bg-primary/80 hover:bg-primary transition-colors"
          title="Download Diagram"
        >
          <Download size={18} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
};


const ChalkboardViewPage = () => {
  const { user } = useOutletContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyDocs, setHistoryDocs] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // --- Real-time listener for history (this logic is solid) ---
  useEffect(() => {
    if (!user?.uid) {
        setIsHistoryLoading(false);
        return;
    };

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
      setError("Could not load history. Please check your Firestore rules.");
      setIsHistoryLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- handleGenerate function (this logic is also solid) ---
  const handleGenerate = async () => {
    if (!prompt || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      await generateChalkboardAidFn({ prompt });
      setPrompt(''); 
    } catch (err) {
      console.error("Error generating diagram:", err);
      // This is the error message you are seeing. Check the function logs.
      setError("Sorry, an error occurred while generating the diagram.");
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 md:p-8 text-text-main h-full">
      {/* --- NEW: Redesigned Generator Section --- */}
      <div className="bg-surface/30 backdrop-blur-sm border border-border-subtle rounded-2xl p-6 shadow-lg mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-text-main">Design Visual Aids</h2>
        <p className="text-text-secondary mt-2 mb-4">Enter a concept, and Sahayak will generate a simple diagram for your blackboard.</p>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., The water cycle, Parts of a plant cell, The solar system"
            className="w-full p-3 bg-surface border border-border-main rounded-xl resize-none text-text-main placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            rows="3"
          />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
            <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
              {isLoading ? <Loader size={20} className="animate-spin" /> : <PenSquare size={20} />}
              <span>{isLoading ? "Drawing..." : "Generate Diagram"}</span>
            </button>
            {error && <p className="text-red-500 font-semibold">{error}</p>}
        </div>
      </div>

      {/* --- NEW: Redesigned History Section --- */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-text-main">Your Generated Diagrams</h3>
        <AnimatePresence>
            {isHistoryLoading ? (
              <div className="flex justify-center items-center p-10"><Loader className="animate-spin text-primary" /></div>
            ) : historyDocs.length === 0 ? (
              <div className="text-center py-12 px-6 bg-surface/20 rounded-xl border-2 border-dashed border-border-subtle">
                  <ImageIcon size={40} className="mx-auto text-gray-500" />
                  <p className="mt-4 font-semibold text-text-secondary">No diagrams generated yet.</p>
                  <p className="text-sm text-gray-500">Create your first one above!</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {historyDocs.map(doc => <DiagramCard key={doc.id} doc={doc} />)}
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChalkboardViewPage;