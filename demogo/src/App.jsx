import React, { useState, useCallback, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import AIAdvisoryChat from "./pages/AIAdvisoryChat";
import DiagnosisTreatment from "./pages/DiagnosisTreatment";
import DiseaseHeatmap from "./pages/DiseaseHeatmap";
import VoiceDashboard from "./pages/VoiceDashboard";
import MultiLangChat from "./pages/MultiLangChat";
import CropCatalog from "./pages/CropCatalog";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import { getStoredUser } from "./services/api";

function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user session on app load
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setLanguage("en"); // Default to English, can be updated in settings
    }
    setIsLoading(false);
  }, []);

  const handleRegistration = useCallback((userData) => {
    setUser(userData);
    setLanguage(userData.language || "en");
  }, []);

  const updateUserProfile = useCallback((updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary-fixed border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading AgriGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/register" element={<Registration onRegister={handleRegistration} setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <FarmerDashboard
              user={user}
              language={language}
              setLanguage={setLanguage}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/chat"
          element={
            <AIAdvisoryChat
              user={user}
              language={language}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/diagnosis"
          element={
            <DiagnosisTreatment
              user={user}
              language={language}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/heatmap"
          element={
            <DiseaseHeatmap
              user={user}
              language={language}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/voice"
          element={
            <VoiceDashboard
              user={user}
              language={language}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/multilang-chat"
          element={
            <MultiLangChat
              user={user}
              language={language}
              setLanguage={setLanguage}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/catalog"
          element={
            <CropCatalog
              user={user}
              language={language}
              setLanguage={setLanguage}
              updateUserProfile={updateUserProfile}
            />
          }
        />
        <Route
          path="/support"
          element={<Support user={user} language={language} />}
        />
        <Route
          path="/settings"
          element={
            <Settings
              user={user}
              language={language}
              updateUserProfile={updateUserProfile}
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
