import React, { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import LoadingSpinner from '../components/LoadingSpinner';

const generateTextFn = httpsCallable(functions, 'generateTextContent');

const ChalkboardViewPage = () => {
    const [prompt, setPrompt] = useState('');
    const [diagram, setDiagram] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setDiagram('');
        try {
            // This prompt is specifically engineered to ask for a JSON response
            const fullPrompt = `You are an AI assistant helping a teacher in a low-resource classroom. Generate content for a concept that can be drawn on a blackboard.
            The concept is: "${prompt}".
            Provide a text description of a simple line drawing for the concept, and a few key bullet points in simple English or Hindi.
            Respond ONLY with a valid JSON object in the format:
            {
              "drawingDescription": "A step-by-step text description of how to draw the diagram.",
              "bulletPoints": ["Point 1", "Point 2", "Point 3"]
            }`;
            const result = await generateTextFn({ prompt: fullPrompt });
            // We need to parse the JSON string returned by the model
            // const parsedContent = JSON.parse(result.data.content);

            const jsonRegex = /^```json\s*|```\s*$/g;
            const cleanJsonString = result.data.content.replace(jsonRegex, "");
            const parsedContent = JSON.parse(cleanJsonString);

            setDiagram(parsedContent);
        } catch (error) {
            console.error("Error generating diagram:", error);
            setDiagram({ error: "Sorry, an error occurred or the response was not valid JSON. Please try a different prompt." });
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Design Visual Aids (ShikshaBox)</h2>
            <p className="text-sm text-gray-600">Generate simple diagrams and charts to draw on the blackboard.</p>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., The solar system"
                className="w-full p-2 border rounded"
                rows="3"
            ></textarea>
            <button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                {isLoading ? "Designing..." : "Generate Chalkboard Aid"}
            </button>
            {isLoading && <LoadingSpinner message="Sketching the diagram..." />}
            {diagram && !diagram.error && (
                <div className="bg-white p-4 border rounded mt-4 space-y-3">
                    <div>
                        <h3 className="font-bold">Drawing Instructions:</h3>
                        <p className="whitespace-pre-wrap font-sans">{diagram.drawingDescription}</p>
                    </div>
                    <div>
                        <h3 className="font-bold">Key Points to Write:</h3>
                        <ul className="list-disc pl-5 font-sans">
                            {diagram.bulletPoints?.map((point, index) => <li key={index}>{point}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            {diagram && diagram.error && (
                <p className="text-red-500 mt-4">{diagram.error}</p>
            )}
        </div>
    );
};

export default ChalkboardViewPage;