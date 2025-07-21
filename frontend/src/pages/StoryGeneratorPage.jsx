import React, { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import LoadingSpinner from '../components/LoadingSpinner';

const generateTextFn = httpsCallable(functions, 'generateTextContent');

const StoryGeneratorPage = () => {
    const [prompt, setPrompt] = useState('');
    const [story, setStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setStory('');
        try {
            const fullPrompt = `You are an AI assistant for teachers in rural India. Create a simple, culturally relevant story for children (Grades 2-4) in English based on this idea: "${prompt}". The story should be engaging and easy to understand.`;
            const result = await generateTextFn({ prompt: fullPrompt });
            setStory(result.data.content);
        } catch (error) {
            console.error("Error generating story:", error);
            setStory("Sorry, an error occurred. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Hyperlocal Story Generator</h2>
            <p className="text-sm text-gray-600">Generate stories in local dialects and contexts (e.g., Hindi, Marathi).</p>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Create a story in Marathi about farmers to explain different soil types"
                className="w-full p-2 border rounded"
                rows="3"
            ></textarea>
            <button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                {isLoading ? "Generating..." : "Generate Story"}
            </button>
            {isLoading && <LoadingSpinner message="Writing a new story..." />}
            {story && (
                <div className="bg-white p-4 border rounded mt-4">
                    <h3 className="font-bold mb-2">Generated Story:</h3>
                    <pre className="whitespace-pre-wrap font-sans">{story}</pre>
                </div>
            )}
        </div>
    );
};

export default StoryGeneratorPage;