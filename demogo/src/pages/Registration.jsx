import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";

const Registration = ({ onRegister, setUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    language: "en",
    role: "farmer",
    fullName: "",
    phoneNumber: "",
    area: "",
    password: "",
    confirmPassword: "",
  });

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "தமிழ்" },
    { code: "kn", name: "ಕನ್ನಡ" },
  ];

  const handleLanguageSelect = (lang) => {
    setFormData({ ...formData, language: lang });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role: role === "official" ? "municipality_official" : "farmer" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(""); // Clear error on input change
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!formData.phoneNumber.trim() || formData.phoneNumber.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return false;
    }
    if (!formData.area.trim()) {
      setError("Area/Village is required");
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await registerUser({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        area: formData.area,
        role: formData.role,
        password: formData.password,
      });

      if (response.success) {
        // Store user data
        if (setUser) {
          setUser(response.user);
        }
        // Call onRegister callback if provided
        if (onRegister) {
          onRegister(formData);
        }
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen">
      {/* Left: Branding & Visual Anchor */}
      <section className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-end p-20">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <img
            className="w-full h-full object-cover"
            alt="cinematic close-up of healthy green plant leaves with morning dew in a sunlit organic farm setting"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCon3CU17rhH3bGmrLizuezhp3x2J32ZMI6KhY4KXyPAwttFKOTdcXeZCQiBaxQiK4p_MKK7LEdnlPOfQm8blCIrbCNgWe-FJ9ETEYjv23MyL3jpwcWj-WK9AiBBB3_qgpdysIPnGeeMZR4CqJKBojLmWxy3hmc8d7qM8RcHv76ocdrH8_htLf1oWgzX8KbjOfWfsgF-8-k2xoKdMNuoBYna7Mft66utvBEcbNcyZFyBWcP2OKqkiFBDWwJujEC6ZV2KFZZLKpmIg"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent"></div>
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 w-16 h-1 bg-primary-fixed"></div>
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Empowering the Earth through Artificial Intelligence.
          </h1>
          <p className="text-primary-fixed-dim text-xl leading-relaxed opacity-90">
            Join a network of modern agronomists and officials dedicated to
            sustainable crop health and regional prosperity.
          </p>
        </div>
      </section>

      {/* Right: Onboarding Journey */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-20 md:px-20 bg-surface">
        <div className="w-full max-w-md">
          {/* Progress Header */}
          <div className="mb-12">
            <p className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-2">
              Step 01 / Registration
            </p>
            <h2 className="text-3xl font-extrabold text-primary tracking-tight">
              Create your account
            </h2>
          </div>

          {/* Language Selection */}
          <div className="mb-10">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Select Language
            </label>
            <div className="grid grid-cols-3 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`py-4 rounded-xl font-semibold transition-all active:scale-95 ${
                    formData.language === lang.code
                      ? "bg-primary text-white shadow-lg shadow-primary/10"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Role Selection */}
          <div className="mb-10">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Select Your Role
            </label>
            <div className="space-y-4">
              {/* Farmer Role */}
              <button
                onClick={() => handleRoleSelect("farmer")}
                className={`w-full p-5 bg-surface-container-lowest border-2 transition-all hover:bg-surface-container-low rounded-2xl text-left ${
                  formData.role === "farmer"
                    ? "border-primary bg-primary-fixed/10"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-container text-white">
                    <span className="material-symbols-outlined">
                      potted_plant
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-primary mb-1">Farmer</h4>
                    <p className="text-sm text-on-surface-variant leading-snug">
                      Monitor crop health, detect diseases early, and access
                      catalogs.
                    </p>
                  </div>
                  {formData.role === "farmer" && (
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </button>

              {/* Official Role */}
              <button
                onClick={() => handleRoleSelect("official")}
                className={`w-full p-5 bg-surface-container-lowest border-2 transition-all hover:bg-surface-container-low rounded-2xl text-left ${
                  formData.role === "municipality_official"
                    ? "border-primary bg-primary-fixed/10"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined">policy</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-primary mb-1">
                      Municipality Official
                    </h4>
                    <p className="text-sm text-on-surface-variant leading-snug">
                      Access regional disease maps, track outbreaks, and manage
                      alerts.
                    </p>
                  </div>
                  {formData.role === "municipality_official" && (
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-container/20 border border-error rounded-xl">
              <p className="text-error text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 px-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                disabled={isLoading}
                className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 px-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="9876543210"
                    disabled={isLoading}
                    maxLength="10"
                    className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-14 pr-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 px-1">
                  Area / Village
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="e.g. Mandya District"
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 px-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min 6 characters"
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 px-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-bold text-lg hover:bg-primary-container shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Start Journey
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-sm text-on-surface-variant">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Background Decorative Elements */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-fixed/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-secondary-fixed/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
    </main>
  );
};

export default Registration;
