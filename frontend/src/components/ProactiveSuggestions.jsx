import React, { useState, useEffect } from 'react';
// import { useAuth } from './hooks/useAuth'; // Assuming you have an auth context
import { db, functions } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../hooks/useAuth';

// Get a reference to your main agent orchestrator function
const agentOrchestratorFn = httpsCallable(functions, 'agentOrchestrator');

const ProactiveSuggestions = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen for new suggestions in real-time
    const q = query(
      collection(db, `users/${user.uid}/proactiveSuggestions`),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  // THIS IS THE KEY FUNCTION THAT MAKES SUGGESTIONS ACTIONABLE
  const handleSuggestionClick = async (suggestion) => {
    setIsLoading(true);

    // Construct the user prompt based on the suggestion's action
    // e.g., "Explain the concept of what are black holes"
    const userPrompt = `${suggestion.actionType === 'explainConcept' ? 'Explain the concept of' : 'Tell a story about'} ${suggestion.actionPayload.topic}`;
    
    try {
      // Call the SAME orchestrator function you use for the main chat input!
      const result = await agentOrchestratorFn({ userPrompt });
      console.log("Agent finished task from suggestion:", result.data.content);
      // You can add a success toast notification here
      // Optionally, you can delete the suggestion from Firestore after it's used
    } catch (error) {
      console.error("Failed to execute suggestion:", error);
      // You can add an error toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  if (suggestions.length === 0) {
    return null; // Don't show anything if there are no suggestions
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 space-y-3">
      <h3 className="font-semibold text-gray-800">Sahayak's Ideas For You:</h3>
      {suggestions.map((s) => (
        <button
          key={s.id}
          onClick={() => handleSuggestionClick(s)}
          disabled={isLoading}
          className="w-full text-left p-3 bg-white rounded-md shadow-sm hover:bg-gray-100 disabled:opacity-50"
        >
          <p className="text-sm text-gray-700">{s.suggestionText}</p>
        </button>
      ))}
      {isLoading && <p className="text-sm text-center text-gray-500">Working on it...</p>}
    </div>
  );
};

export default ProactiveSuggestions;