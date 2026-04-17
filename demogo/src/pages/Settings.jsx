import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const Settings = ({ user, language, updateUserProfile }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    area: user?.area || "",
    email: user?.email || "",
    language: user?.language || "en",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const fileInputRef = React.useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUserProfile(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="settings" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 pb-24 bg-surface">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Success Message */}
            {showSuccess && (
              <div className="bg-primary-fixed text-on-primary-fixed p-4 rounded-lg flex items-center gap-3 animate-pulse">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-bold">Profile updated successfully!</span>
              </div>
            )}

            {/* Header */}
            <section>
              <h1 className="text-4xl font-black font-headline text-primary mb-2">
                Settings
              </h1>
              <p className="text-on-surface-variant">
                Manage your profile, preferences, and account settings
              </p>
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Picture Section */}
              <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
                <h2 className="text-2xl font-bold font-headline text-primary mb-6">
                  Profile Picture
                </h2>
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-secondary-container overflow-hidden border-4 border-primary">
                      <img
                        className="w-full h-full object-cover"
                        alt="Profile"
                        src={
                          avatarPreview ||
                          user?.avatar ||
                          "https://lh3.googleusercontent.com/aida-public/AB6AXuCwzdLzhgfbRAv0YApN6BoNYYimK3_m4nkZQb2DUw2s3Oq6CML8CWYLcaZEuPXyPQl7J6-1Us7xkAikMjv1l7Q5dcXmVCUDY3NsG3oZfDsvQaNKJI2ikNrQfpXZR57oOn98O7yo-luOBPObVtzJJpo2efDQvOI5qJ0mL0cBi_p-QQUu6U4hXGKdSRM4vKtac9vly4q_fRMlyM3VfoaIPnq_oFLCUH6mUizuAd6acACghsrK2j6C7FIM04tm0fOrO0paYtwqF8C1Mw"
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-container transition-all shadow-lg"
                    >
                      <span className="material-symbols-outlined">
                        photo_camera
                      </span>
                    </button>
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-on-surface-variant mb-4">
                      Click the camera icon to upload a new profile picture.
                      Supported formats: JPG, PNG (Max 5MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
                <h2 className="text-2xl font-bold font-headline text-primary mb-6">
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-surface border-2 border-outline-variant/20 rounded-lg p-4 text-on-surface focus:border-primary focus:outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="flex-grow bg-surface border-2 border-outline-variant/20 rounded-lg p-4 text-on-surface focus:border-primary focus:outline-none transition-colors"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-surface border-2 border-outline-variant/20 rounded-lg p-4 text-on-surface focus:border-primary focus:outline-none transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                      Area / Village
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleInputChange}
                      className="w-full bg-surface border-2 border-outline-variant/20 rounded-lg p-4 text-on-surface focus:border-primary focus:outline-none transition-colors"
                      placeholder="e.g. Mandya District"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
                <h2 className="text-2xl font-bold font-headline text-primary mb-6">
                  Preferences
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                      Preferred Language
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full bg-surface border-2 border-outline-variant/20 rounded-lg p-4 text-on-surface focus:border-primary focus:outline-none transition-colors"
                    >
                      <option value="en">English</option>
                      <option value="ta">தமிழ்</option>
                      <option value="kn">ಕನ್ನಡ</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded accent-primary"
                      />
                      <span className="text-on-surface font-medium">
                        Receive disease alerts
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded accent-primary"
                      />
                      <span className="text-on-surface font-medium">
                        Enable voice notifications
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded accent-primary"
                      />
                      <span className="text-on-surface font-medium">
                        Receive weekly crop health report
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
                <h2 className="text-2xl font-bold font-headline text-primary mb-6">
                  Account & Security
                </h2>
                <div className="space-y-4">
                  <button
                    type="button"
                    className="w-full py-4 px-6 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined">lock</span>
                      Change Password
                    </span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full py-4 px-6 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined">
                        verified_user
                      </span>
                      Two-Factor Authentication
                    </span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-grow py-4 px-6 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="py-4 px-6 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-container-highest transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
