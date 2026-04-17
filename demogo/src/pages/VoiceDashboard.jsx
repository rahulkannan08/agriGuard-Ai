import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const VoiceDashboard = ({ user, language, updateUserProfile }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="voice" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 bg-surface min-h-screen flex items-center justify-center">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="space-y-4">
              <div className="w-32 h-32 mx-auto bg-primary-fixed/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-7xl text-primary">
                  mic
                </span>
              </div>
              <h1 className="text-4xl font-headline font-bold text-primary">
                Voice Assistant
              </h1>
              <p className="text-lg text-on-surface-variant">
                Speak naturally to get agricultural advice and disease
                information
              </p>
            </div>

            <div className="space-y-6">
              <button className="w-full py-6 px-8 bg-primary text-white rounded-2xl font-headline font-bold text-xl hover:bg-primary-container shadow-lg active:scale-95 transition-all animate-pulse">
                <span
                  className="material-symbols-outlined mr-4 text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mic
                </span>
                Tap to Start Listening
              </button>

              <div className="bg-surface-container-lowest p-8 rounded-xl space-y-4">
                <h3 className="font-bold text-on-surface mb-4">Try saying:</h3>
                {[
                  '"What diseases can affect my tomato plants?"',
                  '"How do I treat rice blight?"',
                  '"What\'s the weather forecast for my area?"',
                  '"Show me disease locations nearby"',
                ].map((phrase, idx) => (
                  <button
                    key={idx}
                    className="w-full p-3 text-left bg-surface-container-high hover:bg-surface-container transition-all rounded-lg flex items-center gap-3 group"
                  >
                    <span className="material-symbols-outlined text-secondary group-hover:text-primary">
                      record_voice_over
                    </span>
                    <span className="text-on-surface italic">{phrase}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate("/chat")}
                className="flex-1 py-4 px-6 bg-secondary-fixed-dim text-on-secondary-fixed rounded-xl font-bold hover:opacity-80 transition-all"
              >
                <span className="material-symbols-outlined mr-2">
                  chat_bubble
                </span>
                Text Chat
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-4 px-6 bg-surface-container-low text-on-surface rounded-xl font-bold hover:bg-surface-container border border-outline-variant"
              >
                <span className="material-symbols-outlined mr-2">
                  arrow_back
                </span>
                Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VoiceDashboard;
