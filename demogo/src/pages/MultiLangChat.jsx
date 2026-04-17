import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const MultiLangChat = ({ user, language, setLanguage, updateUserProfile }) => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState(language);

  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
    { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="chat" />
      <div className="flex-grow md:ml-64">
        <Navigation
          user={user}
          language={language}
          setLanguage={setLanguage}
          updateUserProfile={updateUserProfile}
        />
        <main className="p-4 md:p-8 bg-surface min-h-screen">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-headline font-bold text-primary mb-4">
                Multilingual Support
              </h1>
              <p className="text-on-surface-variant">
                Chat with AgriGuard AI in your preferred language
              </p>
            </div>

            {/* Language Switcher */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 mb-8">
              <h2 className="font-bold text-on-surface mb-6">
                Select Your Language
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`p-6 rounded-xl transition-all border-2 text-center ${
                      selectedLang === lang.code
                        ? "border-primary bg-primary-fixed/10"
                        : "border-outline-variant/20 hover:border-outline-variant/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {lang.code === "en"
                        ? "🇬🇧"
                        : lang.code === "ta"
                          ? "🇮🇳"
                          : "🇮🇳"}
                    </div>
                    <p className="font-bold text-on-surface">{lang.name}</p>
                    <p className="text-lg text-primary font-bold">
                      {lang.nativeName}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-6 min-h-96">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-primary text-white rounded-2xl rounded-tr-none px-6 py-4 max-w-md">
                    <p className="text-sm">
                      {selectedLang === "en"
                        ? "What crops can I grow in my region?"
                        : selectedLang === "ta"
                          ? "எனது பகுதியில் எந்த பயிர்களை வளர்க்கலாம்?"
                          : "ನನ್ನ ಪ್ರದೇಶದಲ್ಲಿ ನಾನು ಯಾವ ಫಸಲುಗಳನ್ನು ಬೆಳೆಯಬಹುದು?"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-surface-container rounded-2xl rounded-tl-none px-6 py-4 max-w-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        auto_awesome
                      </span>
                      <span className="text-xs font-bold text-primary">
                        AgriGuard AI
                      </span>
                    </div>
                    <p className="text-sm text-on-surface">
                      {selectedLang === "en"
                        ? "I recommend growing rice, sugarcane, and vegetables based on your region's climate and soil type."
                        : selectedLang === "ta"
                          ? "உங்கள் பகுதியின் காலநிலை மற்றும் மண் வகை அடிப்படையில் நெல், கரும்புட்டி மற்றும் காய்கறிகளை வளர்க்க நான் பரிந்துரைக்கிறேன்."
                          : "ನಿಮ್ಮ ಪ್ರದೇಶದ ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಪ್ರಕಾರದ ಆಧಾರದ ಮೇಲೆ, ನಾನು ಅಕ್ಕಿ, ಸಕ್ಕರೆ ಮತ್ತು ತರಕಾರಿಗಳನ್ನು ಬೆಳೆಯಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    placeholder={
                      selectedLang === "en"
                        ? "Ask a question..."
                        : selectedLang === "ta"
                          ? "கேள்வி கேளுங்கள்..."
                          : "ಪ್ರಶ್ನೆ ಕೇಳಿ..."
                    }
                    className="flex-grow bg-surface-container-high rounded-full px-6 py-3 focus:ring-2 focus:ring-primary border-none"
                  />
                  <button className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-container">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>

                <div className="flex gap-4 flex-wrap">
                  {[
                    {
                      en: "Disease prevention",
                      ta: "நோய் தடுப்பு",
                      kn: "ರೋಗ ತಡೆಯುವಿಕೆ",
                    },
                    {
                      en: "Pest control",
                      ta: "பூச்சி ನಿಯಂತ್ರಣ",
                      kn: "ಕೀಟ ನಿಯಂತ್ರಣ",
                    },
                    {
                      en: "Weather forecast",
                      ta: "ಹವಾಮಾನ ಮುನ್ನೋಟ",
                      kn: "ತಾತ್ಕಾಲಿಕ ಮುನ್ನೋಟ",
                    },
                  ].map((topic, idx) => (
                    <button
                      key={idx}
                      className="px-4 py-2 bg-surface-container-high text-on-surface rounded-full text-sm hover:bg-outline-variant/20 transition-all"
                    >
                      {selectedLang === "en"
                        ? topic.en
                        : selectedLang === "ta"
                          ? topic.ta
                          : topic.kn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => navigate("/chat")}
                className="flex-1 py-4 px-6 bg-surface-container-low text-on-surface rounded-xl font-bold hover:bg-surface-container border border-outline-variant"
              >
                Back to Chat
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-4 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary-container transition-all"
              >
                Return Home
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MultiLangChat;
