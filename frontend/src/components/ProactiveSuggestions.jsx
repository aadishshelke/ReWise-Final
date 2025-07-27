// THIS IS THE DEFINITIVE, CORRECTED COMPONENT WITH NO UNUSED VARIABLES.
// Replace the entire contents of your ProactiveSuggestions.jsx file with this.

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase'; // NOTE: 'functions' import is no longer needed here
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Send } from 'lucide-react';

// The component now accepts the 'user' object and the 'onSuggestionAction' callback as props.
const ProactiveSuggestions = ({ user, onSuggestionAction }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Local loading state for the button

  // Effect 1: Fetch the suggestions from Firestore in real-time.
  useEffect(() => {
    if (!user || !user.uid) {
        setSuggestions([]);
        return;
    }

    console.log("ProactiveSuggestions: Setting up Firestore listener for user:", user.uid);

    const q = query(
      collection(db, `users/${user.uid}/proactiveSuggestions`),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSuggestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`ProactiveSuggestions: Fetched ${fetchedSuggestions.length} new suggestions.`);
      setSuggestions(fetchedSuggestions);
      setCurrentSuggestionIndex(0); // Reset to the first suggestion when new ones arrive
    }, (error) => {
        console.error("ProactiveSuggestions: Firestore listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Effect 2: Cycle through the fetched suggestions every 7 seconds.
  useEffect(() => {
    if (suggestions.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentSuggestionIndex(prevIndex => (prevIndex + 1) % suggestions.length);
      }, 7000); // Cycle every 7 seconds

      return () => clearInterval(intervalId); // Cleanup on unmount
    }
  }, [suggestions]);

  // This function now simply constructs the prompt and passes it to the parent page.
  const handleSuggestionClick = useCallback(async (suggestion) => {
    setIsLoading(true); // Disable the button immediately
    
    // Construct the exact prompt string the user would type
    const userPrompt = `${suggestion.actionType === 'explainConcept' ? 'Explain the concept of' : 'Tell a story about'} ${suggestion.actionPayload.topic}`;
    
    // Pass the fully formed prompt up to the parent page (SahayakAgentPage)
    if (onSuggestionAction) {
        onSuggestionAction(userPrompt);
    }
    
    // No need for try/catch or finally here, as the parent handles the full lifecycle.
    // We can keep a local loading state if we want the button to show "Working..."
    // but the main page's isLoading will take over.
    // Let's set a small timeout to give a feeling of action.
    setTimeout(() => setIsLoading(false), 1500);

  }, [onSuggestionAction]);
  
  // If there are no suggestions, render nothing. This is the key visibility logic.
  if (suggestions.length === 0) {
    return null; 
  }

  // Get the current suggestion to display
  const currentSuggestion = suggestions[currentSuggestionIndex];

  return (
    <div className="p-4 border rounded-lg bg-yellow-50/50 backdrop-blur-sm animate-fade-in shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-yellow-600" />
        <h3 className="font-semibold text-gray-800">Sahayak's Idea:</h3>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSuggestion.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="w-full text-left p-3 bg-white rounded-md shadow-sm"
        >
          <p className="text-sm text-gray-700 mb-3">{currentSuggestion.suggestionText}</p>
          <button
            onClick={() => handleSuggestionClick(currentSuggestion)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Sending..." : "Create This For Me"}
            {!isLoading && <Send size={16} />}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ProactiveSuggestions;