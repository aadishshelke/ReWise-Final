// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbju_XRu48pxWhYQOhsMQ6OcgfrOYlZBg",
  authDomain: "rewise-6e85e.firebaseapp.com",
  projectId: "rewise-6e85e",
  storageBucket: "rewise-6e85e.firebasestorage.app",
  messagingSenderId: "1080607624244",
  appId: "1:1080607624244:web:b882dd9eb1ebd18ad7ce61",
  measurementId: "G-MB41Q46867"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);