// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase'; // Ensure this path is correct for your project
import LoadingSpinner from '../components/LoadingSpinner';

// 1. Create and EXPORT the context itself. This is what the hook will import.
export const AuthContext = createContext();

// 2. The Provider component is the default export.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner message="Initializing ReWise..." />
      </div>
    );
  }

  // The value prop provides the user and loading state to all children
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// NOTE: The useAuth hook has been completely removed from this file.