// functions/index.js

const functions = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {GoogleGenerativeAI} = require("@google/generative-ai");

initializeApp();

const DEPLOY_REGION = "us-east1";
const MODEL_NAME = "gemini-1.5-flash-latest";


// We will initialize the client inside the function handlers.
let genAI;

exports.generateTextContent = onCall({
  region: DEPLOY_REGION,
  secrets: ["GEMINI_API_KEY"], // Grant function access to the secret
}, async (request) => {
  // Lazily initialize the client inside the handler
  if (!genAI) {
    // process.env.GEMINI_API_KEY is automatically populated by thesecretsconfig
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  const textModel = genAI.getGenerativeModel({model: MODEL_NAME});

  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", "You must be logged in.",
    );
  }
  const {prompt} = request.data;
  if (!prompt) {
    throw new functions.https.HttpsError(
        "invalid-argument", "The function must have a 'prompt' argument.",
    );
  }
  try {
    console.log(`Calling Google AI SDK with model: ${MODEL_NAME}`);
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    console.log("generateTextContent: Received successful response.");
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

        // Convert the image buffer to a format the new SDK understands
        const imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: contentType,
          },
        };

        const prompt = `You are an expert Indian educator's assistant.
      Analyze this textbook image on the topic of "${topic}".
      Generate three distinct worksheets for a multi-grade classroom.
      Respond ONLY with a valid JSON object. Do not include markdown.`;

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

        // const generatedWorksheets = JSON.parse(responseText);

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


