// frontend/src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAYSyr54PxAWX1UlBRGl3B1DmQClqxX1Ls",
    authDomain: "rewise-466313.firebaseapp.com",
    projectId: "rewise-466313",
    storageBucket: "rewise-466313.firebasestorage.app",
    messagingSenderId: "17944599663",
    appId: "1:17944599663:web:aff1092b01d29d5f87019a",
    measurementId: "G-FQDS3LXJKE"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const functionsRegion = 'us-east1';
export const functions = getFunctions(app, functionsRegion);

// export const functions = getFunctions(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper to call our Cloud Function
export const generateTextFn = httpsCallable(functions, 'generateTextContent');