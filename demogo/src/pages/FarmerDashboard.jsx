import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const FarmerDashboard = ({
  user,
  language,
  setLanguage,
  updateUserProfile,
}) => {
  const navigate = useNavigate();
  const [threatLevel, setThreatLevel] = useState("moderate");
  const [recentScans, setRecentScans] = useState([]);

  // Load recent scans from local storage
  useEffect(() => {
    const savedScans = localStorage.getItem("recentScans");
    if (savedScans) {
      try {
        setRecentScans(JSON.parse(savedScans));
      } catch (e) {
        setRecentScans([]);
      }
    }
  }, []);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  // Recent scans loaded from localStorage are now in state

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="dashboard" />
      <div className="flex-grow md:ml-64">
        <Navigation
          user={user}
          language={language}
          setLanguage={setLanguage}
          updateUserProfile={updateUserProfile}
        />
        <main className="p-4 md:p-8 pb-24 bg-surface">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Section */}
            <section className="relative h-64 md:h-80 rounded-xl overflow-hidden flex flex-col justify-end p-8 text-white">
              <div className="absolute inset-0 z-0">
                <img
                  className="w-full h-full object-cover"
                  alt="expansive lush green rice paddy fields at sunrise with misty mountains in the background"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjLqDpEtWa8P6kZmXub4OsGXcWplPT7c8-d1y71IgXvx0FhQ1F5dvJVIPYMaR7EDJb8B_lawEXWxYOCfVqzhop-4LKkML0Lwsdx_J-oCm-lnX4O0XYpLgXjqnD1PJpKAgfWqF7rE1TKUU1IG9CqiKWbWU4rCL3xPZVDhLk68FpbTcG9Ef4dV4eFp-JQQNFLMYct-ACLwIwmOBo_3AOzebQtbIvUHE7TC5yN2khNjWa9Qkv7Vs6OzE8aWesEQqGYbY9mj2lrDKKTQ"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent"></div>
              </div>
              <div className="relative z-10">
                <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight mb-2 uppercase">
                  {user?.area || "Gubbi"} Fields
                </h1>
                <p className="text-lg opacity-90 max-w-md font-body leading-relaxed">
                  System monitoring active. Local threat level:{" "}
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded text-sm font-bold uppercase ml-1">
                    Moderate
                  </span>
                </p>
              </div>
            </section>

            {/* Action & Status Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Action Card */}
              <div className="md:col-span-1 bg-primary text-white rounded-xl p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-container rounded-full opacity-50 blur-2xl"></div>
                <div>
                  <div className="w-12 h-12 bg-on-primary-container rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      photo_camera
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold font-headline leading-tight mb-2">
                    Identify a Problem
                  </h2>
                  <p className="text-primary-fixed-dim text-sm mb-8 leading-relaxed">
                    Capture a clear photo of any leaf showing spots or
                    discoloration for instant AI diagnosis.
                  </p>
                </div>
                <button
                  onClick={() => handleNavigate("/diagnosis")}
                  className="w-full py-4 bg-primary-fixed text-on-primary-fixed rounded-lg font-bold text-lg hover:bg-white transition-all active:scale-95"
                >
                  Scan New Leaf
                </button>
              </div>

              {/* AI Advisor Card */}
              <div className="md:col-span-2 bg-surface-container-low rounded-xl p-8 border border-white/40 flex flex-col md:flex-row gap-8 items-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
                </div>
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-surface-container-highest rounded-full text-xs font-bold text-primary uppercase tracking-wider">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span>AI Active</span>
                  </div>
                  <h2 className="text-3xl font-bold font-headline text-on-surface">
                    AgriAdvisor
                  </h2>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Your digital agronomist is ready. Ask about soil pH, pest
                    cycles, or crop rotation.
                  </p>
                  <button
                    onClick={() => handleNavigate("/chat")}
                    className="text-primary font-bold flex items-center space-x-2 group"
                  >
                    <span>Start Consultation</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </button>
                </div>
                <div className="w-full md:w-2/3 bg-white rounded-xl p-4 shadow-sm space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-secondary-fixed text-sm">
                        psychology
                      </span>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-r-xl rounded-bl-xl">
                      <p className="text-xs font-semibold text-primary mb-1">
                        Advisor Tip
                      </p>
                      <p className="text-sm text-on-surface leading-relaxed">
                        Current humidity levels suggest higher risk of Downy
                        Mildew for Grapes. Check your leaves today.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Type your question..."
                      className="flex-grow bg-surface border-none rounded-lg text-sm focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleNavigate("/chat")}
                      className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Data Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Scan History */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-headline text-on-surface">
                    Recent Scan History
                  </h2>
                  <button className="text-sm font-semibold text-primary hover:underline">
                    View All History
                  </button>
                </div>
                <div className="space-y-4">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="bg-surface-container-lowest p-4 rounded-xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleNavigate("/diagnosis")}
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                        <img
                          className="w-full h-full object-cover"
                          alt={scan.crop}
                          src={scan.image}
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-on-surface">
                            {scan.crop}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              scan.statusType === "error"
                                ? "bg-error-container text-on-error-container"
                                : scan.statusType === "success"
                                  ? "bg-primary-fixed text-on-primary-fixed-variant"
                                  : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                            }`}
                          >
                            {scan.status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mb-2">
                          Scanned {scan.date} • {scan.location}
                        </p>
                        <div className="flex space-x-2">
                          <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded-full font-medium">
                            {scan.confidence} Confidence
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant">
                        chevron_right
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap Preview */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-headline text-on-surface">
                    Local Heatmap
                  </h2>
                  <button
                    onClick={() => handleNavigate("/heatmap")}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Expand Map
                  </button>
                </div>
                <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm relative h-80">
                  <div className="absolute inset-0 grayscale opacity-40">
                    <img
                      className="w-full h-full object-cover"
                      alt="satellite view map of agricultural fields"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk5ew796QufYcqGMQpOKGtf_lhfmlZrRA97cjzkHo0jh3lHwFESJW-81yy9IHfwVrAEvD1pg1cc_fGW7vkW4gjzrQ2xzSr7wCYVDCjeNZeqMRneyoZJWm589qtb1iRft1LqEd-XJuweQJeHoJuIllzXa1bkfDTE8XgWzidMcoGE55SOp3J2WjnN3EuUMkZs7So2xNh-E3EcLCHw6NA6QPlxaqiAf-v7VjmTwfWOznSg0enJKUA1YUBlwc_QcxbLtv0a4smqw_ouQ"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 p-8 flex flex-col justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-[10px] font-bold text-primary uppercase">
                        Active Hazards
                      </div>
                    </div>
                    <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-error rounded-full blur-3xl opacity-30 animate-pulse"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-32 h-32 bg-tertiary-fixed-dim rounded-full blur-3xl opacity-40"></div>
                    <div className="relative z-10 bg-white/90 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/40">
                      <p className="text-xs font-bold text-primary mb-2">
                        Zone Status
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-error mr-2"></span>
                            North
                          </span>
                          <span className="text-error">High Risk</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim mr-2"></span>
                            Central
                          </span>
                          <span className="text-on-tertiary-fixed-variant">
                            Caution
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-primary-fixed-dim mr-2"></span>
                            South
                          </span>
                          <span className="text-on-primary-fixed-variant">
                            Low Risk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-surface-container-highest rounded-xl">
                  <p className="text-xs text-on-surface-variant italic">
                    Showing 5km radius. Data updated 14 mins ago.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => handleNavigate("/diagnosis")}
        className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"
      >
        <span className="material-symbols-outlined text-3xl">add_a_photo</span>
      </button>
    </div>
  );
};

export default React.memo(FarmerDashboard);
