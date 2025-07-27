// frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader, LogIn, UserPlus } from 'lucide-react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // Default to login mode
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard/agent'); // Redirect to the agent page on success
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/onboarding/profile'); // Redirect to profile setup on signup
      }
    } catch (err) {
      // Provide user-friendly error messages
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use. Please log in.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-text-main">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-surface p-8 rounded-2xl border border-border-subtle shadow-2xl shadow-black/30"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-main">
            {isLoginMode ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p className="text-text-secondary mt-2">
            {isLoginMode ? 'Log in to continue to Sahayak.' : 'Sign up to unlock your AI teaching companion.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }} // <-- INLINE STYLE FIX
              className="w-full p-3 border border-gray-700 rounded-lg placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }} // <-- INLINE STYLE FIX
              className="w-full p-3 border border-gray-700 rounded-lg placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-semibold">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 disabled:bg-gray-600 transition-all"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : isLoginMode ? (
                <LogIn size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {isLoading ? 'Processing...' : isLoginMode ? 'Log In' : 'Sign Up & Get Started'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
          {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            className="font-bold text-primary hover:underline ml-1"
          >
            {isLoginMode ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage; 