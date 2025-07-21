// src/hooks/useAuth.js
import { useContext } from 'react';
// We will import the actual context object from the context file
import { AuthContext } from '../context/AuthContext';

// This file ONLY exports the hook. It is not a component.
export const useAuth = () => {
  return useContext(AuthContext);
};