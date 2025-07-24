// frontend/src/pages/SahayakAgentPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, db, storage } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import { Bot, User, UploadCloud } from 'lucide-react';

const agentOrchestratorFn = httpsCallable(functions, 'agentOrchestrator');

const ImageUploader = ({ topic, user, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleUpload = () => {
    if (!file || !topic || !user) return;
    setIsUploading(true);
    setFeedback(`Uploading "${file.name}"...`);
    const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      customMetadata: { teacherId: user.uid, topic: topic },
    });

    uploadTask.on('state_changed',
      (snapshot) => setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        setIsUploading(false);
        setFeedback("Upload failed. Please try again.");
        console.error("Upload error:", error);
      },
      () => {
        setIsUploading(false);
        const successMsg = `Upload complete! I'm now generating your worksheet on "${topic}". You can find it in the Worksheets tab shortly.`;
        setFeedback(successMsg);
        onUploadComplete(successMsg);
      },
    );
  };

  return (
    <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 max-w-lg">
      <div className="flex items-center gap-2">
        <UploadCloud className="text-primary" />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>
      {file && !isUploading && (
        <button onClick={handleUpload} className="w-full mt-2 bg-primary text-white text-sm py-1 rounded hover:bg-primary/90">
          Confirm and Upload for "{topic}"
        </button>
      )}
      {isUploading && (
        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 my-2">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {feedback && <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{feedback}</p>}
    </div>
  );
};

const SahayakAgentPage = () => {
  const { user } = useOutletContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [latestNudge, setLatestNudge] = useState(null);
  const [isNudgeLoading, setIsNudgeLoading] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Hi! I am Sahayak. How can I help you prepare for your class today? You can ask me to do multiple things at once!' },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!user?.uid) {
      setIsNudgeLoading(false);
      return;
    }
    const q = query(
      collection(db, "nudges"),
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nudges = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLatestNudge(nudges.length > 0 ? nudges[0] : null);
      setIsNudgeLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSendMessage = async () => {
    if (!prompt || isLoading) return;
    const currentPrompt = prompt;
    const newHumanMessage = { role: 'user', content: currentPrompt };
    setMessages((prev) => [...prev, newHumanMessage]);
    setPrompt('');
    setIsLoading(true);
    setError('');

    try {
      const result = await agentOrchestratorFn({ userPrompt: currentPrompt });
      const agentResponse = result.data;

      const newAgentMessage = {
        role: 'agent',
        content: agentResponse.content, // This now contains the full text
        // The check is now simpler and more robust
        component: agentResponse.uiPrompt ?
          <ImageUploader
            topic={agentResponse.uiPrompt.topic}
            user={user}
            onUploadComplete={(feedback) => {
              setMessages((prev) => [...prev, {role: 'agent', content: feedback}]);
            }}
          /> :
          null,
      };
      setMessages((prev) => [...prev, newAgentMessage]);
    } catch (err) {
      const errorMsg = "I'm sorry, I ran into a problem. Please try again.";
      setError(errorMsg);
      console.error("Error calling agent orchestrator:", err);
      setMessages((prev) => [...prev, {role: 'agent', content: errorMsg}]);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30 text-left">
        <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Proactive Suggestion ✨</h2>
        {isNudgeLoading && <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">Checking for new ideas...</p>}
        {!isNudgeLoading && latestNudge && (
          <p className="text-yellow-900 dark:text-yellow-100 mt-2 italic">"{latestNudge.suggestion}"</p>
        )}
        {!isNudgeLoading && !latestNudge && (
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">No new suggestions right now. Generate some content to give me ideas!</p>
        )}
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/30 space-y-4 text-left">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Chat with Sahayak</h2>

        <div className="h-96 overflow-y-auto p-4 bg-white dark:bg-gray-800 border rounded-md space-y-4 flex flex-col">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'agent' && <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
              <div className={`p-3 rounded-lg max-w-lg whitespace-pre-wrap ${msg.role === 'agent' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100' : 'bg-primary text-white'}`}>
                <p>{msg.content}</p>
                {msg.component && <div className="mt-2 border-t border-gray-300 dark:border-gray-600 pt-2">{msg.component}</div>}
              </div>
              {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white flex-shrink-0"><User size={20} /></div>}
            </div>
          ))}
          {isLoading && <div className="flex justify-start pl-11"><LoadingSpinner message="Sahayak is thinking..." /></div>}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Sahayak anything... e.g., 'Make a story and a worksheet about the water cycle'"
            className="w-full p-2 border rounded-md flex-1 bg-white dark:bg-gray-800 dark:border-gray-700"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button onClick={handleSendMessage} disabled={isLoading || !prompt} className="self-end bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 disabled:bg-gray-400">
            Send
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default SahayakAgentPage;