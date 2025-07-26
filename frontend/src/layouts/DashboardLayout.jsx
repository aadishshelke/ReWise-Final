// frontend/src/layouts/DashboardLayout.jsx

import React from 'react';
import { Sidebar } from "../components/Sidebar";
import { Outlet } from "react-router-dom"; // Outlet is already here
import { useAuth } from '../hooks/useAuth'; // We need to get the user from our auth hook

export function DashboardLayout() { // Removed the unused 'children' prop
  const { user } = useAuth(); // Get the currently logged-in user

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* --- THIS IS THE DEFINITIVE FIX --- */}
        {/* We pass the user object to all child routes via the context prop. */}
        <Outlet context={{ user }} />
        {/* ---------------------------------- */}
      </main>
    </div>
  );
}