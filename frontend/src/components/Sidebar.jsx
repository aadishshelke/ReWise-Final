// frontend/src/components/Sidebar.jsx

import { useState } from "react";
import { Menu, Home, Book, Users, Award, Feather, FileText, Bot, PenSquare, LogOut, UploadCloud, BrainCircuit } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; // Ensure your firebase config path is correct
import { useAuth } from "../hooks/useAuth"; // Import the useAuth hook to get user info

const mainLinks = [
  { icon: <Home size={20} />, label: "Dashboard", to: "/dashboard" },
  { icon: <Book size={20} />, label: "Lessons", to: "/lessons" },
  { icon: <Users size={20} />, label: "Students", to: "/students" },
  { icon: <Award size={20} />, label: "Achievements", to: "/achievements" },
];

const aiToolLinks = [
  { icon: <BrainCircuit size={20} />, label: "ReWise Agent", to: "/dashboard/agent" },
  { icon: <FileText size={20} />, label: "Worksheets", to: "/dashboard/worksheets" },
  { icon: <Feather size={20} />, label: "Story Generator", to: "/dashboard/story" },
  { icon: <Bot size={20} />, label: "Concept Explainer", to: "/dashboard/concept" },
  { icon: <PenSquare size={20} />, label: "Chalkboard View", to: "/dashboard/chalkboard" },
  { icon: <UploadCloud size={20} />, label: "Syllabus Architect", to: "/dashboard/syllabus-upload" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // State for the drop-up menu
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the current user

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // On successful logout, navigate to the welcome/login page
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const NavLink = ({ link }) => (
    <Link
      to={link.to}
      className={`flex items-center gap-3 p-3 mx-2 my-1 cursor-pointer transition-colors rounded-lg
        hover:bg-primary/90 dark:hover:bg-gray-800
        ${location.pathname === link.to ? 'bg-accent dark:bg-accent font-semibold' : ''}
      `}
    >
      {link.icon}
      {isOpen && <span>{link.label}</span>}
    </Link>
  );

  return (
    // --- UI FIX #1: Make the sidebar sticky and full-height ---
    <div className={`relative hidden md:flex flex-col ${isOpen ? "w-60" : "w-16"} transition-all duration-300 shadow-soft bg-primary text-white dark:bg-gray-900 dark:text-gray-100 h-screen sticky top-0`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 hover:bg-primary/90 dark:hover:bg-gray-800 transition-colors self-end"
      >
        <Menu size={20} />
      </button>

      <nav className="mt-4 flex-1 overflow-y-auto">
        {/* {mainLinks.map((link) => <NavLink key={link.label} link={link} />)} */}
        
        <div className="my-4 px-4">
          <hr className={`border-t border-white/20 ${isOpen ? '' : 'hidden'}`} />
          {isOpen && <span className="text-xs text-white/60 mt-2 block">AI Tools</span>}
        </div>

        {aiToolLinks.map((link) => <NavLink key={link.label} link={link} />)}
      </nav>

      {/* --- UI FIX #2: The User Menu / Logout Button --- */}
      <div className="p-3 border-t border-white/20 relative">
        {/* The Drop-up Menu */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full mb-2 w-[calc(100%-1.5rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-left p-3 text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut size={20} />
              {isOpen && <span>Logout</span>}
            </button>
          </div>
        )}

        {/* The Clickable User Info Button */}
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center gap-2 hover:bg-primary/90 dark:hover:bg-gray-800 p-2 rounded-lg"
        >
          <img src="/balbuddy.png" alt="BalBuddy" className="w-8 h-8 rounded-full" />
          {isOpen && (
            <div className="flex-1 text-left">
              <span className="text-sm font-semibold">SuperTeacher</span>
              <span className="text-xs text-white/70 block truncate">{user?.email}</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}