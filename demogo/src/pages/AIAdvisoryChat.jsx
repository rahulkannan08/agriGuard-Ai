import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";
import { sendChatMessage } from "../services/api";

const AIAdvisoryChat = ({ user, language, updateUserProfile }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      const userMessage = {
        id: Date.now(),
        type: "farmer",
        text: inputText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");
      setIsLoading(true);

      try {
        // Get context from recent diagnosis if available
        const lastScan = JSON.parse(localStorage.getItem("recentScans") || "[]")?.[0];
        const context = lastScan
          ? `Current diagnosis: ${lastScan.crop} with ${lastScan.status}`
          : "";

        const response = await sendChatMessage(inputText, context);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: "ai",
            text: response.message || "I'm here to help. Could you provide more details about your concern?",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            actions: response.actions || [],
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: "ai",
            text: "I'm having trouble connecting to the advisory service. Please try again in a moment.",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="chat" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 pb-48 lg:pb-56 bg-surface">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Contextual Scan Result Header */}
            <section className="mb-8 relative">
              <div className="bg-surface-container-low rounded-xl p-5 flex items-center gap-5 border-l-4 border-primary">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                  <img
                    className="w-full h-full object-cover"
                    alt="close-up of paddy rice leaf with brown spots fungal infection"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwHMgpQ4udgpe-qKznlf8wgEB7Vsh70Lx8Zoir8Ey1eS9FF8TfQSGEuLu9my6JosXEszEJpLPb5iaMb-OyQVL2GyCX4bhcFNQ5iiV_-545eWblcm9IqmyfYMBnmHJFk1ENcnpud1NYQXmLIgZ6G0KF9DNKe7p5lSDzLavKQgo4QmdlWuMeQHppW6saRBbTbc6vk-JHzoJctA14IFN1fbVJWy72IozbYiv7KtgTDpueAkmcpOvg8obZt5jDHUpMI4fQym38FeYw-A"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="material-symbols-outlined text-error text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      error
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                      Active Diagnosis
                    </span>
                  </div>
                  <h2 className="font-headline text-xl text-primary font-bold">
                    Paddy Brown Spot
                  </h2>
                  <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">
                    Detected 12 mins ago • Sector 4B
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-error-container text-error text-[10px] font-bold rounded-full uppercase">
                      High Severity
                    </span>
                    <span className="px-2 py-1 bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold rounded-full uppercase">
                      Rice Crop
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="material-symbols-outlined text-outline-variant">
                    analytics
                  </span>
                </div>
              </div>
            </section>

            {/* Chat Area */}
            <div className="space-y-8 mb-12">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === "farmer" ? (
                    <div className="flex flex-col items-end pl-12">
                      <div className="bg-primary text-on-primary rounded-2xl rounded-tr-none px-6 py-4 shadow-sm max-w-lg">
                        <p className="text-sm font-medium leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                      <span className="text-[10px] mt-2 font-semibold text-outline tracking-wider uppercase">
                        Farmer • {msg.time}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start pr-12">
                      <div className="bg-surface-container-lowest rounded-2xl rounded-tl-none px-6 py-4 shadow-sm border border-outline-variant/10 max-w-lg relative">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary-container rounded-full flex items-center justify-center">
                              <span
                                className="material-symbols-outlined text-primary-fixed-dim text-xs"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                auto_awesome
                              </span>
                            </div>
                            <span className="text-xs font-bold text-primary tracking-wide">
                              AgriGuard AI
                            </span>
                          </div>
                          <button className="text-primary-container hover:opacity-70">
                            <span
                              className="material-symbols-outlined text-lg"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              volume_up
                            </span>
                          </button>
                        </div>
                        <p className="text-on-surface leading-relaxed text-sm">
                          {msg.text}
                        </p>
                        {msg.actions && (
                          <div className="mt-4 pt-4 border-t border-surface-variant flex gap-4">
                            {msg.actions.map((action, idx) => (
                              <button
                                key={idx}
                                className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:opacity-70"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {action === "VIEW MANUAL"
                                    ? "menu_book"
                                    : "shopping_cart"}
                                </span>
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] mt-2 font-semibold text-outline tracking-wider uppercase">
                        AI Advisor • {msg.time}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Suggestion Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: "eco", label: "Safe for organic?" },
                { icon: "calendar_month", label: "Harvest time?" },
                { icon: "health_and_safety", label: "Chemical safety?" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(chip.label)}
                  className="bg-surface-container-low hover:bg-surface-container-high transition-colors px-4 py-3 rounded-xl text-left border border-outline-variant/10 group"
                >
                  <span className="material-symbols-outlined text-secondary block mb-1">
                    {chip.icon}
                  </span>
                  <span className="text-xs font-bold text-on-surface block">
                    {chip.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* Voice-First Input Dock */}
        <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-8 pt-6 glass-card md:ml-64">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-6 mb-6">
              {/* Text Input Area */}
              <div className="flex-grow flex items-center bg-surface-container rounded-full px-5 py-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                  placeholder="Ask your question..."
                  disabled={isLoading}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full text-on-surface placeholder-on-surface-variant/60 disabled:opacity-60"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="ml-2 text-primary hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">
                    {isLoading ? "hourglass_empty" : "send"}
                  </span>
                </button>
              </div>

              {/* Large Microphone Button */}
              <div className="flex flex-col items-center">
                <button className="w-16 h-16 sm:w-20 sm:h-20 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform duration-150 hover:bg-primary-container">
                  <span
                    className="material-symbols-outlined text-3xl sm:text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mic
                  </span>
                </button>
                <div className="mt-2 flex gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  <span>English</span>
                  <span className="text-outline">/</span>
                  <span>ಕನ್ನಡ</span>
                  <span className="text-outline">/</span>
                  <span>தமிழ்</span>
                </div>
              </div>

              {/* Accessibility Toggles */}
              <div className="flex flex-col gap-3">
                <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
                  <span className="material-symbols-outlined">translate</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-outline-variant uppercase">
                    TTS
                  </span>
                  <div className="w-8 h-4 bg-primary rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisoryChat;
