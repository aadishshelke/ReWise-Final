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
const admin = require("firebase-admin");

initializeApp();

const DEPLOY_REGION = "us-east1";
// const IMAGE_DEPLOY_REGION = "us-central1";
const MODEL_NAME = "gemini-1.5-flash-latest";
const IMAGE_MODEL_NAME = "imagen-3.0-fast-generate-001"; // Stable Imagen model
const PRO_MODEL_NAME = "gemini-1.5-pro-latest"; // For complex reasoning

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

exports.generateDailyBriefings = onSchedule({
  schedule: "every day 07:00",
  timeZone: "Asia/Kolkata", // Set to Indian Standard Time
  region: DEPLOY_REGION,
  timeoutSeconds: 540,
  memory: "1GiB",
}, async (event) => {
  console.log("AGENT BRAIN: Waking up to prepare morning briefings.");
  if (!vertexAI) {
    vertexAI = new VertexAI({project: process.env.GCLOUD_PROJECT, location: DEPLOY_REGION});
  }
  const model = vertexAI.getGenerativeModel({model: PRO_MODEL_NAME});
  const db = getFirestore();

  const usersSnapshot = await db.collection("users").get();
  if (usersSnapshot.empty) {
    console.log("AGENT BRAIN: No teachers found. Going back to sleep.");
    return;
  }

  const dayOfYear = (new Date().setUTCHours(0, 0, 0, 0) - new Date(new Date().getUTCFullYear(), 0, 0)) / 86400000;
  const currentWeek = Math.ceil(dayOfYear / 7);

  for (const userDoc of usersSnapshot.docs) {
    const teacherId = userDoc.id;
    console.log(`AGENT BRAIN: Preparing briefing for teacher: ${teacherId}, Week: ${currentWeek}`);
    try {
      const syllabusQuery = db.collection("syllabusPlan")
          .where("teacherId", "==", teacherId)
          .where("weekNumber", "==", currentWeek);
      const syllabusSnapshot = await syllabusQuery.get();
      if (syllabusSnapshot.empty) {
        console.log(`No syllabus found for teacher ${teacherId} for week ${currentWeek}. Skipping.`);
        continue;
      }

      const topics = syllabusSnapshot.docs.map((doc) => {
        const data = doc.data();
        return `Topic: "${data.topic}" for Grade ${data.grade}`;
      }).join(", ");

      const prompt = `
          You are "Sahayak," an AI teaching companion for a teacher in a multi-grade Indian classroom.
          Your task is to create a proactive, encouraging "Morning Briefing" based on the topics for the current week.

          **Context:**
          - Teacher ID: ${teacherId}
          - Current School Week: ${currentWeek}
          - Topics for this week: ${topics}

          **Instructions:**
          1.  **Title:** Create a short, inspiring title for the briefing (e.g., "A Week of Discovery!", "Exploring Our World").
          2.  **Message:** Write a 1-2 sentence encouraging message that introduces the week's theme based on the topics.
          3.  **Story Idea:** Suggest a simple, one-sentence idea for a story in a local Indian context related to one of the topics.
          4.  **Blackboard Idea:** Suggest a simple, one-sentence description of a line drawing or chart for the blackboard to explain a concept.
          5.  **Response Format:** Respond ONLY with a valid JSON object. Do not use markdown.

          **JSON OUTPUT STRUCTURE:**
          {
            "title": "Your Generated Title",
            "message": "Your generated 1-2 sentence message.",
            "suggestions": {
              "storyIdea": "Your generated story idea.",
              "blackboardIdea": "Your generated blackboard idea."
            }
          }
          `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.candidates[0].content.parts[0].text;
      const cleanJsonString = responseText.replace(/^```json\s*|```\s*$/g, "");
      const briefingData = JSON.parse(cleanJsonString);

      await db.collection("users").doc(teacherId).collection("briefings").add({
        ...briefingData,
        weekNumber: currentWeek,
        isNew: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`AGENT BRAIN: Successfully created briefing for teacher ${teacherId}`);
    } catch (error) {
      console.error(`AGENT BRAIN: CRITICAL ERROR for teacher ${teacherId}:`, error);
    }
  }
  console.log("AGENT BRAIN: All briefings prepared.");
  return null;
});

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

        // *** NEW: WRITE TO THE MEMORY LOG ***
        await db.collection("userActivityLog").add({
          teacherId: teacherId,
          activityType: "createWorksheet",
          topic: topic,
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
  timeoutSeconds: 300,
  memory: "1GiB",
}, async (request) => {
  // 1. Enhanced Logging: Log the start of the function with a clear identifier.
  console.log("generateChalkboardAid: Function triggered.");

  // Initialize Vertex AI client using the function's own identity (ADC).
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
    console.log("generateChalkboardAid: VertexAI client initialized.");
  }

  // 2. Robust Authentication and Input Validation
  if (!request.auth) {
    console.error("generateChalkboardAid: Unauthenticated request.");
    throw new functions.https.HttpsError(
        "unauthenticated", "You must be logged in to use this feature.",
    );
  }
  console.log(`generateChalkboardAid: Request from authenticated user: ${request.auth.uid}`);

  const {prompt} = request.data;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    console.error("generateChalkboardAid: Invalid or missing prompt.", {prompt});
    throw new functions.https.HttpsError(
        "invalid-argument", "A valid, non-empty prompt is required.",
    );
  }
  console.log(`generateChalkboardAid: Received prompt: "${prompt}"`);

  try {
    const fullPrompt = `A simple, clean, black and white line drawing of '${prompt}'. The style should be a clear diagram suitable for a chalkboard, with minimal shading. White background.`;

    console.log("generateChalkboardAid: Calling Imagen API with full prompt:", fullPrompt);

    const imageModel = vertexAI.getGenerativeModel({model: IMAGE_MODEL_NAME});

    // 3. Correct API Call and Response Parsing
    const resp = await imageModel.generateContent({
      contents: [{role: "user", parts: [{text: fullPrompt}]}],
    });

    // Detailed logging of the raw API response for debugging.
    console.log("generateChalkboardAid: Raw Imagen API response received.");

    // Defensive programming: Check if the response structure is as expected.
    if (!resp.response.candidates?.[0]?.content?.parts?.[0]?.fileData?.fileUri) {
      console.error("generateChalkboardAid: Unexpected API response structure.", {response: resp.response});
      throw new functions.https.HttpsError("internal", "Failed to parse the image data from the AI's response.");
    }

    const base64ImageData = resp.response.candidates[0].content.parts[0].fileData.fileUri.replace("data:image/png;base64,", "");
    const imageBuffer = Buffer.from(base64ImageData, "base64");

    console.log("generateChalkboardAid: Image data successfully parsed.");

    // 4. Reliable Cloud Storage Upload
    const bucket = getStorage().bucket();
    const filePath = `chalkboardAids/${request.auth.uid}/${Date.now()}.png`;
    const file = bucket.file(filePath);

    console.log(`generateChalkboardAid: Uploading image to Cloud Storage at: ${filePath}`);

    await file.save(imageBuffer, {
      metadata: {contentType: "image/png"},
    });
    await file.makePublic();

    const publicUrl = file.publicUrl();
    console.log("generateChalkboardAid: Image uploaded successfully:", publicUrl);

    // 5. Secure Firestore Database Write
    const db = getFirestore();
    await db.collection("chalkboardAids").add({
      teacherId: request.auth.uid,
      userPrompt: prompt,
      imageUrl: publicUrl,
      createdAt: new Date(),
    });

    console.log("generateChalkboardAid: Chalkboard aid saved to Firestore.");
    return {imageUrl: publicUrl};
  } catch (error) {
    // 6. Comprehensive Error Handling
    console.error("CRITICAL ERROR in generateChalkboardAid:", error);

    // Check for specific error types to give better feedback to the client.
    if (error.code === 7 && error.message.includes("PERMISSION_DENIED")) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "The function does not have permission to access Vertex AI. Please check IAM roles.",
          error.details,
      );
    }

    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError to the client.
    }

    // For any other type of error, return a generic internal error.
    throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while generating the image.",
        error.message,
    );
  }
});

// functions/index.js (replace the existing processSyllabusText function with this)

exports.processSyllabusText = onCall({
  // --- CHANGE 1: MATCHING THE WORKING PATTERN ---
  region: DEPLOY_REGION,
  secrets: ["GEMINI_API_KEY"], // Added to use the same auth as other functions
  timeoutSeconds: 540,
  memory: "2GiB",
  // ------------------------------------------
}, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const {syllabusText} = request.data;
  if (!syllabusText) {
    throw new functions.https.HttpsError("invalid-argument", "The function requires 'syllabusText' data.");
  }

  try {
    // --- CHANGE 2: USE THE SAME CLIENT AND MODEL ---
    if (!genAI) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    const model = genAI.getGenerativeModel({model: MODEL_NAME}); // Using MODEL_NAME
    // ----------------------------------------------

    const teacherId = request.auth.uid;
    const prompt = `You are an expert curriculum architect for Indian schools.
    Analyze this syllabus text:
    --- SYLLABUS TEXT ---
    ${syllabusText}
    --- END SYLLABUS TEXT ---
    Your primary task is to break it down into a structured 36-week school year plan.
    For each week, identify the main topics to be taught.
    Respond ONLY with a valid JSON array. Do not include markdown formatting like \`\`\`json.
    Each object in the array must represent a single topic and have these three keys: "topic" (string), "grade" (number, if specified), and "weekNumber" (number).`;

    console.log("Calling Google AI SDK to architect the yearly plan...");

    // --- CHANGE 3: MATCHING THE API CALL STYLE ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    // -------------------------------------------

    let syllabusArray;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const cleanJsonString = jsonMatch ? jsonMatch[1] : responseText;
      syllabusArray = JSON.parse(cleanJsonString);
    } catch (jsonError) {
      console.error("CRITICAL ERROR: Failed to parse JSON from AI response.", jsonError);
      console.error("AI Response that caused error:", responseText);
      throw new functions.https.HttpsError("internal", "The AI returned an invalid format. Please try again.");
    }

    console.log(`AI generated a ${syllabusArray.length}-item syllabus. Saving to Firestore...`);
    const db = getFirestore();
    const batch = db.batch();

    syllabusArray.forEach((item) => {
      const docRef = db.collection("syllabusPlan").doc();
      batch.set(docRef, {
        ...item,
        teacherId: teacherId,
        isPlanned: false,
      });
    });

    await batch.commit();
    console.log("Successfully saved the entire yearly syllabus plan from text.");
    return {success: true, message: "Syllabus processed successfully!"};
  } catch (error) {
    console.error("CRITICAL ERROR in processSyllabusText function:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to process syllabus text.");
  }
});

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
          // Save the story as before
          await db.collection("stories").add({
            teacherId: request.auth.uid,
            userPrompt: storyTopic,
            generatedContent: content,
            createdAt: new Date(),
          });
          // *** NEW: WRITE TO THE MEMORY LOG ***
          await db.collection("userActivityLog").add({
            teacherId: request.auth.uid,
            activityType: "generateStory",
            topic: storyTopic,
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
          // Save the concept as before
          await db.collection("concepts").add({
            teacherId: request.auth.uid,
            userPrompt: concept,
            generatedContent: content,
            createdAt: new Date(),
          });
          // *** NEW: WRITE TO THE MEMORY LOG ***
          await db.collection("userActivityLog").add({
            teacherId: request.auth.uid,
            activityType: "explainConcept",
            topic: concept,
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

// DEFINITIVE REPLACEMENT for proactiveNudgeAgent
exports.proactiveNudgeAgent = onSchedule({
  schedule: "every 24 hours",
  region: DEPLOY_REGION, // Or "us-central1"
  secrets: ["GEMINI_API_KEY"],
  timeoutSeconds: 540,
  memory: "1GiB",
}, async (event) => {
  console.log("PROACTIVE AGENT: Waking up to generate contextual suggestions.");
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  const suggestionModel = genAI.getGenerativeModel({model: PRO_MODEL_NAME});
  const db = getFirestore();

  const usersSnapshot = await db.collection("users").get(); // Assuming you have a 'users' collection
  if (usersSnapshot.empty) {
    console.log("PROACTIVE AGENT: No users found. Sleeping.");
    return;
  }

  for (const userDoc of usersSnapshot.docs) {
    const teacherId = userDoc.id;
    console.log(`PROACTIVE AGENT: Analyzing memory for teacher: ${teacherId}`);

    try {
      // 1. Read the user's recent memory
      const activityQuery = db.collection("userActivityLog")
          .where("teacherId", "==", teacherId)
          .orderBy("createdAt", "desc")
          .limit(10);
      const activitySnapshot = await activityQuery.get();

      if (activitySnapshot.empty) {
        console.log(`No activity found for teacher ${teacherId}. Skipping.`);
        continue;
      }

      // 2. Format the memory for the AI
      const recentActivities = activitySnapshot.docs.map((doc) => {
        const data = doc.data();
        return `- Created a '${data.activityType}' on the topic of '${data.topic}'.`;
      }).join("\n");

      // 3. Craft a powerful prompt to generate ACTIONABLE suggestions
      const prompt = `
        You are "Sahayak," an AI teaching companion. Your goal is to be proactive.
        Based on the teacher's recent activity, generate 2-3 new, creative, and actionable teaching ideas.

        **Teacher's Recent Activity (Memory):**
        ${recentActivities}

        **Your Task:**
        Think about what topics are related or what would be a good next step. For example, if they taught a science concept, suggest a story about a famous scientist. If they told a story, suggest explaining a key concept from it.

        **CRITICAL INSTRUCTIONS:**
        - Generate a JSON array of 2-3 suggestion objects.
        - Your entire response MUST be ONLY the valid JSON array. Do not use markdown.
        - Each object in the array MUST follow this exact schema:
        {
          "suggestionText": "A user-facing string. This is the text the teacher will see. Make it engaging!",
          "actionType": "The tool to call. Must be one of: 'generateStory', 'explainConcept'.",
          "actionPayload": {
            "topic": "The specific topic for the tool. This should be a new, related idea."
          }
        }

        **Example JSON Output:**
        [
          {
            "suggestionText": "Since you explained Photosynthesis, shall I tell a fun story about a talking tree who loves the sun?",
            "actionType": "generateStory",
            "actionPayload": {
              "topic": "A talking tree that loves the sun and photosynthesis"
            }
          },
          {
            "suggestionText": "You recently created a worksheet on the Solar System. How about a simple explanation of 'black holes' for your older students?",
            "actionType": "explainConcept",
            "actionPayload": {
              "topic": "what are black holes"
            }
          }
        ]
      `;

      // 4. Generate and save the structured suggestions
      const result = await suggestionModel.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJsonString = responseText.replace(/^```json\s*|```\s*$/g, "").trim();
      const suggestions = JSON.parse(cleanJsonString);

      // Save to a new sub-collection for the user
      const suggestionsRef = db.collection("users").doc(teacherId).collection("proactiveSuggestions");
      const batch = db.batch();

      suggestions.forEach((suggestion) => {
        const docRef = suggestionsRef.doc(); // Auto-generate ID
        batch.set(docRef, {
          ...suggestion,
          createdAt: new Date(),
          isNew: true, // For the UI to highlight
        });
      });
      await batch.commit();

      console.log(`PROACTIVE AGENT: Successfully generated ${suggestions.length} suggestions for teacher ${teacherId}`);
    } catch (error) {
      console.error(`PROACTIVE AGENT: CRITICAL ERROR for teacher ${teacherId}:`, error);
    }
  }
  return null;
});
