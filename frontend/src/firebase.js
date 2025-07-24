// frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- THIS IS THE DEFINITIVE FIX FOR DEPLOYMENT ---
// The typos in projectId, authDomain, and storageBucket have been corrected to '...466313'.
const firebaseConfig = {
    apiKey: "AIzaSyAYSyr54PxAWX1UlBRGl3B1DmQClqxX1Ls", // Your actual key
    authDomain: "rewise-466313.firebaseapp.com",
    projectId: "rewise-466313",
    storageBucket: "rewise-466313.firebasestorage.app",
    messagingSenderId: "17944599663",
    appId: "1:17944599663:web:aff1092b01d29d5f87019a",
    measurementId: "G-FQDS3LXJKE"
  };
// --------------------------------------------------

const app = initializeApp(firebaseConfig);

// Initialize all the services for the LIVE environment
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functionsRegion = 'us-east1';
const functions = getFunctions(app, functionsRegion);

// Export the initialized services for use in other components
export { auth, db, storage, functions };

// Export all callable function helpers
export const generateTextFn = httpsCallable(functions, 'generateTextContent');
export const agentOrchestratorFn = httpsCallable(functions, 'agentOrchestrator');
export const generateChalkboardAidFn = httpsCallable(functions, 'generateChalkboardAid');