// frontend/src/components/MorningBriefingCard.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ensure your firebase config path is correct
import { useAuth } from '../hooks/useAuth'; // Your auth hook to get the current user
import { Sparkles, MessageSquare, Edit3 } from 'lucide-react';

const MorningBriefingCard = () => {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const fetchBriefing = async () => {
      try {
        const briefingsRef = collection(db, 'users', user.uid, 'briefings');
        const q = query(briefingsRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const latestBriefingDoc = querySnapshot.docs[0];
          setBriefing({ id: latestBriefingDoc.id, ...latestBriefingDoc.data() });
        } else {
          // Set a default, welcoming briefing if none exists yet
          setBriefing({
            isDefault: true,
            title: "Welcome to your Dashboard!",
            message: "Sahayak is ready to help. As you add a syllabus, proactive tips and lesson ideas will appear here each day.",
            suggestions: {
                storyIdea: "Try the Story Generator to create a tale about a local hero.",
                blackboardIdea: "Use the Chalkboard Aid to visualize the water cycle."
            }
          });
        }
      } catch (error) {
        console.error("Error fetching morning briefing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [user]);

  const handleMarkAsRead = async () => {
    if (briefing && briefing.isNew) {
      const briefingRef = doc(db, 'users', user.uid, 'briefings', briefing.id);
      await updateDoc(briefingRef, { isNew: false });
      setBriefing(prev => ({ ...prev, isNew: false }));
    }
  };

  if (loading) {
    return (
        <div className="w-full p-6 mb-6 bg-gray-100 border border-gray-200 rounded-xl animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
    );
  }

  if (!briefing) {
    return null; // Don't render anything if no briefing
  }

  return (
    <div onClick={handleMarkAsRead} className="relative p-6 mb-6 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 border border-indigo-200 rounded-2xl shadow-soft transition-all hover:shadow-lg cursor-pointer">
      {briefing.isNew && <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
      {briefing.isNew && <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
      
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="text-indigo-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">{briefing.title}</h2>
      </div>

      <p className="text-gray-700 text-lg mb-6">{briefing.message}</p>

      {briefing.suggestions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/60 p-4 rounded-lg">
            <div className="flex items-start gap-3">
                <MessageSquare className="text-purple-600 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-gray-700">Story Idea</h4>
                    <p className="text-gray-600 text-sm">{briefing.suggestions.storyIdea}</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Edit3 className="text-pink-600 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-gray-700">Blackboard Idea</h4>
                    <p className="text-gray-600 text-sm">{briefing.suggestions.blackboardIdea}</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MorningBriefingCard;