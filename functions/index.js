// functions/index.js

const functions = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {
  // GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const {VertexAI} = require("@google-cloud/vertexai");
const admin = require("firebase-admin");
const speech = require("@google-cloud/speech");

initializeApp();

const DEPLOY_REGION = "us-east1";
// const IMAGE_DEPLOY_REGION = "us-central1";
const MODEL_NAME = "gemini-2.0-flash-001";
// const IMAGE_MODEL_NAME = "imagen-3.0-generate-002"; // Stable Imagen model
// const PRO_MODEL_NAME = "gemini-1.5-pro-latest"; // For complex reasoning

// We will initialize the client inside the function handlers.
// let genAI;
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
  const model = vertexAI.getGenerativeModel({model: MODEL_NAME});
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

// This is the definitive, converted version of your generateTextContent function.
// It now uses the Vertex AI platform, which is more robust and secure.

exports.generateTextContent = onCall({
  region: DEPLOY_REGION,
  // NOTE: The 'secrets' array is removed as Vertex AI uses the function's
  // own service account identity for authentication, not an API key.
}, async (request) => {
  // 1. --- ROBUST VALIDATION --- (Unchanged)
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
    // 2. --- VERTEX AI INITIALIZATION ---
    // Lazily initialize the Vertex AI client. This is efficient.
    if (!vertexAI) {
      vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT,
        location: DEPLOY_REGION,
      });
    }

    // Get the generative model from the Vertex AI client.
    const textModel = vertexAI.getGenerativeModel({model: MODEL_NAME});

    console.log("generateTextContent (VertexAI): Calling model with prompt.");

    // 3. --- VERTEX AI API CALL ---
    // The request format for Vertex AI requires a specific structure.
    const result = await textModel.generateContent({
      contents: [{role: "user", parts: [{text: fullPrompt}]}],
    });

    // 4. --- VERTEX AI RESPONSE PARSING ---
    // The response structure is different from the Gemini API.
    // We defensively check for the expected structure.
    if (!result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("generateTextContent: Unexpected response from Vertex AI", result.response);
      throw new Error("Failed to parse a valid response from the AI model.");
    }
    const responseText = result.response.candidates[0].content.parts[0].text;

    // 5. --- DATABASE WRITE --- (Unchanged)
    // Directly save to Firestore if requested.
    if (saveOptions && saveOptions.collection) {
      const db = getFirestore();
      await db.collection(saveOptions.collection).add({
        teacherId: request.auth.uid,
        userPrompt: userPrompt,
        generatedContent: responseText,
        createdAt: new Date(),
      });
      console.log(`generateTextContent (VertexAI): Saved content to '${saveOptions.collection}'.`);
    }

    // 6. --- RETURN TO FRONTEND --- (Unchanged)
    // Return the generated content to the frontend.
    return {content: responseText};
  } catch (error) {
    // 7. --- ROBUST ERROR HANDLING ---
    console.error("generateTextContent (VertexAI) CRITICAL ERROR:", error);
    // This will catch both function errors and Vertex AI API errors.
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while generating content.",
        error.message, // Pass the error message for better debugging if needed.
    );
  }
});

exports.generateDifferentiatedWorksheets = onObjectFinalized(
    {
      region: DEPLOY_REGION, // Uses your "us-east1" setting
      timeoutSeconds: 300,
      memory: "1GiB",
    // NOTE: The 'secrets' array is removed. Vertex AI uses the function's
    // service account identity for authentication.
    },
    async (event) => {
    // 1. --- VERTEX AI INITIALIZATION ---
      if (!vertexAI) {
        vertexAI = new VertexAI({
          project: process.env.GCLOUD_PROJECT,
          location: DEPLOY_REGION, // Stays as us-east1
        });
      }
      const multimodalModel = vertexAI.getGenerativeModel({
        model: MODEL_NAME,
      });
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

        console.log(`Calling Vertex AI with model: ${MODEL_NAME}`);
        const result = await multimodalModel.generateContent({
          contents: [{role: "user", parts: [{text: prompt}, imagePart]}],
        });

        // 6. --- VERTEX AI RESPONSE PARSING ---
        if (!result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.error("generateDifferentiatedWorksheets: Unexpected response from Vertex AI", result.response);
          throw new Error("Failed to parse a valid response from the AI model.");
        }
        const responseText = result.response.candidates[0].content.parts[0].text;

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

// exports.generateChalkboardAid = onCall({
//   region: DEPLOY_REGION,
//   timeoutSeconds: 300,
//   memory: "1GiB",
// }, async (request) => {
//   // 1. Enhanced Logging: Log the start of the function with a clear identifier.
//   console.log("generateChalkboardAid: Function triggered.");

//   // Initialize Vertex AI client using the function's own identity (ADC).
//   if (!vertexAI) {
//     vertexAI = new VertexAI({
//       project: process.env.GCLOUD_PROJECT,
//       location: DEPLOY_REGION,
//     });
//     console.log("generateChalkboardAid: VertexAI client initialized.");
//   }

//   // 2. Robust Authentication and Input Validation
//   if (!request.auth) {
//     console.error("generateChalkboardAid: Unauthenticated request.");
//     throw new functions.https.HttpsError(
//         "unauthenticated", "You must be logged in to use this feature.",
//     );
//   }
//   console.log(`generateChalkboardAid: Request from authenticated user: ${request.auth.uid}`);

//   const {prompt} = request.data;
//   if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
//     console.error("generateChalkboardAid: Invalid or missing prompt.", {prompt});
//     throw new functions.https.HttpsError(
//         "invalid-argument", "A valid, non-empty prompt is required.",
//     );
//   }
//   console.log(`generateChalkboardAid: Received prompt: "${prompt}"`);

//   try {
//     const fullPrompt = `A simple, clean, black and white line drawing of '${prompt}'. The style should be a clear diagram suitable for a chalkboard, with minimal shading. White background.`;

//     console.log("generateChalkboardAid: Calling Imagen API with full prompt:", fullPrompt);

//     const imageModel = vertexAI.getGenerativeModel({model: IMAGE_MODEL_NAME});

//     // 3. Correct API Call and Response Parsing
//     const resp = await imageModel.generateContent({
//       contents: [{role: "user", parts: [{text: fullPrompt}]}],
//     });

//     // Detailed logging of the raw API response for debugging.
//     console.log("generateChalkboardAid: Raw Imagen API response received.");

//     // Defensive programming: Check if the response structure is as expected.
//     if (!resp.response.candidates?.[0]?.content?.parts?.[0]?.fileData?.fileUri) {
//       console.error("generateChalkboardAid: Unexpected API response structure.", {response: resp.response});
//       throw new functions.https.HttpsError("internal", "Failed to parse the image data from the AI's response.");
//     }

//     const base64ImageData = resp.response.candidates[0].content.parts[0].fileData.fileUri.replace("data:image/png;base64,", "");
//     const imageBuffer = Buffer.from(base64ImageData, "base64");

//     console.log("generateChalkboardAid: Image data successfully parsed.");

//     // 4. Reliable Cloud Storage Upload
//     const bucket = getStorage().bucket();
//     const filePath = `chalkboardAids/${request.auth.uid}/${Date.now()}.png`;
//     const file = bucket.file(filePath);

//     console.log(`generateChalkboardAid: Uploading image to Cloud Storage at: ${filePath}`);

//     await file.save(imageBuffer, {
//       metadata: {contentType: "image/png"},
//     });
//     await file.makePublic();

//     const publicUrl = file.publicUrl();
//     console.log("generateChalkboardAid: Image uploaded successfully:", publicUrl);

//     // 5. Secure Firestore Database Write
//     const db = getFirestore();
//     await db.collection("chalkboardAids").add({
//       teacherId: request.auth.uid,
//       userPrompt: prompt,
//       imageUrl: publicUrl,
//       createdAt: new Date(),
//     });

//     await db.collection("userActivityLog").add({
//       teacherId: request.auth.uid,
//       activityType: "createChalkboardAid",
//       topic: prompt, // The user's original prompt is the topic
//       createdAt: new Date(),
//     });
//     console.log("Chalkboard aid saved to Firestore.");
//     return {imageUrl: publicUrl};
//   } catch (error) {
//     // 6. Comprehensive Error Handling
//     console.error("CRITICAL ERROR in generateChalkboardAid:", error);

//     // Check for specific error types to give better feedback to the client.
//     if (error.code === 7 && error.message.includes("PERMISSION_DENIED")) {
//       throw new functions.https.HttpsError(
//           "permission-denied",
//           "The function does not have permission to access Vertex AI. Please check IAM roles.",
//           error.details,
//       );
//     }

//     if (error instanceof functions.https.HttpsError) {
//       throw error; // Re-throw HttpsError to the client.
//     }

//     // For any other type of error, return a generic internal error.
//     throw new functions.https.HttpsError(
//         "internal",
//         "An unexpected error occurred while generating the image.",
//         error.message,
//     );
//   }
// });

// functions/index.js

// ... (keep all your other functions at the top of the file)

// =========================================================================
// === THIS IS THE NEW, ASCII/EMOJI DIAGRAM VERSION. REPLACE THE OLD ONE. ===
// =========================================================================

exports.generateChalkboardAid = onCall({
  region: DEPLOY_REGION,
  timeoutSeconds: 120,
  memory: "1GiB",
}, async (request) => {
  console.log("generateChalkboardAid (ASCII Diagram): Function triggered.");

  // 1. --- INITIALIZATION ---
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
  }

  // 2. --- VALIDATION ---
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const {prompt} = request.data;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new functions.https.HttpsError("invalid-argument", "A valid prompt is required.");
  }
  console.log(`generateChalkboardAid (ASCII Diagram): Received prompt: "${prompt}"`);

  try {
    // 3. --- NEW, HIGHLY-DETAILED PROMPT ENGINEERING ---
    const fullPrompt = `
      You are a creative assistant who designs text-based diagrams (ASCII art) for teachers.
      Your task is to convert the topic "${prompt}" into a visually appealing, vertical flowchart using only text characters, symbols, and relevant emojis.

      **CRITICAL INSTRUCTIONS:**
      - Your entire response MUST be ONLY the text-based diagram. Do not include any explanations, introductions, or markdown code blocks like \`\`\`.
      - The diagram must be simple, clear, and easy for a teacher to copy onto a chalkboard.
      - Use boxes, arrows (like 'v' or '->'), and indentation to show the flow and structure.
      - Use emojis to make the diagram engaging and visually informative.
      - Your output MUST follow the style of this example precisely.

      **EXAMPLE for the topic "the water cycle":**
                         ☀️
                      [Sun]
                        |
                        v
                 ----------------
                 |  Evaporation  |
                 ----------------
                   Water heats up
                   -> turns into
                   water vapor 🌫️
                        |
                        v
             -----------------------
             |   Condensation 🌥️   |
             -----------------------
              Vapor cools -> forms
                 water droplets
                  = Clouds ☁️
                        |
                        v
              ---------------------
              |  Precipitation 🌧️  |
              ---------------------
               Clouds become heavy
              -> Water falls down
                (Rain, Snow, Hail)
                        |
                        v
             -----------------------
             |   Collection 🌊     |
             -----------------------
               Water gathers into
              rivers, lakes, seas
                        |
                        v
               🔁 Cycle Repeats 🔁
    `;

    // 4. --- API CALL TO TEXT MODEL ---
    const textModel = vertexAI.getGenerativeModel({model: MODEL_NAME});
    console.log("generateChalkboardAid (ASCII Diagram): Calling Vertex AI text model.");

    const result = await textModel.generateContent(fullPrompt);
    const responseText = result.response.candidates[0].content.parts[0].text;

    console.log("generateChalkboardAid (ASCII Diagram): Diagram generated successfully.");

    // 5. --- FIRESTORE WRITE ---
    const db = getFirestore();
    await db.collection("chalkboardAids").add({
      teacherId: request.auth.uid,
      userPrompt: prompt,
      generatedContent: responseText,
      createdAt: new Date(),
    });

    await db.collection("userActivityLog").add({
      teacherId: request.auth.uid,
      activityType: "createChalkboardAid",
      topic: prompt,
      createdAt: new Date(),
    });
    console.log("Chalkboard aid diagram saved to Firestore.");

    // 6. --- RETURN VALUE ---
    return {generatedContent: responseText};
  } catch (error) {
    console.error("CRITICAL ERROR in generateChalkboardAid (ASCII Diagram):", error);
    throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while generating the chalkboard diagram.",
        error.message,
    );
  }
});


// ... (keep all your other existing functions below this)

// functions/index.js (replace the existing processSyllabusText function with this)

exports.processSyllabusText = onCall({
  region: DEPLOY_REGION, // Uses your "us-east1" setting
  // NOTE: The 'secrets' array is removed. Vertex AI authenticates automatically.
  timeoutSeconds: 540,
  memory: "2GiB",
}, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const {syllabusText} = request.data;
  if (!syllabusText) {
    throw new functions.https.HttpsError("invalid-argument", "The function requires 'syllabusText' data.");
  }

  try {
    if (!vertexAI) {
      vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT,
        location: DEPLOY_REGION, // Stays as us-east1
      });
    }
    const model = vertexAI.getGenerativeModel({model: MODEL_NAME}); // Using MODEL_NAME
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

    console.log(`Calling Vertex AI with model '${MODEL_NAME}' to architect the yearly plan...`);

    // 4. --- VERTEX AI API CALL ---
    const result = await model.generateContent({
      contents: [{role: "user", parts: [{text: prompt}]}],
    });

    // 5. --- VERTEX AI RESPONSE PARSING ---
    if (!result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("processSyllabusText: Unexpected response from Vertex AI", result.response);
      throw new Error("Failed to parse a valid response from the AI model.");
    }
    const responseText = result.response.candidates[0].content.parts[0].text;

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

// This is the definitive, corrected version of your agentOrchestrator function.
// It fixes the typo and is refactored for better readability and reliability.

// This is the definitive, corrected version of your agentOrchestrator function.
// It adds the missing memory logging for worksheet requests.

exports.agentOrchestrator = onCall({
  region: DEPLOY_REGION,
  // NOTE: The 'secrets' array is removed. Vertex AI uses the function's
  // service account identity, which is more secure and robust.
  timeoutSeconds: 300,
}, async (request) => {
  // 1. --- VERTEX AI INITIALIZATION ---
  // Initialize the Vertex AI client, consistent with your other functions.
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
  }
  // 1. --- ROBUST VALIDATION ---
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

  // Initialize Firestore once at the top for efficiency
  const db = getFirestore();

  // 2. --- TOOL DEFINITIONS ---
  const tools = [
    {
      functionDeclarations: [
        {
          name: "generateStory",
          description: "Generates a simple, culturally relevant story to make a topic more engaging for young children (Grades 2-5).",
          parameters: {
            type: "OBJECT",
            properties: {
              topic: {
                type: "STRING",
                description: "The core educational theme the story should be about.",
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "explainConcept",
          description: "Breaks down a single, complex concept into a simple explanation with a relatable analogy for students.",
          parameters: {
            type: "OBJECT",
            properties: {
              concept: {
                type: "STRING",
                description: "The specific concept or question to explain.",
              },
            },
            required: ["concept"],
          },
        },
        {
          name: "requestWorksheetImage",
          description: "Used when the teacher mentions needing a 'worksheet', 'quiz', 'test', or 'assessment'. This tool asks the user to upload an image.",
          parameters: {
            type: "OBJECT",
            properties: {
              topic: {
                type: "STRING",
                description: "The topic the worksheet should be about.",
              },
            },
            required: ["topic"],
          },
        },
        // *** THIS IS THE NEW TOOL FOR ATTENDANCE ANALYSIS ***
        {
          name: "analyzeAttendance",
          description: "Use this tool when the teacher asks any question about student attendance data, such as 'who has low attendance', 'what is the attendance ratio', 'attendance summary', or 'list students who were absent yesterday'.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The specific question the teacher is asking about attendance. For example: 'Who has been absent the most this month?'",
              },
            },
            required: ["query"],
          },
        },
      ],
    },
  ];

  // 3. --- MODEL CONFIGURATION ---
  const agentModel = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    tools,
    safetySettings: [
      {category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE},
      {category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE},
      {category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE},
      {category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE},
    ],
  });

  const fullAgentPrompt = `You are Sahayak, an expert, proactive AI teaching companion. Your primary goal is to anticipate the teacher's needs and provide comprehensive support. Teacher's Request: "${userPrompt}". Determine the appropriate tool calls.`;

  try {
    console.log("agentOrchestrator (VertexAI): Sending prompt to model...");
    // 5. --- VERTEX AI API CALL (MAIN) ---
    const result = await agentModel.generateContent({
      contents: [{role: "user", parts: [{text: fullAgentPrompt}]}],
    });

    // 6. --- VERTEX AI RESPONSE PARSING (MAIN) ---
    const response = result.response;
    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("Invalid response structure from Vertex AI agent model.");
    }
    const agentParts = response.candidates[0].content.parts;
    const calls = agentParts.filter((p) => p.functionCall).map((p) => p.functionCall);
    const textResponse = agentParts.filter((p) => p.text).map((p) => p.text).join("\n");

    if (calls.length === 0) {
      console.log("agentOrchestrator (VertexAI): No tool call needed.");
      return {type: "text", content: textResponse};
    }

    console.log(`agentOrchestrator (VertexAI): Model wants to call ${calls.length} tool(s).`);

    // 7. --- VERTEX AI TOOL EXECUTION LOGIC ---
    const toolExecutionPromises = calls.map(async (call) => {
      console.log(`- Executing tool: ${call.name}`);
      const modelForTool = vertexAI.getGenerativeModel({model: MODEL_NAME});

      if (call.name === "generateStory") {
        const storyTopic = call.args.topic;
        const toolResult = await modelForTool.generateContent({contents: [{role: "user", parts: [{text: `Create a story about: "${storyTopic}".`}]}]});
        const content = toolResult.response.candidates[0].content.parts[0].text;

        await db.collection("stories").add({teacherId: request.auth.uid, userPrompt: storyTopic, generatedContent: content, createdAt: new Date()});
        await db.collection("userActivityLog").add({teacherId: request.auth.uid, activityType: "generateStory", topic: storyTopic, createdAt: new Date()});
        return {type: "summary", summary: `Story about "${storyTopic}"`};
      }

      if (call.name === "explainConcept") {
        const concept = call.args.concept;
        const toolResult = await modelForTool.generateContent({contents: [{role: "user", parts: [{text: `Explain simply: "${concept}".`}]}]});
        const content = toolResult.response.candidates[0].content.parts[0].text;

        await db.collection("concepts").add({teacherId: request.auth.uid, userPrompt: concept, generatedContent: content, createdAt: new Date()});
        await db.collection("userActivityLog").add({teacherId: request.auth.uid, activityType: "explainConcept", topic: concept, createdAt: new Date()});
        return {type: "summary", summary: `Explanation for "${concept}"`};
      }

      if (call.name === "requestWorksheetImage") {
        const worksheetTopic = call.args.topic;

        // *** THIS IS THE DEFINITIVE FIX ***
        // A request for a worksheet is a memory worth logging. This was the missing piece.
        console.log(`Logging worksheet request for topic: ${worksheetTopic}`);
        await db.collection("userActivityLog").add({teacherId: request.auth.uid, activityType: "requestWorksheet", topic: worksheetTopic, createdAt: new Date()});
        return {type: "ui_prompt", tool: "requestWorksheetImage", topic: worksheetTopic};
      }
      if (call.name === "analyzeAttendance") {
        const teacherId = request.auth.uid;

        // Fetch the last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateString = thirtyDaysAgo.toISOString().split("T")[0];
        const attendanceQuery = db.collection("attendance").where("teacherId", "==", teacherId).where("date", ">=", dateString);
        const snapshot = await attendanceQuery.get();

        if (snapshot.empty) {
          // Respond directly if there's no data
          return {
            tool: call,
            response: {name: call.name, content: "I couldn't find any attendance data for the last 30 days to analyze."},
          };
        }

        // Format the data for the AI
        const attendanceData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return `${data.date}, ${data.studentName}, ${data.status}`;
        }).join("\n");

        // Craft a new prompt for a second AI call
        const analysisPrompt = `
          You are an expert data analyst AI. Your task is to answer a teacher's question based on the provided attendance data.
          RAW DATA (format: Date, Student Name, Status):
          ---
          ${attendanceData}
          ---
          TEACHER'S QUESTION: "${call.args.query}"
          INSTRUCTIONS: Analyze the raw data to answer the teacher's question. Provide a clear, concise, and friendly answer.
        `;

        const analysisResult = await modelForTool.generateContent(analysisPrompt);
        const analysisText = analysisResult.response.candidates[0].content.parts[0].text;

        // Return the analysis as the result of the tool call
        return {
          tool: call,
          response: {name: call.name, content: analysisText},
        };
      }
      return null;
    });

    // 5. --- PROCESS RESULTS ---
    const toolResults = await Promise.all(toolExecutionPromises);

    const attendanceResult = toolResults.find((r) => r && r.tool.name === "analyzeAttendance");
    if (attendanceResult) {
      return {
        type: "final_response",
        content: attendanceResult.response.content,
        uiPrompt: null,
      };
    }

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
      if (confirmationMessage) {
        confirmationMessage += `\n\nAdditionally, I can create a worksheet on "${uiPromptResult.topic}", but I need an image of the textbook page first.`;
      } else {
        confirmationMessage = `Great! I can create a worksheet on "${uiPromptResult.topic}". Please upload an image of the textbook page you'd like me to use.`;
      }
    }

    return {
      type: "final_response",
      content: confirmationMessage,
      uiPrompt: uiPromptResult || null,
    };
  } catch (error) {
    // 6. --- ROBUST ERROR HANDLING ---
    console.error("Agent Orchestrator (VertexAI) CRITICAL ERROR:", error);
    throw new functions.https.HttpsError(
        "internal",
        "The agent failed to process your request.",
        error.message,
    );
  }
});

// THIS IS THE DEFINITIVE, UNCRASHABLE VERSION.
// Replace your entire old generateProactiveSuggestions function with this one.

exports.generateProactiveSuggestions = onCall({
  region: DEPLOY_REGION,
  // NOTE: The 'secrets' array is removed. Vertex AI uses the function's
  // service account identity, which is more secure.
  timeoutSeconds: 120,
  memory: "1GiB",
}, async (request) => {
  const {teacherId} = request.data;
  if (!teacherId) {
    console.error("PROACTIVE AGENT: Function called without a teacherId.");
    return {success: false, message: "Missing teacherId."};
  }

  console.log(`PROACTIVE AGENT: Waking up for teacher: ${teacherId}`);

  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
  }
  // Using the Pro model for this complex reasoning task.
  const suggestionModel = vertexAI.getGenerativeModel({model: MODEL_NAME});
  const db = getFirestore();

  try {
    // Step 1: Read the user's recent memory. (No change here)
    console.log(`PROACTIVE AGENT: [1/5] Reading activity log for ${teacherId}...`);
    const activityQuery = db.collection("userActivityLog")
        .where("teacherId", "==", teacherId)
        .orderBy("createdAt", "desc")
        .limit(10);
    const activitySnapshot = await activityQuery.get();

    if (activitySnapshot.empty) {
      console.log(`PROACTIVE AGENT: No activity for ${teacherId}. Nothing to do.`);
      return {success: true, message: "No activity to process."};
    }

    const recentActivities = activitySnapshot.docs.map((doc) => {
      const data = doc.data();
      return `- Created a '${data.activityType}' on the topic of '${data.topic}'.`;
    }).join("\n");

    // Step 2: Craft the prompt. (No change here)
    const prompt = `
      You are "Sahayak," an AI teaching companion. Your goal is to be proactive.
      Based on the teacher's recent activity, generate 2-3 new, creative, and 
      actionable teaching ideas.
      **Teacher's Recent Activity (Memory):**
      ${recentActivities}
      **CRITICAL INSTRUCTIONS:**
      - Generate a JSON array of 2-3 suggestion objects.
      - Your entire response MUST be ONLY the valid JSON array. Do not use markdown.
      - Each object in the array MUST follow this exact schema:
      {
        "suggestionText": "A user-facing string...",
        "actionType": "Must be one of: 'generateStory', 'explainConcept'.",
        "actionPayload": { "topic": "A new, related idea." }
      }
    `;

    console.log("PROACTIVE AGENT: [2/5] Sending prompt to model...");
    const result = await suggestionModel.generateContent({
      contents: [{role: "user", parts: [{text: prompt}]}],
    });

    // 5. --- VERTEX AI RESPONSE PARSING ---
    if (!result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("PROACTIVE AGENT: Unexpected response structure from Vertex AI", result.response);
      throw new Error("Failed to parse a valid response from the AI model.");
    }
    const responseText = result.response.candidates[0].content.parts[0].text;
    console.log("PROACTIVE AGENT: [3/5] Raw model response received:", responseText);

    // Step 4: Parse the JSON with robust error handling.
    let suggestions = [];
    try {
      console.log("PROACTIVE AGENT: [4/5] Attempting to parse JSON...");
      const cleanJsonString = responseText.replace(/^```json\s*|```\s*$/g, "").trim();
      suggestions = JSON.parse(cleanJsonString);
    } catch (parseError) {
      // If the model gave us bad JSON, we will log the error and stop,
      // but the entire function will not crash.
      console.error(
          "PROACTIVE AGENT: FATAL PARSE ERROR! Model did not return valid JSON.",
          "Error:", parseError,
          "Raw Text:", responseText,
      );
      // We return success=false to prevent further execution.
      return {success: false, error: "Failed to parse suggestions from AI."};
    }

    // Step 5: Save the successfully parsed suggestions to Firestore.
    const suggestionsRef = db.collection("users").doc(teacherId)
        .collection("proactiveSuggestions");

    const oldSuggestions = await suggestionsRef.get();
    const deleteBatch = db.batch();
    oldSuggestions.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();

    const addBatch = db.batch();
    suggestions.forEach((suggestion) => {
      const docRef = suggestionsRef.doc();
      addBatch.set(docRef, {
        ...suggestion,
        createdAt: new Date(),
        isNew: true,
      });
    });
    await addBatch.commit();

    console.log(`PROACTIVE AGENT: [5/5] Successfully saved ${suggestions.length} new suggestions.`);
    return {success: true, count: suggestions.length};
  } catch (error) {
    console.error(`PROACTIVE AGENT: CRITICAL ERROR for teacher ${teacherId}:`, error);
    return {success: false, error: error.message};
  }
});

// THIS IS THE DEFINITIVE, FINAL, STABLE FIX. HACKATHON MODE.
// It uses the v1 API with the most compatible model.
// Replace the entire old transcribeAudio function with this one.

// const speech = require("@google-cloud/speech");

exports.transcribeAudio = onCall({
  region: DEPLOY_REGION,
  timeoutSeconds: 60,
  memory: "512MiB",
}, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth is required.");
  }
  const {audioBase64} = request.data;
  if (!audioBase64) {
    throw new functions.https.HttpsError("invalid-argument", "Audio data is required.");
  }

  try {
    // We are using the v1 client. It is the most stable.
    const speechClient = new speech.SpeechClient();

    const audio = {
      content: audioBase64,
    };

    const config = {
      // We let the API automatically detect encoding details.
      // This is the most important part.
      // The default values are sufficient for webm/opus.
      languageCode: "en-US",

      // *** THIS IS THE FINAL FIX: USE A UNIVERSALLY AVAILABLE MODEL ***
      model: "latest_long",
    };

    const speechRequest = {
      audio: audio,
      config: config,
    };

    console.log("transcribeAudio: Sending audio with 'latest_long' model...");

    const [response] = await speechClient.recognize(speechRequest);

    if (!response.results || response.results.length === 0 || !response.results[0].alternatives || response.results[0].alternatives.length === 0) {
      console.warn("transcribeAudio: No transcription found (audio may be silent).");
      return {transcript: ""};
    }

    const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");

    console.log(`transcribeAudio: SUCCESS! Transcription: "${transcription}"`);
    return {transcript: transcription};
  } catch (error) {
    console.error("transcribeAudio CRITICAL ERROR:", error);
    throw new functions.https.HttpsError("internal", "Failed to transcribe audio.");
  }
});

exports.analyzeAttendance = onCall({
  region: DEPLOY_REGION,
}, async (request) => {
  // 1. --- VALIDATION ---
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth is required.");
  }
  const {userQuery} = request.data;
  if (!userQuery) {
    throw new functions.https.HttpsError("invalid-argument", "A query is required.");
  }

  const teacherId = request.auth.uid;
  const db = getFirestore();

  try {
    // 2. --- FETCH DATA FROM FIRESTORE ---
    // Get all attendance records for this teacher for the last 30 days.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split("T")[0];

    const attendanceQuery = db.collection("attendance")
        .where("teacherId", "==", teacherId)
        .where("date", ">=", dateString);

    const snapshot = await attendanceQuery.get();
    if (snapshot.empty) {
      return {answer: "I couldn't find any attendance data for the last 30 days to analyze."};
    }

    // 3. --- FORMAT DATA FOR THE AI ---
    // Convert the data into a simple, easy-to-read text format for the AI.
    const attendanceData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return `${data.date}, ${data.studentName}, ${data.status}`;
    }).join("\n");

    // 4. --- CRAFT THE PROMPT ---
    const prompt = `
      You are an expert data analyst AI for a teacher. Your task is to answer a teacher's question based on the provided attendance data for the last 30 days.

      **RAW ATTENDANCE DATA (format: Date, Student Name, Status):**
      ---
      ${attendanceData}
      ---

      **TEACHER'S QUESTION:**
      "${userQuery}"

      **INSTRUCTIONS:**
      - Analyze the raw data to answer the teacher's question.
      - Provide a clear, concise, and friendly answer.
      - If you perform calculations (like percentages or ratios), show them simply.
      - Be helpful and direct in your response. Do not add conversational fluff.
    `;

    // 5. --- CALL VERTEX AI ---
    if (!vertexAI) {
      vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT,
        location: DEPLOY_REGION,
      });
    }
    const model = vertexAI.getGenerativeModel({model: MODEL_NAME}); // Using your working MODEL_NAME
    const result = await model.generateContent(prompt);
    const responseText = result.response.candidates[0].content.parts[0].text;

    // 6. --- RETURN THE ANSWER ---
    return {answer: responseText};
  } catch (error) {
    console.error("analyzeAttendance CRITICAL ERROR:", error);
    throw new functions.https.HttpsError("internal", "Failed to analyze attendance data.");
  }
});
