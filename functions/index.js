// functions/index.js

const functions = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const {VertexAI} = require("@google-cloud/vertexai");
const admin = require("firebase-admin");

initializeApp();

const DEPLOY_REGION = "us-east1";
const MODEL_NAME = "gemini-1.5-flash-latest";
const IMAGE_MODEL_NAME = "imagegeneration@0.0.5"; // Stable Imagen model
const PRO_MODEL_NAME = "gemini-1.5-pro-latest"; // For complex reasoning




// We will initialize the client inside the function handlers.
let genAI;
let vertexAI;


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

          const topics = syllabusSnapshot.docs.map(doc => {
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
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  const textModel = genAI.getGenerativeModel({model: MODEL_NAME});

  // if (!request.auth) {
  //   throw new functions.https.HttpsError(
  //       "unauthenticated", "You must be logged in.",
  //   );
  // }

  // We now accept 'userPrompt' and 'saveOptions' from the frontend
  const {userPrompt, fullPrompt, saveOptions} = request.data;
  if (!userPrompt || !fullPrompt) {
    throw new functions.https.HttpsError(
        "invalid-argument", "Missing required prompts.",
    );
  }

  try {
    console.log(`Calling Google AI SDK with model: ${MODEL_NAME}`);
    const result = await textModel.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();
    console.log("generateTextContent: Received successful response.");

    // If the frontend requested to save the result, we save it.
    if (saveOptions && saveOptions.collection) {
      console.log(`Saving result to collection: ${saveOptions.collection}`);
      const db = getFirestore();
      await db.collection(saveOptions.collection).add({
        teacherId: request.auth.uid,
        userPrompt: userPrompt, // Save the original user question/prompt
        generatedContent: responseText,
        createdAt: new Date(),
      });
      console.log("Successfully saved to Firestore.");
    }

    return {content: responseText};
  } catch (error) {
    console.error("generateTextContent: CRITICAL ERROR:", error);
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

exports.processSyllabusText = onCall({
  region: DEPLOY_REGION,
  timeoutSeconds: 540,
  memory: "2GiB",
  cors: true, // IMPORTANT: Enables calling from your web app
}, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", "You must be logged in.",
    );
  }

  const {syllabusText} = request.data;
  if (!syllabusText) {
    throw new functions.https.HttpsError(
        "invalid-argument", "The function requires 'syllabusText' data.",
    );
  }

  // Use the reliable VertexAI client
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: DEPLOY_REGION,
    });
  }
  const model = vertexAI.getGenerativeModel({model: "gemini-1.5-pro-latest"});

  try {
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

    console.log("Calling Vertex AI to architect the yearly plan from text...");
    const result = await model.generateContent(prompt);
    const responseText = result.response.candidates[0].content.parts[0].text;

    const jsonRegex = /^```json\s*|```\s*$/g;
    const cleanJsonString = responseText.replace(jsonRegex, "");
    const syllabusArray = JSON.parse(cleanJsonString);

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
    throw new functions.https.HttpsError(
        "internal", "Failed to process syllabus text.",
    );
  }
});
