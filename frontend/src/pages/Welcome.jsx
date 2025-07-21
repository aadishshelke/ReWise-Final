// frontend/src/pages/Welcome.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import balbuddy from "../assets/balbuddy.png";
import React, { useState } from "react";
import { auth } from "../firebase"; // Import Firebase auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function Welcome() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle both login and signup
  const handleAuth = async (action) => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      if (action === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        // On successful signup, navigate to the profile setup
        navigate("/onboarding/profile");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // On successful login, go straight to the dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      // Provide a user-friendly error message
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use. Please log in.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else {
        setError("An error occurred. Please try again.");
      }
      console.error(err);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-softbg dark:bg-gray-950 relative">
      <img
        src={balbuddy}
        alt="BalBuddy"
        className="absolute left-8 bottom-8 w-16 h-16 animate-bounce"
        style={{ animationDelay: "0.2s" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl shadow-soft p-6 flex flex-col items-center bg-white dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-center mb-2 font-poppins">
            Welcome to Sahayak
            <br />
            <span className="text-primary">Your AI Teaching Companion</span>
          </h1>
          <p className="text-gray-600 text-center mb-6 font-poppins">
            Log in or sign up to unlock personalized AI support.
          </p>

          {/* --- NEW INTEGRATED FORM --- */}
          <div className="w-full space-y-3 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Teacher's Email"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          {/* --- END NEW FORM --- */}

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          <div className="w-full space-y-2">
            <button
              className="w-full bg-accent text-white font-semibold py-2 rounded-lg text-lg hover:bg-accent/90 transition disabled:bg-gray-400"
              onClick={() => handleAuth("login")}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
            <button
              className="w-full bg-primary text-white font-semibold py-2 rounded-lg text-lg hover:bg-primary/90 transition disabled:bg-gray-400"
              onClick={() => handleAuth("signup")}
              disabled={isLoading}
            >
              {isLoading ? "Signing up..." : "Sign Up & Get Started"}
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-4 text-center font-poppins">
            Your partner in every lesson
          </div>
        </div>
      </motion.div>
    </div>
  );
}