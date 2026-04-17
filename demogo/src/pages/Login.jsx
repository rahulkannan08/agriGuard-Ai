import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
    rememberMe: false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setError("");
  };

  const validateForm = () => {
    if (!formData.phoneNumber.trim() || formData.phoneNumber.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
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
      const response = await loginUser(formData.phoneNumber, formData.password);

      if (response.success) {
        if (setUser) {
          setUser(response.user);
        }
        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", "true");
        }
        navigate("/dashboard");
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed. Please try again.");
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
            Welcome Back to AgriGuard.
          </h1>
          <p className="text-primary-fixed-dim text-xl leading-relaxed opacity-90">
            Monitor your crops and keep your community safe with our AI-powered
            disease detection system.
          </p>
        </div>
      </section>

      {/* Right: Login Form */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-20 md:px-20 bg-surface">
        <div className="w-full max-w-md">
          {/* Progress Header */}
          <div className="mb-12">
            <p className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-2">
              Authentication
            </p>
            <h2 className="text-3xl font-extrabold text-primary tracking-tight">
              Sign in to your account
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-container/20 border border-error rounded-xl">
              <p className="text-error text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm text-on-surface-variant">Remember me</span>
              </label>
              <a
                href="#"
                className="text-sm text-primary font-semibold hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-bold text-lg hover:bg-primary-container shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-sm text-on-surface-variant">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Create one
                </button>
              </p>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-12 p-4 bg-tertiary-fixed/10 border border-tertiary-fixed/20 rounded-xl">
            <p className="text-[10px] font-bold text-on-tertiary-fixed-variant uppercase tracking-widest mb-2">
              Demo Credentials
            </p>
            <p className="text-xs text-on-surface-variant mb-1">
              <span className="font-semibold">Phone:</span> 9876543210
            </p>
            <p className="text-xs text-on-surface-variant">
              <span className="font-semibold">Password:</span> test123
            </p>
          </div>
        </div>
      </section>

      {/* Background Decorative Elements */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-fixed/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-secondary-fixed/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
    </main>
  );
};

export default Login;
