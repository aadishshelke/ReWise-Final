import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({children}) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        // If not loading and no user, redirect to the Welcome page (our new login page)
        return <Navigate to="/" />;
    }

    // If a user exists, render the child component (e.g., the Dashboard)
    return children;
};

export default ProtectedRoute;