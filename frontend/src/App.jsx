// frontend/src/App.jsx
import React, { createContext,useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import Layouts
import { DashboardLayout } from "./layouts/DashboardLayout";

// Import your static components
import Welcome from "./pages/Welcome";
import TeacherProfileSetup from "./pages/TeacherProfileSetup";
import SyllabusSetup from "./pages/SyllabusSetup";
import Dashboard from "./pages/Dashboard";

// Import your functional AI tool pages
import WorksheetGeneratorPage from "./pages/WorksheetGeneratorPage";
import StoryGeneratorPage from "./pages/StoryGeneratorPage";
import ConceptExplainerPage from "./pages/ConceptExplainerPage";
import ChalkboardViewPage from "./pages/ChalkboardViewPage";
import SyllabusUploader from "./pages/SyllabusUploader";
import SahayakAgentPage from "./pages/SahayakAgentPage";

// Import our new auth components
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// We'll just wrap it with our AuthProvider
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [festival, setFestival] = useState(false);

  // Apply classes to html element
  React.useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    if (festival) {
      html.classList.add("festival-diwali");
    } else {
      html.classList.remove("festival-diwali");
    }
  }, [dark, festival]);

  return (
    <ThemeContext.Provider value={{ dark, setDark, festival, setFestival }}>
      <div className={`min-h-screen ${dark ? 'dark' : ''} ${festival ? 'festival-diwali' : ''}`}>
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            className="px-3 py-1 rounded bg-primary text-white font-semibold hover:bg-primary/90 transition"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            className="px-3 py-1 rounded bg-accent text-white font-semibold hover:bg-accent/90 transition"
            onClick={() => setFestival((f) => !f)}
          >
            {festival ? "Normal Mode" : "Festival Mode"}
          </button>
        </div>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function Lessons() {
  return <div className="p-8 text-xl">📚 Lessons Page (Coming Soon)</div>;
}
function Students() {
  return <div className="p-8 text-xl">🧑‍🎓 Students Page (Coming Soon)</div>;
}
function Achievements() {
  return <div className="p-8 text-xl">🏆 Achievements Page (Coming Soon)</div>;
}

function ProfileOnboarding() {
  return <TeacherProfileSetup />;
}

function SyllabusOnboarding() {
  return <SyllabusSetup />;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Welcome />} />

          {/* Protected Onboarding Routes (without the main sidebar) */}
          <Route path="/onboarding/profile" element={<ProtectedRoute><TeacherProfileSetup /></ProtectedRoute>} />
          <Route path="/onboarding/syllabus" element={<ProtectedRoute><SyllabusSetup /></ProtectedRoute>} />

          {/* --- DEFINITIVE NESTED ROUTE STRUCTURE --- */}
          <Route
            path="/"
            element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
          >
            {/* All pages inside here will share the DashboardLayout */}
            {/* <Route path="dashboard" element={<Dashboard />} /> */}
            {/* <Route path="lessons" element={<Lessons />} /> */}
            {/* <Route path="students" element={<Students />} /> */}
            {/* <Route path="achievements" element={<Achievements />} /> */}
            <Route path="dashboard/worksheets" element={<WorksheetGeneratorPage />} />
            <Route path="dashboard/story" element={<StoryGeneratorPage />} />
            <Route path="dashboard/concept" element={<ConceptExplainerPage />} />
            <Route path="dashboard/chalkboard" element={<ChalkboardViewPage />} />
            <Route path="dashboard/syllabus-upload" element={<SyllabusUploader />} />
            <Route path="dashboard/agent" element={<SahayakAgentPage />} />
          </Route>
          {/* ------------------------------------------- */}

          {/* Fallback route */}
          <Route path="*" element={<Navigate to='/dashboard/agent' replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
export default App;
