import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  const handleAuthAction = async (action) => {
    setAuthError('');
    try {
      if (action === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/'); // Redirect to dashboard on success
    } catch (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">ReWise Login</h1>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border border-gray-300 rounded"/>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 border border-gray-300 rounded"/>
          {authError && <p className="text-red-500 text-sm">{authError.replace('Firebase: ', '')}</p>}
          <div className="flex space-x-2">
            <button onClick={() => handleAuthAction('signup')} className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600">Sign Up</button>
            <button onClick={() => handleAuthAction('login')} className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;