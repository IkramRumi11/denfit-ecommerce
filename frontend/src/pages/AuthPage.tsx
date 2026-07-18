// src/pages/AuthPage.tsx
import React, { useEffect, useState, FormEvent, ChangeEvent, useRef } from "react";
import useResendCooldown from "../hooks/useResendCooldown";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import TermsModal from "../components/TermsModal";
import PrivacyModal from "../components/PrivacyModal";

// ------------------ Utility Helpers ------------------
const modes = ["login", "signup", "forgot", "reset", "verify"] as const;
type Mode = (typeof modes)[number];

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => !phone || /^\+?\d{0,13}$/.test(phone);

type AuthResponse = {
  success: boolean;
  token: string;
  data: {
    user: any;
  };
  message?: string;
};

// ------------------ Component ------------------
const AuthPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agree, setAgree] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  
  // Guard to prevent multiple verification calls on mount
  const hasAttemptedVerify = useRef(false);

  // use hook for cooldown state and persistence
  const { remaining: resendCooldown, start: startResendCooldown } = useResendCooldown(formData.email);

  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user, isAuthenticated, setUser, setIsAuthenticated, login: authLogin, register: authRegister } = useAuth();
  const from = (location.state as any)?.from?.pathname || "/";

  // Terms & Privacy modal state
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Close modals on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTerms(false);
        setShowPrivacy(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ------------------ URL Mode + Token ------------------
  useEffect(() => {
    const urlMode = (searchParams.get("mode") as Mode) || null;
    const urlToken = searchParams.get("token") || null;

    if (urlMode && modes.includes(urlMode)) {
      setMode(urlMode);
      if (urlMode === "reset" && urlToken) setToken(urlToken);
      if (urlMode === "verify" && urlToken && !hasAttemptedVerify.current) {
        hasAttemptedVerify.current = true;
        setToken(urlToken);
        handleVerifyEmail(urlToken);
      }
    }
  }, [searchParams]);

  // ------------------ Redirect if Authenticated ------------------
  useEffect(() => {
    if (isAuthenticated && user) navigate(from, { replace: true });
  }, [isAuthenticated, user, navigate, from]);

  // ------------------ Password Strength ------------------
  useEffect(() => {
    setPasswordStrength(getPasswordStrength(formData.password));
  }, [formData.password]);

  // ------------------ Check Email Existence ------------------
  useEffect(() => {
    // BUG FIX: Only check email if it follows valid email format
    if (!formData.email || mode !== "signup" || !validateEmail(formData.email)) return;
    
    let active = true;
    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await api.auth.checkEmail(formData.email);
        if (!active) return;
        const exists = (res && (res as any).exists) ?? (res?.data && (res.data as any).exists) ?? false;
        if (exists) {
          setErrors((prev) => ({ ...prev, email: "This email already exists" }));
        } else {
          setErrors((prev) => ({ ...prev, email: "" }));
        }
      } catch (err) {
        if (!active) return;
        setErrors((prev) => ({ ...prev, email: "" }));
      } finally {
        if (active) setCheckingEmail(false);
      }
    }, 700);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.email, mode]);

  // ------------------ Email Verification ------------------
  const handleVerifyEmail = async (verifyToken: string) => {
    try {
      setIsLoading(true);
      setVerificationMessage("Verifying your email, please wait...");
      const res: any = await api.auth.verifyEmail(verifyToken);
      if (res?.data?.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
        showToast("Email verified and logged in — welcome!", "success");
        setVerificationMessage("Email verified successfully! Redirecting...");
        return;
      }
      showToast("Email verified! Please log in.", "success");
      setMode("login");
      setSearchParams({ mode: "login" });
    } catch (err: any) {
      showToast(err?.message || "Error verifying email.", "error");
      setVerificationMessage(err?.message || "Error verifying email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email?: string) => {
    const targetEmail = email || formData.email;
    if (!targetEmail || !validateEmail(targetEmail)) {
      showToast('Please provide a valid email to resend verification', 'error');
      return;
    }
    if (resendCooldown > 0) return; 
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res: any = await api.auth.resendVerification(targetEmail);
      setResendMessage(res?.message || 'Verification email sent');
      showToast(res?.message || 'Verification email sent', 'success');
      const secs = Number(res?.retryAfter || 60);
      startResendCooldown(secs, targetEmail);
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend verification';
      setResendMessage(msg);
      showToast(msg, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  // ------------------ Validation ------------------
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (mode === "forgot") {
      if (!formData.email) newErrors.email = "Email is required";
      else if (!validateEmail(formData.email)) newErrors.email = "Invalid email";
    } else if (mode === "reset") {
      if (!formData.password) newErrors.password = "New password is required";
      else if (formData.password.length < 8)
        newErrors.password = "Password must be at least 8 characters";
      // BUG FIX: Added password confirmation for reset mode
      if (formData.confirmPassword !== formData.password)
        newErrors.confirmPassword = "Passwords do not match";
    } else {
      if (!formData.email) newErrors.email = "Email is required";
      else if (!validateEmail(formData.email)) newErrors.email = "Invalid email";
      if (!formData.password) newErrors.password = "Password is required";
      else if (formData.password.length < 8)
        newErrors.password = "Password must be at least 8 characters";
    }

    if (mode === "signup") {
      if (!formData.name || formData.name.length < 2)
        newErrors.name = "Name must be at least 2 characters";
      if (!validatePhone(formData.phone)) newErrors.phone = "Invalid phone number";
      if (formData.confirmPassword !== formData.password)
        newErrors.confirmPassword = "Passwords do not match";
      if (!agree)
        newErrors.agree = "Please agree to Terms and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ------------------ Handlers ------------------
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone" && !/^\+?\d*$/.test(value)) return;
    if (name === "phone" && value.length > 13) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
    setFormData({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
    setErrors({});
    setVerificationMessage(null);
    setAgree(false);
    setToken(null);
  };

  // ------------------ Submit ------------------
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (mode === "login") {
        const res: any = await authLogin(formData.email, formData.password);
        if (res && res.emailVerified === false) {
          showToast(res.message || 'Please verify your email before logging in', 'warning');
          setMode('login');
          return;
        }
        // Redirection is now handled by useEffect [isAuthenticated]
      } else if (mode === "signup") {
        const res: any = await authRegister({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        });

        if (res?.data?.user) {
          showToast("Account created and logged in!", "success");
          return;
        }

        if (res?.verificationSent === false) {
          showToast('Account created but verification email failed to send.', 'error');
        } else {
          showToast("Account created! Please verify your email.", "success");
        }
        switchMode("login");
      } else if (mode === "forgot") {
        const res = await api.auth.forgotPassword(formData.email);
        const forgotRes = res as AuthResponse | null | undefined;
        if (!forgotRes || forgotRes.success) {
          showToast("Password reset link sent!", "success");
          switchMode("login");
        } else showToast(forgotRes?.message || "Failed to send reset link", "error");
      } else if (mode === "reset" && token) {
        const res = await api.auth.resetPassword(token, formData.password);
        if (res?.success) {
          showToast("Password reset successful!", "success");
          switchMode("login");
        } else showToast(res?.message || "Reset failed", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Something went wrong", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ Password Strength ------------------
  const StrengthMeter = () => (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-full transition-all duration-300 ${
              i < passwordStrength ? "bg-green-500" : "bg-gray-300"
            }`}
            style={{ width: "20%" }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {["", "Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength]}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-gray-100 px-4 py-10">
      <motion.div
        className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 space-y-6 border border-gray-100"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center space-y-2">
          <Link to="/">
            <img src="https://i.ibb.co/GQG243Rb/DENFiT.jpg" alt="DENFiT" className="w-24 mx-auto rounded-xl" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-800">Welcome to DENFiT</h2>
          <p className="text-gray-500 text-sm">Elevate Your Style with Confidence 👕</p>
        </div>

        {mode !== "verify" && (
          <div className="flex border-b border-gray-200">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m as Mode)}
                className={`flex-1 py-3 text-center font-semibold ${
                  mode === m
                    ? "border-b-2 border-black text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                {m === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {mode === "verify" ? (
          <div className="text-center py-10">
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-500" />
            ) : (
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            )}
            <p className="text-gray-700">{verificationMessage}</p>
            <div className="mt-4 space-y-3">
              <Link to="/" className="block text-blue-600 font-semibold hover:underline">
                Go to Homepage
              </Link>
              <div className="text-center">
                <button
                  type="button"
                  disabled={resendLoading || resendCooldown > 0}
                  onClick={() => handleResendVerification()}
                  className="text-sm text-gray-600 hover:underline disabled:opacity-50"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend verification email'}
                </button>
                {resendMessage && <p className="text-xs text-gray-500 mt-2">{resendMessage}</p>}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            {mode === "signup" && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black ${
                        errors.name ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+923001234567"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black ${
                        errors.phone ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black ${
                    errors.email ? "border-red-500" : ""
                  }`}
                />
                {checkingEmail && mode === "signup" && (
                  <Loader2 className="absolute right-3 top-3 animate-spin w-4 h-4 text-gray-400" />
                )}
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {mode !== "forgot" && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  {mode === "reset" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-black ${
                      errors.password ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === "signup" && <StrengthMeter />}
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
            )}

            {(mode === "signup" || mode === "reset") && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {mode === "signup" && (
              <div className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={() => setAgree(!agree)}
                  className="mt-1"
                />
                <p className="text-gray-600">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="font-semibold text-black hover:underline"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    className="font-semibold text-black hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </p>
              </div>
            )}

            {mode === "login" && (
              <div className="space-y-2">
                <div className="text-right text-sm">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="text-right text-sm mt-2">
                  <button
                    type="button"
                    disabled={resendLoading || resendCooldown > 0}
                    onClick={() => handleResendVerification()}
                    className="text-gray-600 hover:underline disabled:opacity-50"
                  >
                    {resendLoading
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : (
                <>
                  {mode === "login"
                    ? "Login"
                    : mode === "signup"
                    ? "Create Account"
                    : mode === "forgot"
                    ? "Send Reset Link"
                    : "Reset Password"}
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              {mode === "login" && (
                <>
                  Don’t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-black hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-black hover:underline"
                  >
                    Login
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <>
                  Remembered your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-black hover:underline"
                  >
                    Back to Login
                  </button>
                </>
              )}
              {mode === "reset" && (
                <>
                  Back to{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-black hover:underline"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </motion.div>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #b0b0b0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #888; }
      `}</style>
    </div>
  );
};

export default AuthPage;