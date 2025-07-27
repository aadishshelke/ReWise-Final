// frontend/src/pages/SahayakAgentPage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { functions, storage } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { Bot, User, Sparkles, Send, Loader, FileUp, Feather, BrainCircuit, FileText, PenSquare, UploadCloud, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MY TEAMMATE'S COMPONENTS - RETAINED FOR THE UI ---
// I have brought in ProactiveSuggestions from my own code to integrate it.
import ProactiveSuggestions from '../components/ProactiveSuggestions';


// --- BACKEND FUNCTION (FROM MY CODE) ---
const agentOrchestratorFn = httpsCallable(functions, 'agentOrchestrator');
const generateProactiveSuggestionsFn = httpsCallable(functions, 'generateProactiveSuggestions');
const transcribeAudioFn = httpsCallable(functions, 'transcribeAudio');

// ====================================================================================
// START: MERGED AND UPGRADED UI SUB-COMPONENTS
// These are primarily from the teammate's new UI, with my functionality integrated.
// ====================================================================================

const WelcomeBlock = ({ onChipClick }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-center h-full"
    >
        <div className="relative">
            <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="p-5 bg-surface/50 backdrop-blur-md rounded-3xl border border-border-subtle shadow-glow-md"
            >
                <Sparkles className="h-12 w-12 text-primary" />
            </motion.div>
        </div>
        <h1 className="mt-8 text-4xl sm:text-5xl font-bold tracking-tight text-text-main">ReWise Agent</h1>
        <p className="mt-4 text-lg text-text-secondary max-w-xl">Your one-stop AI assistant for teaching. What can I create for you?</p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            <CommandModule onClick={() => onChipClick("Create a story about the importance of trees")} icon={<Feather />} text="Create a Story" color="energy-pink" />
            <CommandModule onClick={() => onChipClick("Explain photosynthesis with a simple analogy")} icon={<BrainCircuit />} text="Explain a Concept" color="energy-blue" />
            <CommandModule onClick={() => onChipClick("I need a worksheet for the solar system")} icon={<FileText />} text="Make a Worksheet" color="energy-green" />
            <CommandModule onClick={() => onChipClick("Draw a diagram of the water cycle for my chalkboard")} icon={<PenSquare />} text="Chalkboard Aid" color="energy-amber" />
        </div>
    </motion.div>
);

const CommandModule = ({ onClick, icon, text, color }) => (
    <motion.button
        whileHover={{ scale: 1.03, y: -5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group relative overflow-hidden flex items-center justify-center gap-4 px-6 py-5 text-base bg-surface border border-border-subtle rounded-xl text-text-secondary transition-all duration-300 shadow-2xl shadow-black/40 hover:border-white/20"
    >
        <div className={`absolute inset-0 -z-10 bg-${color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
        <div className={`absolute -z-20 top-1/2 left-1/2 w-32 h-32 bg-${color} rounded-full blur-3xl opacity-30 group-hover:opacity-60 group-hover:w-48 group-hover:h-48 transition-all duration-500`}></div>
        {React.cloneElement(icon, { className: `transition-colors h-7 w-7 text-gray-400 group-hover:text-${color}` })}
        <span className="font-semibold text-text-main text-lg">{text}</span>
    </motion.button>
);

const GenerationView = ({ processingPrompt }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
    >
        <div className="text-center mb-8">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-3 rounded-full border border-primary/20"
            >
                <Loader className="animate-spin text-primary" size={20} />
                <h2 className="text-xl font-bold text-text-main">Generating Your Content</h2>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 p-4 bg-surface/50 backdrop-blur-sm rounded-xl border border-border-subtle max-w-2xl mx-auto"
            >
                <p className="text-text-secondary text-sm mb-1">Request:</p>
                <p className="text-text-main font-medium">"{processingPrompt}"</p>
            </motion.div>
        </div>

        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-surface/30 backdrop-blur-sm rounded-2xl p-6 border border-border-subtle"
            >
                <div className="space-y-4">
                    <div className="h-6 bg-border-subtle/50 rounded-lg animate-pulse w-3/4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-border-subtle/50 rounded animate-pulse"></div>
                        <div className="h-4 bg-border-subtle/50 rounded animate-pulse w-5/6"></div>
                        <div className="h-4 bg-border-subtle/50 rounded animate-pulse w-4/5"></div>
                    </div>
                    <div className="space-y-3 mt-6">
                        <div className="h-4 bg-border-subtle/50 rounded animate-pulse w-2/3"></div>
                        <div className="h-4 bg-border-subtle/50 rounded animate-pulse w-3/4"></div>
                    </div>
                </div>
            </motion.div>
        </div>
    </motion.div>
);

// This is MY ImageUploader functionality, but styled to fit the new UI.
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
    <div className="mt-4 p-4 rounded-lg bg-surface-sunken border border-border-subtle">
      <p className="font-semibold mb-2 text-text-main">Upload an image for your worksheet</p>
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
        <button onClick={handleUpload} className="w-full mt-3 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90">
          Confirm and Upload for "{topic}"
        </button>
      )}
      {isUploading && (
        <div className="w-full bg-surface-sunken rounded-full h-2.5 my-2">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {feedback && <p className="text-xs text-text-secondary mt-2">{feedback}</p>}
    </div>
  );
};


// const InputBar = ({ prompt, setPrompt, isLoading, onSend }) => {
  const InputBar = ({ prompt, setPrompt, isLoading, onSend, isRecording, isTranscribing, onMicClick }) => {
    const textareaRef = useRef(null);
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading && prompt.trim()) { onSend(); } } };
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [prompt]);

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-background/30 backdrop-blur-lg border-t border-border-subtle">
            <div className="w-full mx-auto px-6 md:px-10 py-4">
                <div className="relative flex items-end gap-3">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message ReWise Agent... (e.g., 'Make me a quiz on cellular respiration')"
                        className="flex-1 p-3 bg-surface border border-border-main rounded-2xl resize-none max-h-48 text-text-main placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                        rows={1}
                    />
                    <motion.button
                        onClick={onMicClick}
                        disabled={isLoading || isTranscribing}
                        className="p-3 rounded-full text-white disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        animate={isRecording ? { scale: 1.1, backgroundColor: "#ef4444" } : { scale: 1, backgroundColor: "#8b5cf6" }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <AnimatePresence mode="wait">
                            {isTranscribing ? (
                                <motion.div key="loader" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}><Loader size={20} className="animate-spin" /></motion.div>
                            ) : (
                                <motion.div key="mic" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                                    // Flashing animation while recording
                                    transition={isRecording ? { duration: 0.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : {}}
                                    animate={isRecording ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
                                >
                                    <Mic size={20} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    <button onClick={onSend} disabled={isLoading || !prompt.trim() || isRecording || isTranscribing} className="p-3 rounded-full bg-primary text-white disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"><Send size={20} /></button>
                </div>
            </div>
        </div>
    );
};

const ChatSessionContainer = ({ title, messages, isLoading, chatEndRef }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-grow bg-surface/30 backdrop-blur-sm border border-border-subtle rounded-2xl p-6 shadow-lg max-w-4xl w-full mx-auto" // mb-4 removed to be controlled by parent
        >
            <div className="pb-4 mb-4 border-b border-border-subtle">
                <h2 className="text-xl font-semibold text-text-main">{title}</h2>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-4 mb-6 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                        {msg.role === 'agent' && (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                <Bot size={24} />
                            </div>
                        )}
                        <div className={`p-4 rounded-2xl max-w-2xl ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-surface border border-border-subtle rounded-bl-none'}`}>
                            {/* Whitespace-pre-wrap preserved from my functional code */}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.component && (
                                <div className="mt-2 border-t border-border-subtle pt-3">
                                    {msg.component}
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white flex-shrink-0">
                                <User size={24} />
                            </div>
                        )}
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 mb-6"
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                            <Bot size={24} />
                        </div>
                        <div className="p-4 rounded-2xl max-w-2xl bg-surface border border-border-subtle">
                            <div className="flex items-center gap-3">
                                <Loader className="animate-spin text-primary" />
                                <p className="text-text-secondary">ReWise Agent is thinking...</p>
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={chatEndRef} />
            </div>
        </motion.div>
    );
};


// Main Page Component - Merged Logic
const SahayakAgentPage = () => {
    const { user } = useOutletContext();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [processingPrompt, setProcessingPrompt] = useState('');
    const [hasChatStarted, setHasChatStarted] = useState(false);
    const [firstPrompt, setFirstPrompt] = useState('');
    const chatEndRef = useRef(null);
    const [error, setError] = useState('');

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // *** THIS IS THE DEFINITIVE FIX FOR THE ESLINT WARNING ***
    // The handleSendMessage function is now wrapped in useCallback.
    // Its dependencies are listed, so React knows when to recreate it.
    // This makes the function stable across re-renders.
    const handleSendMessage = useCallback(async () => {
      if (!prompt || isLoading || !user) return;
  
      const currentPrompt = prompt;
      if (!hasChatStarted) {
          setFirstPrompt(currentPrompt);
          setHasChatStarted(true);
      }
      setProcessingPrompt(currentPrompt); 
      const newUserMessage = { role: 'user', content: currentPrompt };
  
      setMessages((prev) => [...prev, newUserMessage]);
      setPrompt('');
      setIsLoading(true);
      setError('');
  
      try {
          const result = await agentOrchestratorFn({ userPrompt: currentPrompt });
          const agentResponse = result.data;
  
          const newAgentMessage = {
              role: 'agent',
              content: agentResponse.content,
              component: agentResponse.uiPrompt ?
                  <ImageUploader
                      topic={agentResponse.uiPrompt.topic}
                      user={user}
                      onUploadComplete={(feedback) => {
                          setMessages((prev) => [...prev, { role: 'agent', content: feedback, component: null }]);
                          generateProactiveSuggestionsFn({ teacherId: user.uid });
                      }}
                  /> :
                  null,
          };
          
          setMessages((prev) => [...prev, newAgentMessage]);
  
          console.log("Triggering proactive agent in the background...");
          generateProactiveSuggestionsFn({ teacherId: user.uid });
  
      } catch (err) {
          const errorMsg = "I'm sorry, I ran into a problem. Please try again.";
          setError(errorMsg);
          console.error("Error calling agent orchestrator:", err);
          setMessages((prev) => [...prev, { role: 'agent', content: errorMsg, component: null }]);
      } finally {
          setIsLoading(false);
          setProcessingPrompt('');
      }
  }, [prompt, isLoading, user, hasChatStarted]); // Dependency array for useCallback
    
    // Wrapped in useCallback for consistency and best practice.
    const handleChipClick = useCallback((chipPrompt) => {
      setPrompt(chipPrompt);
    }, []);

    const suggestionToSend = useRef(null);

    // Wrapped in useCallback for consistency and best practice.
    const handleSuggestionActionV2 = useCallback((suggestionPrompt) => {
      suggestionToSend.current = suggestionPrompt;
      setPrompt(suggestionPrompt);
  }, []);
    
    // This useEffect is now stable because handleSendMessage is stable.
    useEffect(() => {
        if (suggestionToSend.current && prompt === suggestionToSend.current) {
            handleSendMessage();
            suggestionToSend.current = null;
        }
    }, [prompt, handleSendMessage]);

     // *** NEW: The core logic for handling microphone clicks ***
     const handleMicClick = async () => {
      if (isTranscribing) return; // Don't do anything if currently processing

      if (isRecording) {
          // --- STOP RECORDING ---
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      } else {
          // --- START RECORDING ---
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
              audioChunksRef.current = []; // Clear previous recording chunks

              mediaRecorderRef.current.addEventListener("dataavailable", event => {
                  audioChunksRef.current.push(event.data);
              });

              mediaRecorderRef.current.addEventListener("stop", async () => {
                  setIsTranscribing(true);
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
                  
                  // Convert Blob to Base64 to send to the function
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = async () => {
                      const base64Audio = reader.result.split(',')[1];
                      try {
                          const result = await transcribeAudioFn({ audioBase64: base64Audio });
                          setPrompt(result.data.transcript);
                      } catch (err) {
                          console.error("Transcription failed:", err);
                          setError("Sorry, I couldn't understand that. Please try again.");
                      } finally {
                          setIsTranscribing(false);
                          // Clean up the stream tracks
                          stream.getTracks().forEach(track => track.stop());
                      }
                  };
              });

              mediaRecorderRef.current.start();
              setIsRecording(true);
          } catch (err) {
              console.error("Microphone access denied or error:", err);
              setError("Microphone access is needed for this feature.");
          }
      }
  };

    return (
        <div className="bg-background text-text-main h-[calc(100vh-80px)] flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 -z-10 w-full h-full bg-gradient-to-tr from-background via-primary/5 to-background animate-aurora-pan"></div>
            <div className="flex-grow w-full px-6 md:px-10 pt-4 md:pt-8 pb-40 overflow-y-auto">
                <AnimatePresence>
                    {isLoading && !hasChatStarted ? (<GenerationView key="generation-view" processingPrompt={processingPrompt} />) : 
                    !hasChatStarted ? (<motion.div key="welcome" className="h-full"><WelcomeBlock onChipClick={handleChipClick} /></motion.div>) : 
                    (<div className="space-y-4"><ProactiveSuggestions user={user} onSuggestionAction={handleSuggestionActionV2} /><ChatSessionContainer key="chat-session" title={firstPrompt} messages={messages} isLoading={isLoading} chatEndRef={chatEndRef}/></div>)}
                </AnimatePresence>
                {error && (<div className="flex justify-center"><p className="text-red-500">{error}</p></div>)}
            </div>
            <InputBar prompt={prompt} setPrompt={setPrompt} isLoading={isLoading} onSend={handleSendMessage} isRecording={isRecording} isTranscribing={isTranscribing} onMicClick={handleMicClick} />
        </div>
    );
};

export default SahayakAgentPage;