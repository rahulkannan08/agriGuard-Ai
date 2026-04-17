import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const DiagnosisTreatment = ({ user, language, updateUserProfile }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const severityChip = useMemo(() => {
    const severity = analysis?.prediction?.severity || "low";
    const map = {
      none: "bg-green-100 text-green-800",
      low: "bg-yellow-100 text-yellow-800",
      moderate: "bg-orange-100 text-orange-800",
      high: "bg-red-100 text-red-800",
      critical: "bg-red-200 text-red-900",
    };
    return map[severity] || map.low;
  }, [analysis]);

  const handlePickImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
    setAnalysis(null);
  };

  const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage("Please upload a leaf image first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const form = new FormData();
    form.append("image", selectedFile);
    form.append("cropType", "auto");
    form.append("location", user?.area || "Unknown");

    try {
      const response = await fetch(`${backendUrl}/api/analyze/upload`, {
        method: "POST",
        body: form,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Analysis failed. Please try again.");
      }

      // Save successful analysis to localStorage for dashboard
      if (payload.success) {
        const newScan = {
          id: Date.now(),
          crop: payload.prediction?.crop || "Unknown",
          status: payload.prediction?.diseaseName || "Unknown",
          statusType: 
            payload.prediction?.severity === 'critical' || payload.prediction?.severity === 'high' ? 'error' :
            payload.prediction?.severity === 'none' ? 'success' : 'warning',
          confidence: `${Math.round((payload.prediction?.confidence || 0) * 100)}%`,
          date: new Date().toLocaleDateString(),
          location: user?.area || "Unknown",
          image: previewUrl,
        };
        
        const existingScans = JSON.parse(localStorage.getItem("recentScans") || "[]");
        const updatedScans = [newScan, ...existingScans].slice(0, 5); // Keep last 5
        localStorage.setItem("recentScans", JSON.stringify(updatedScans));
      }

      setAnalysis(payload);
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect to backend service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setAnalysis(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="diagnosis" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 bg-surface min-h-screen">
          <div className="max-w-4xl mx-auto">
            {!analysis ? (
              <section className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-headline font-bold text-primary mb-4">
                    Leaf Scan Diagnosis
                  </h1>
                  <p className="text-on-surface-variant text-lg">
                    Capture a clear image of your leaf to get instant disease
                    detection
                  </p>
                </div>

                {/* Camera/Upload Section */}
                <div className="bg-surface-container-lowest border-2 border-dashed border-primary rounded-2xl p-12 flex flex-col items-center justify-center min-h-80">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-24 h-24 rounded-full bg-primary-fixed/20 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-6xl">
                      photo_camera
                    </span>
                  </div>
                  <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
                    Take or Upload Photo
                  </h2>
                  <p className="text-on-surface-variant mb-8 text-center max-w-md">
                    For best results, capture the leaf under natural light with
                    clear focus on affected areas
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handlePickImage}
                      className="px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-container transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined mr-2">
                        photo_camera
                      </span>
                      Take Photo
                    </button>
                    <button
                      onClick={handlePickImage}
                      className="px-8 py-4 bg-surface-container-low text-on-surface rounded-xl font-bold hover:bg-surface-container transition-all border border-outline-variant"
                    >
                      <span className="material-symbols-outlined mr-2">
                        upload_file
                      </span>
                      Upload File
                    </button>
                  </div>
                  {selectedFile && (
                    <div className="mt-6 w-full max-w-md text-center">
                      <p className="text-sm text-on-surface-variant mb-3">Selected: {selectedFile.name}</p>
                      <img
                        src={previewUrl}
                        alt="Leaf preview"
                        className="w-full h-52 object-cover rounded-xl border border-outline-variant/30"
                      />
                      <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="mt-4 px-8 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-container transition-all disabled:opacity-70"
                      >
                        {isLoading ? "Analyzing..." : "Analyze Leaf"}
                      </button>
                    </div>
                  )}
                  {errorMessage && (
                    <p className="mt-5 text-sm text-error font-semibold">{errorMessage}</p>
                  )}
                </div>

                {/* Tips Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: "light_mode",
                      title: "Good Lighting",
                      desc: "Use natural sunlight or bright LED",
                    },
                    {
                      icon: "center_focus_strong",
                      title: "Focus on Problem",
                      desc: "Zoom in on damaged areas",
                    },
                    {
                      icon: "phone_in_talk",
                      title: "Steady Hand",
                      desc: "Keep camera still for sharp images",
                    },
                  ].map((tip, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20"
                    >
                      <span className="material-symbols-outlined text-4xl text-primary mb-4">
                        {tip.icon}
                      </span>
                      <h3 className="font-headline font-bold text-on-surface mb-2">
                        {tip.title}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {tip.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={handleReset}
                    className="text-primary hover:opacity-70"
                  >
                    <span className="material-symbols-outlined text-2xl">
                      arrow_back
                    </span>
                  </button>
                  <h1 className="text-3xl font-headline font-bold text-primary">
                    Diagnosis Results
                  </h1>
                </div>

                {/* Main Diagnosis Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-lg border-l-4 border-primary">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                      <img
                        className="w-full h-64 object-cover rounded-xl"
                        alt="Leaf sample"
                        src={previewUrl}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-6">
                      <div>
                        <p
                          className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full mb-2 ${severityChip}`}
                        >
                          {(analysis?.prediction?.severity || "low").toUpperCase()} SEVERITY
                        </p>
                        <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">
                          {analysis?.prediction?.diseaseName || "Unknown Disease"}
                        </h2>
                        <p className="text-on-surface-variant leading-relaxed mb-4">
                          {analysis?.recommendations?.summary ||
                            "Diagnosis summary is not available for this scan."}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-primary">
                              {formatPercent(analysis?.prediction?.confidence)}
                            </p>
                            <p className="text-xs font-semibold text-on-surface-variant">
                              Confidence
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-on-surface">
                              {(analysis?.prediction?.crop || "unknown").toUpperCase()}
                            </p>
                            <p className="text-xs font-semibold text-on-surface-variant">
                              Crop
                            </p>
                          </div>
                        </div>
                        {analysis?.warning?.message && (
                          <p className="mt-4 text-sm text-error font-semibold">
                            {analysis.warning.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => navigate("/chat")}
                          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-container transition-all"
                        >
                          <span className="material-symbols-outlined mr-2">
                            chat_bubble
                          </span>
                          Ask AI Advisor
                        </button>
                        <button
                          onClick={() => navigate("/heatmap")}
                          className="px-6 py-3 bg-surface-container-low text-on-surface rounded-lg font-bold hover:bg-surface-container border border-outline-variant transition-all"
                        >
                          <span className="material-symbols-outlined mr-2">
                            map
                          </span>
                          View Heatmap
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-headline font-bold text-on-surface">
                    Treatment Recommendations
                  </h3>
                  {[
                    {
                      step: "1",
                      title: "Immediate Action",
                      desc:
                        analysis?.recommendations?.immediateActions?.join("; ") ||
                        "No immediate actions returned.",
                      action: "Open AI Advisor",
                    },
                    {
                      step: "2",
                      title: "Organic Treatment",
                      desc:
                        analysis?.recommendations?.organicTreatment?.join("; ") ||
                        "No organic treatment returned.",
                      action: "View Details",
                    },
                    {
                      step: "3",
                      title: "Chemical & Prevention",
                      desc:
                        [
                          ...(analysis?.recommendations?.chemicalTreatment || []),
                          ...(analysis?.recommendations?.preventiveMeasures || []),
                        ].join("; ") || "No additional treatment guidance returned.",
                      action: "View Heatmap",
                    },
                  ].map((treatment) => (
                    <div
                      key={treatment.step}
                      className="bg-surface-container-lowest p-6 rounded-xl flex items-start gap-6 border border-outline-variant/20 hover:shadow-md transition-shadow"
                    >
                      <div className="w-12 h-12 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                        {treatment.step}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-on-surface mb-1">
                          {treatment.title}
                        </h4>
                        <p className="text-sm text-on-surface-variant mb-3">
                          {treatment.desc}
                        </p>
                        <button
                          onClick={() =>
                            treatment.step === "3" ? navigate("/heatmap") : navigate("/chat")
                          }
                          className="text-primary font-bold text-sm hover:underline"
                        >
                          {treatment.action} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiagnosisTreatment;
