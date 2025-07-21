import React, { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import LoadingSpinner from '../components/LoadingSpinner';

const generateTextFn = httpsCallable(functions, 'generateTextContent');

const ConceptExplainerPage = () => {
    const [prompt, setPrompt] = useState('');
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setExplanation('');
        try {
            const fullPrompt = `You are an AI assistant for a teacher in a multi-grade Indian classroom. A student asked: "${prompt}". Explain this concept in the local language requested (or simple English if not specified). Use a very simple analogy that a child can easily understand.`;
            const result = await generateTextFn({ prompt: fullPrompt });
            setExplanation(result.data.content);
        } catch (error) {
            console.error("Error generating explanation:", error);
            setExplanation("Sorry, an error occurred. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Instant Knowledge Base</h2>
            <p className="text-sm text-gray-600">Get simple explanations for complex student questions.</p>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Why is the sky blue?"
                className="w-full p-2 border rounded"
                rows="3"
            ></textarea>
            <button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                {isLoading ? "Explaining..." : "Explain Concept"}
            </button>
            {isLoading && <LoadingSpinner message="Thinking of a good analogy..." />}
            {explanation && (
                <div className="bg-white p-4 border rounded mt-4">
                    <h3 className="font-bold mb-2">Simple Explanation:</h3>
                    <pre className="whitespace-pre-wrap font-sans">{explanation}</pre>
                </div>
            )}
        </div>
    );
};

export default ConceptExplainerPage;