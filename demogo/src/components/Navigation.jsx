import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Navigation = ({ user, language, setLanguage, updateUserProfile }) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleEmojiSelect = (emoji) => {
    if (updateUserProfile) {
      updateUserProfile({ avatar: emoji });
    }
    setShowProfileMenu(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && updateUserProfile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUserProfile({ avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
    setShowProfileMenu(false);
  };

  const emojis = [
    "😊",
    "🙂",
    "😍",
    "🤩",
    "😎",
    "🧑‍🌾",
    "👨‍🌾",
    "👩‍🌾",
    "🌾",
    "👨‍💼",
    "👩‍💼",
  ];

  return (
    <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-6 py-4 border-b border-outline-variant/10 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-primary text-3xl">
          farm
        </span>
        <h1 className="text-2xl font-black text-primary uppercase tracking-wider hidden md:block">
          AgriGuard AI
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <button
          className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          title="Language"
          onClick={() => {
            if (setLanguage) {
              const langs = ["en", "ta", "kn"];
              const currentIndex = langs.indexOf(language || "en");
              setLanguage(langs[(currentIndex + 1) % langs.length]);
            }
          }}
        >
          <span className="material-symbols-outlined text-on-surface-variant">
            language
          </span>
        </button>

        <button
          className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          title="Translate"
        >
          <span className="material-symbols-outlined text-on-surface-variant">
            translate
          </span>
        </button>

        {/* Profile Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-full bg-secondary-container overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          >
            <img
              className="w-full h-full object-cover"
              alt="User Avatar"
              src={
                user?.avatar ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCwzdLzhgfbRAv0YApN6BoNYYimK3_m4nkZQb2DUw2s3Oq6CML8CWYLcaZEuPXyPQl7J6-1Us7xkAikMjv1l7Q5dcXmVCUDY3NsG3oZfDsvQaNKJI2ikNrQfpXZR57oOn98O7yo-luOBPObVtzJJpo2efDQvOI5qJ0mL0cBi_p-QQUu6U4hXGKdSRM4vKtac9vly4q_fRMlyM3VfoaIPnq_oFLCUH6mUizuAd6acACghsrK2j6C7FIM04tm0fOrO0paYtwqF8C1Mw"
              }
              loading="lazy"
            />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 p-4 z-50">
              {/* Profile Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/10 mb-4">
                <img
                  className="w-12 h-12 rounded-full object-cover"
                  alt="Profile"
                  src={
                    user?.avatar ||
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuCwzdLzhgfbRAv0YApN6BoNYYimK3_m4nkZQb2DUw2s3Oq6CML8CWYLcaZEuPXyPQl7J6-1Us7xkAikMjv1l7Q5dcXmVCUDY3NsG3oZfDsvQaNKJI2ikNrQfpXZR57oOn98O7yo-luOBPObVtzJJpo2efDQvOI5qJ0mL0cBi_p-QQUu6U4hXGKdSRM4vKtac9vly4q_fRMlyM3VfoaIPnq_oFLCUH6mUizuAd6acACghsrK2j6C7FIM04tm0fOrO0paYtwqF8C1Mw"
                  }
                />
                <div className="flex-grow">
                  <p className="font-bold text-on-surface">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {user?.area || "Region"}
                  </p>
                </div>
              </div>

              {/* Select Avatar Emoji */}
              <div className="mb-4">
                <p className="text-xs font-bold text-on-surface-variant uppercase mb-3">
                  Select Avatar Emoji
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-2xl p-2 hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Picture */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-surface-container-high text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 mb-3"
              >
                <span className="material-symbols-outlined text-lg">
                  photo_camera
                </span>
                Upload Picture
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Menu Items */}
              <div className="space-y-1 border-t border-outline-variant/10 pt-3 mt-3">
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-3"
                >
                  <span className="material-symbols-outlined">settings</span>
                  Settings
                </button>
                <button
                  onClick={() => {
                    navigate("/support");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-3"
                >
                  <span className="material-symbols-outlined">help</span>
                  Help & Support
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-error text-sm font-medium rounded-lg hover:bg-error/10 transition-colors flex items-center gap-3"
                  onClick={() => {
                    setShowProfileMenu(false);
                  }}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Navigation);
