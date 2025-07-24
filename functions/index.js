// functions/index.js

const functions = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const {VertexAI} = require("@google-cloud/vertexai");

initializeApp();

const DEPLOY_REGION = "us-east1";
const MODEL_NAME = "gemini-1.5-flash-latest";
const IMAGE_MODEL_NAME = "imagegeneration@0.0.5"; // Stable Imagen model


// We will initialize the client inside the function handlers.
let genAI;
let vertexAI;

// /**
//  * Sanitizes a Gemini history object to be Firestore-compatible.
//  * It ensures no 'undefined' values are present by converting them to 'null'.
//  * This function is moved to the top to prevent 'not defined' linting errors.
//  * @param {Array<object>} history The raw history array from the Gemini model.
//  * @return {Array<object>} A clean history array safe for Firestore.
//  */
// function sanitizeFirestoreHistory(history) {
//   if (!Array.isArray(history)) {
//     return [];
//   }
//   return history.map((message) => {
//     // Ensure the message and its parts are valid objects before proceeding
//     const msg = message || {};
//     const parts = Array.isArray(msg.parts) ? msg.parts : [];

//     return {
//       role: msg.role || "user", // Default to 'user' if role is missing
//       parts: parts.map((part) => {
//         const p = part || {};
//         return {
//           text: p.text || null, // Use null if text is undefined
//           functionCall: p.functionCall || null, // Use null if functionCall is undefined
//         };
//       }),
//     };
//   });
// }


/**
 * Generates text content using the Gemini model and saves it to Firestore.
 * @param {object} auth The authenticated user object from the request.
 * @param {string} userPrompt The original, simple prompt from the user.
 * @param {string} fullPrompt The detailed, engineered prompt for the AI.
 * @param {object} saveOptions Options for saving, e.g., {collection: "stories"}.
 * @return {Promise<string>} The generated text content from the AI model.
 */
// async function generateAndSaveText(auth, userPrompt, fullPrompt, saveOptions) {
//   if (!genAI) {
//     genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//   }
//   const textModel = genAI.getGenerativeModel({model: MODEL_NAME});

//   // --- THIS IS THE DEFINITIVE FIX ---
//   // We will now use the full, robust object format for the request.
//   // This prevents the '.contents' error and is the most reliable method.
//   const requestPayload = {
//     contents: [{role: "user", parts: [{text: fullPrompt}]}],
//   };
//   const result = await textModel.generateContent(requestPayload);
//   // ---------------------------------

//   const response = await result.response;
//   const responseText = response.text();

//   if (saveOptions && saveOptions.collection) {
//     const db = getFirestore();
//     await db.collection(saveOptions.collection).add({
//       teacherId: auth.uid,
//       userPrompt: userPrompt,
//       generatedContent: responseText,
//       createdAt: new Date(),
//     });
//   }
//   return responseText;
// }

// functions/index.js (Replacement for the generateTextContent function)

exports.generateTextContent = onCall({
  region: DEPLOY_REGION,
  secrets: ["GEMINI_API_KEY"],
}, async (request) => {
  // Check for authentication first
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", "You must be logged in to use this feature.",
    );
  }

  const {userPrompt, fullPrompt, saveOptions} = request.data;
  if (!userPrompt || !fullPrompt) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Missing required prompt parameters.",
    );
  }

  try {
    // Lazily initialize the client inside the handler
    if (!genAI) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    const textModel = genAI.getGenerativeModel({model: MODEL_NAME});

    // Directly call the Gemini API
    const result = await textModel.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Directly save to Firestore if requested
    if (saveOptions && saveOptions.collection) {
      const db = getFirestore();
      await db.collection(saveOptions.collection).add({
        teacherId: request.auth.uid,
        userPrompt: userPrompt,
        generatedContent: responseText,
        createdAt: new Date(),
      });
    }

    // Return the generated content to the frontend
    return {content: responseText};
  } catch (error) {
    console.error("generateTextContent CRITICAL ERROR:", error);
    throw new functions.https.HttpsError(
        "internal", "Error generating content.",
    );
  }
});
exports.generateDifferentiatedWorksheets = onObjectFinalized(
    {
      region: DEPLOY_REGION,
      timeoutSeconds: 300,
      memory: "1GiB",
      secrets: ["GEMINI_API_KEY"],
    },
    async (event) => {
      if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }
      const multimodalModel = genAI.getGenerativeModel({model: MODEL_NAME});

      const {bucket: fileBucket, name: filePath, contentType} = event.data;
      console.log(`Worksheet Function triggered. File: ${filePath}`);

      const metadata = event.data.metadata || {};
      if (!filePath.startsWith("uploads/") ||
      !contentType.startsWith("image/")) {
        console.log("File is not a valid image. Exiting.");
        return null;
      }

      const {topic, teacherId} = metadata;
      if (!teacherId || !topic) {
        console.error("Missing critical metadata. Exiting.");
        return null;
      }

      try {
      // Download the image from Cloud Storage into memory
        console.log("Downloading image from storage...");
        const bucket = getStorage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [imageBuffer] = await file.download();

        const imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: contentType,
          },
        };

        // --- THIS IS THE NEW, HIGH-QUALITY PROMPT ---
        const prompt = `You are an expert curriculum designer for Indian schools
Your task is to analyze the provided image on the topic of "${topic}"
and create a set of three differentiated worksheets.

**CRITICAL INSTRUCTIONS:**
1.  Generate exactly THREE worksheets for these grade levels: 
"Grades 3-5", "Grades 6-8", and "Grades 9-10".
2.  Each worksheet must contain exactly FIVE questions.
3.  The total marks for each worksheet must be EXACTLY 20. 
Distribute the marks logically among the five questions.
4.  Include a mix of question types across the worksheets: 
Multiple Choice (MCQ), Fill in the Blanks, True/False, 
Match the Following, and Short Answer.
5.  All content must be culturally and academically 
relevant to students in India.
6.  Respond ONLY with a valid JSON object. 
Do not include markdown formatting like \`\`\`json.

**JSON OUTPUT STRUCTURE:**
Your entire response must be a single JSON object with a root key "worksheets" 
which is an array of three worksheet objects. Follow this schema precisely:

{
  "worksheets": [
    {
      "title": "Worksheet Title (e.g., Introduction to Photosynthesis)",
      "gradeLevel": "Grades 3-5",
      "totalMarks": 20,
      "questions": [
        {
          "type": "Fill in the Blanks",
          "questionText": "Plants use sunlight, 
          water, and __ to make their food.",
          "marks": 4
        },
        {
          "type": "True/False",
          "questionText": "Plants breathe out oxygen.",
          "marks": 4
        },
        {
          "type": "MCQ",
          "questionText": "What part of the plant absorbs water?",
          "options": ["A) Leaf", "B) Stem", "C) Root", "D) Flower"],
          "answer": "C) Root",
          "marks": 4
        },
        {
          "type": "Match the Following",
          "columnA": ["Sunlight", "Water", "Leaf", "Oxygen"],
          "columnB": ["Gas we breathe out", "Energy source", 
          "Absorbed by roots", "Where food is made"],
          "marks": 4
        },
        {
          "type": "Short Answer",
          "questionText": "In one sentence, why are plants important for us?",
          "marks": 4
        }
      ]
    },
    {
      "title": "Worksheet Title for Grades 6-8",
      "gradeLevel": "Grades 6-8",
      "totalMarks": 20,
      "questions": [ ... ]
    },
    {
      "title": "Worksheet Title for Grades 9-10",
      "gradeLevel": "Grades 9-10",
      "totalMarks": 20,
      "questions": [ ... ]
    }
  ]
}
`;
        // --- END OF NEW PROMPT ---

        console.log(`Calling Google AI SDK with model: ${MODEL_NAME}`);
        const result = await multimodalModel.generateContent(
            [prompt, imagePart],
        );
        const response = await result.response;
        const responseText = response.text();

        console.log("Received response, parsing JSON...");

        const jsonRegex = /^```json\s*|```\s*$/g;
        const cleanJsonString = responseText.replace(jsonRegex, "");
        const generatedWorksheets = JSON.parse(cleanJsonString);

        const db = getFirestore();
        await db.collection("worksheets").add({
          teacherId,
          topic,
          originalImagePath: filePath,
          generatedContent: generatedWorksheets,
          createdAt: new Date(),
        });

        console.log(`Worksheet successfully saved for teacher ${teacherId}`);
        return null;
      } catch (error) {
        console.error("CRITICAL ERROR in worksheets function:", error);
        return null;
      }
    },
);

exports.generateChalkboardAid = onCall({
  region: DEPLOY_REGION,
  // NO LONGER NEEDS SECRETS, as it uses the service account identity
  timeoutSeconds: 300,
  memory: "1GiB",
}, async (request) => {
  // Initialize Vertex AI client using the function's own identity (ADC)
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
  }

  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", "You must be logged in.",
    );
  }
  const {prompt} = request.data;
  if (!prompt) {
    throw new functions.https.HttpsError(
        "invalid-argument", "A prompt is required.",
    );
  }

  try {
    const fullPrompt = `A simple, clean, black and white line drawing of
      '${prompt}'. The style should be a clear diagram suitable for a
      chalkboard, with minimal shading. White background.`;

    console.log("Calling Imagen API with prompt:", fullPrompt);

    const imageModel = vertexAI.getGenerativeModel({model: IMAGE_MODEL_NAME});
    const resp = await imageModel.generateContent({
      contents: [{role: "user", parts: [{text: fullPrompt}]}],
    });

    const base64ImageData =
    resp.response.candidates[0].content.parts[0].fileData.fileUri;
    const imageBuffer = Buffer.from(base64ImageData, "base64");

    console.log("Image generated. Uploading to Cloud Storage...");

    const bucket = getStorage().bucket();
    const filePath = `chalkboardAids/${request.auth.uid}/${Date.now()}.png`;
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {contentType: "image/png"},
    });
    await file.makePublic();

    const publicUrl = file.publicUrl();
    console.log("Image uploaded successfully:", publicUrl);

    const db = getFirestore();
    await db.collection("chalkboardAids").add({
      teacherId: request.auth.uid,
      userPrompt: prompt,
      imageUrl: publicUrl,
      createdAt: new Date(),
    });

    console.log("Chalkboard aid saved to Firestore.");
    return {imageUrl: publicUrl};
  } catch (error) {
    console.error("CRITICAL ERROR in image generation:", error);
    throw new functions.https.HttpsError(
        "internal", "Failed to generate the image.",
    );
  }
});

exports.processSyllabus = onObjectFinalized(
    {
      region: DEPLOY_REGION,
      timeoutSeconds: 540, // Give it more time for long documents
      memory: "2GiB", // Give it more memory
      secrets: ["GEMINI_API_KEY"],
    },
    async (event) => {
      if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }
      // We need a model with a large context window for this task
      const model = genAI.getGenerativeModel({model: "gemini-1.5-pro-latest"});

      const {bucket: fileBucket, name: filePath, contentType} = event.data;

      // We'll create a special folder in Storage for syllabus uploads
      if (!filePath.startsWith("syllabus_uploads/") || contentType !== "application/pdf") {
        console.log("This is not a new syllabus PDF. Exiting.");
        return null;
      }

      const {teacherId} = event.data.metadata || {};
      if (!teacherId) {
        console.error("Missing teacherId metadata on the uploaded file. Exiting.");
        return null;
      }

      try {
        console.log(`Processing new syllabus PDF: ${filePath}`);
        const bucket = getStorage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [pdfBuffer] = await file.download();

        const pdfPart = {
          inlineData: {
            data: pdfBuffer.toString("base64"),
            mimeType: "application/pdf",
          },
        };

        const prompt = `You are an expert curriculum architect for Indian schools.
      Analyze this entire curriculum PDF. Your primary task is to break it down into a structured 36-week school year plan.
      For each week, identify the main topics to be taught.
      Respond ONLY with a valid JSON array. Do not include markdown.
      Each object in the array must represent a single topic and have these three keys: "topic" (string), "grade" (number, if specified), and "weekNumber" (number).`;

        console.log("Calling Gemini 1.5 Pro to architect the yearly plan...");
        const result = await model.generateContent([prompt, pdfPart]);
        const response = await result.response;
        const syllabusArray = JSON.parse(response.text());

        console.log(`AI generated a ${syllabusArray.length}-item syllabus. Saving to Firestore...`);
        const db = getFirestore();
        const batch = db.batch();

        // Save each generated topic to the syllabusPlan collection
        syllabusArray.forEach((item) => {
          const docRef = db.collection("syllabusPlan").doc(); // Create a new doc
          batch.set(docRef, {
            ...item,
            teacherId: teacherId,
            isPlanned: false, // This flag is still needed for our n8n workflow
          });
        });

        await batch.commit();
        console.log("Successfully saved the entire yearly syllabus plan to Firestore.");
        return null;
      } catch (error) {
        console.error("CRITICAL ERROR in processSyllabus function:", error);
        return null;
      }
    },
);

// functions/index.js (Replacement for agentOrchestrator)

exports.agentOrchestrator = onCall({
  region: DEPLOY_REGION,
  secrets: ["GEMINI_API_KEY"],
  timeoutSeconds: 300,
}, async (request) => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", "Auth is required.",
    );
  }
  const {userPrompt} = request.data;
  if (!userPrompt) {
    throw new functions.https.HttpsError(
        "invalid-argument", "A user prompt is required.",
    );
  }

  const tools = [
    {
      functionDeclarations: [
        {
          name: "generateStory",
          description: "Generates a simple, culturally relevant story to make a topic more engaging for young children (Grades 2-5). Use this to introduce a new concept in a fun, narrative way.",
          parameters: {
            type: "OBJECT",
            properties: {
              topic: {
                type: "STRING",
                description: "The core educational theme the story should be about, e.g., 'the importance of washing hands' or 'the water cycle'.",
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "explainConcept",
          description: "Breaks down a single, complex concept into a simple explanation with a relatable analogy for students. Use this to clarify a specific point or answer a potential student question like 'what is...?' or 'why...?'",
          parameters: {
            type: "OBJECT",
            properties: {
              concept: {
                type: "STRING",
                description: "The specific concept or question to explain, e.g., 'gravity' or 'why the sky is blue'.",
              },
            },
            required: ["concept"],
          },
        },
        {
          name: "requestWorksheetImage",
          description: "Should be used when the teacher mentions needing a 'worksheet', 'quiz', 'test', 'exam', or 'assessment' for a specific topic. This tool's purpose is to ask the user to upload an image of the relevant textbook page.",
          parameters: {
            type: "OBJECT",
            properties: {
              topic: {
                type: "STRING",
                description: "The topic the worksheet should be about. This will be used in the follow-up prompt to the user.",
              },
            },
            required: ["topic"],
          },
        },
      ],
    },
  ];

  const agentModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const fullAgentPrompt = `You are Sahayak, an expert, proactive AI teaching companion for educators in under-resourced, multi-grade classrooms in rural India. Your primary goal is to anticipate the teacher's needs and provide comprehensive support.

Teacher's Request: "${userPrompt}"

Your Reasoning Process:
1.  Identify the Core Topic.
2.  Infer Unstated Needs: What materials would be most helpful? Does the topic need a story, an explanation, or a worksheet?
3.  Select ALL Relevant Tools: Based on your inferences, select all tools that will help. You can and should call multiple tools in parallel.
4.  No Suitable Tools?: If no tools fit, provide a direct, helpful text response.

Now, determine the appropriate tool calls.`;

  try {
    console.log("Sahayak Agent: Sending prompt to model...");
    const result = await agentModel.generateContent(fullAgentPrompt);
    const response = result.response;
    const calls = response.functionCalls();

    if (!calls || calls.length === 0) {
      console.log("Sahayak Agent: No tool call needed. Responding with text.");
      return {
        type: "text",
        content: response.text(),
      };
    }

    console.log(`Sahayak Agent: Model wants to call ${calls.length} tool(s).`);

    const toolExecutionPromises = calls.map((call) => {
      console.log(`- Preparing tool: ${call.name}`);
      const modelForTool = genAI.getGenerativeModel({model: MODEL_NAME});

      if (call.name === "generateStory") {
        const storyTopic = call.args.topic;
        const fullPrompt = `Create a story about: "${storyTopic}".`;
        return modelForTool.generateContent(fullPrompt).then(async (toolResult) => {
          const content = (await toolResult.response).text();
          const db = getFirestore();
          await db.collection("stories").add({
            teacherId: request.auth.uid,
            userPrompt: storyTopic,
            generatedContent: content,
            createdAt: new Date(),
          });
          return {type: "summary", summary: `Story about "${storyTopic}"`};
        });
      }

      if (call.name === "explainConcept") {
        const concept = call.args.concept;
        const fullPrompt = `Explain simply: "${concept}".`;
        return modelForTool.generateContent(fullPrompt).then(async (toolResult) => {
          const content = (await toolResult.response).text();
          const db = getFirestore();
          await db.collection("concepts").add({
            teacherId: request.auth.uid,
            userPrompt: concept,
            generatedContent: content,
            createdAt: new Date(),
          });
          return {type: "summary", summary: `Explanation for "${concept}"`};
        });
      }

      if (call.name === "requestWorksheetImage") {
        return Promise.resolve({
          type: "ui_prompt",
          tool: "requestWorksheetImage",
          topic: call.args.topic,
        });
      }
      return Promise.resolve(null);
    });

    const toolResults = await Promise.all(toolExecutionPromises);
    const successfulTools = toolResults.filter(Boolean);

    const uiPromptResult = successfulTools.find((t) => t.type === "ui_prompt");
    const summaryResults = successfulTools
        .filter((t) => t.type === "summary")
        .map((t) => t.summary);

    let confirmationMessage = "";
    if (summaryResults.length > 0) {
      confirmationMessage = `I've finished your request! I created: ${summaryResults.join(" and ")}. You can find them in their dedicated history pages.`;
    }

    if (uiPromptResult) {
      if (confirmationMessage) { // If other tasks were also done
        confirmationMessage += `\n\nAdditionally, I can create a worksheet on "${uiPromptResult.topic}", but I need an image of the textbook page first.`;
      } else { // If ONLY an image was requested
        confirmationMessage = `Great! I can create a worksheet on "${uiPromptResult.topic}". Please upload an image of the textbook page you'd like me to use.`;
      }
    }

    return {
      type: "final_response", // A consistent type for any agent action
      content: confirmationMessage,
      uiPrompt: uiPromptResult || null, // Always include uiPrompt, even if it's null
    };
  } catch (error) {
    console.error("Agent Orchestrator CRITICAL ERROR:", error);
    throw new functions.https.HttpsError(
        "internal", "The agent failed to process your request.",
    );
  }
});

exports.proactiveNudgeAgent = onSchedule({
  schedule: "every 24 hours",
  region: DEPLOY_REGION,
  secrets: ["GEMINI_API_KEY"],
  timeoutSeconds: 300,
  memory: "512MiB",
}, async (event) => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  const nudgeModel = genAI.getGenerativeModel({model: MODEL_NAME});
  const db = getFirestore();

  console.log("Running Simplified Proactive Nudge Agent...");

  // In this simplified version, we need a way to get a teacher to assign the nudge to.
  // We'll just grab the first teacher we find in the 'teachers' collection.
  // NOTE: For this to work, you must have at least one user created.
  const teachersQuery = db.collection("teachers").limit(1);
  const teachersSnapshot = await teachersQuery.get();

  if (teachersSnapshot.empty) {
    console.log("No teachers found. Cannot generate a nudge.");
    return null;
  }
  const teacherId = teachersSnapshot.docs[0].id;
  console.log(`Found a teacher to receive a nudge: ${teacherId}`);

  try {
    const nudgePrompt = `You are Sahayak, an AI teaching companion.
Generate a single, encouraging, and creative "Teaching Tip of the Day" for a teacher in a rural Indian school.
The tip should be short (one sentence) and easy to implement.
Example: "Try starting tomorrow's class with a fun one-minute energizer game!"
Another Example: "How about asking students to draw a picture related to today's lesson?"`;

    console.log("Generating a generic teaching tip...");
    const result = await nudgeModel.generateContent(nudgePrompt);
    const nudgeText = result.response.text();

    await db.collection("nudges").add({
      teacherId: teacherId,
      suggestion: nudgeText,
      createdAt: new Date(),
      seen: false,
    });

    console.log(`Successfully saved nudge for teacher ${teacherId}: "${nudgeText}"`);
    return null;
  } catch (error) {
    console.error("CRITICAL ERROR in proactiveNudgeAgent:", error);
    return null; // Ensure the function exits gracefully
  }
});
