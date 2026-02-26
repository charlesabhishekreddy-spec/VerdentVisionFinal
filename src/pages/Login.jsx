import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft, FaFacebook } from "react-icons/fa";

import { loginWithGoogle, loginWithMicrosoft, loginWithFacebook } from "@/auth/oauthService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAST_PROVIDER_KEY = "vv_last_provider";

const strengthScore = (pwd = "") => {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
};

const StrengthMeter = ({ password }) => {
  const score = strengthScore(password);
  const label = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const width = `${Math.min(100, (score / 4) * 100)}%`;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Password strength</span>
        <span className="font-medium">{password ? label : ""}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Use 8+ characters with a mix of letters, numbers, and symbols.
      </p>
    </div>
  );
};

const FloatingField = ({ label, type = "text", value, onChange, error }) => {
  const active = Boolean(value);
  return (
    <div className="relative">
      <Input
        type={type}
        value={value}
        onChange={onChange}
        className={`h-12 rounded-xl pt-5 ${error ? "border-red-400 focus-visible:ring-red-200" : ""}`}
      />
      <label
        className={`absolute left-3 transition-all pointer-events-none
          ${active ? "top-1 text-xs text-slate-600" : "top-3 text-sm text-slate-400"}
        `}
      >
        {label}
      </label>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

function ProviderButton({ icon, label, onClick, disabled, isPrimary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full h-11 rounded-xl border",
        "flex items-center justify-center gap-3",
        "transition-all duration-150",
        "active:scale-[0.985]",
        "hover:bg-slate-50",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        isPrimary ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <span className="flex items-center justify-center w-5">{icon}</span>
      <span className="font-medium text-slate-900">{label}</span>
    </button>
  );
}

function AccountChooserModal({ open, onClose, providers, lastProvider, onSelect }) {
  if (!open) return null;

  const rows = [
    providers.google && { key: "google", label: "Continue with Google", icon: <FcGoogle size={20} /> },
    providers.microsoft && { key: "microsoft", label: "Continue with Microsoft", icon: <FaMicrosoft size={18} className="text-[#5E5E5E]" /> },
    providers.facebook && { key: "facebook", label: "Continue with Facebook", icon: <FaFacebook size={18} className="text-[#1877F2]" /> },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Choose an account</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a sign-in method for Verdant Vision.</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-slate-100 transition" onClick={onClose} aria-label="Close" type="button">
              <X size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {rows.map((r) => (
              <ProviderButton
                key={r.key}
                icon={r.icon}
                label={r.label}
                onClick={() => onSelect(r.key)}
                disabled={false}
                isPrimary={r.key === lastProvider}
              />
            ))}

            <div className="pt-2">
              <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { signInWithEmail, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingOauth, setLoadingOauth] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [chooserOpen, setChooserOpen] = useState(false);

  const providers = useMemo(
    () => ({
      google: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
      microsoft: Boolean(import.meta.env.VITE_ENTRA_CLIENT_ID),
      facebook: Boolean(import.meta.env.VITE_FACEBOOK_APP_ID),
    }),
    []
  );

  const [lastProvider, setLastProvider] = useState(() => {
    try {
      return localStorage.getItem(LAST_PROVIDER_KEY) || "";
    } catch {
      return "";
    }
  });

  const nextPath = useMemo(() => decodeURIComponent(params.get("next") || "/"), [params]);

  useEffect(() => {
    if (isAuthenticated) navigate(nextPath, { replace: true });
  }, [isAuthenticated, navigate, nextPath]);

  const setProviderMemory = (p) => {
    setLastProvider(p);
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, p);
    } catch {}
  };

  const redirectWithSuccess = () => {
    setSuccess(true);
    setTimeout(() => navigate(nextPath, { replace: true }), 450);
  };

  const providerOrder = ["google", "microsoft", "facebook"];
  const availableProviderKeys = providerOrder.filter((k) => providers[k]);
  const primaryProvider = availableProviderKeys.includes(lastProvider) ? lastProvider : (availableProviderKeys[0] || "");

  const onGoogle = async () => {
    setError("");
    setLoadingOauth(true);
    try {
      await loginWithGoogle();
      setProviderMemory("google");
      redirectWithSuccess();
    } catch (e) {
      setError(e?.message || "Google sign-in failed.");
    } finally {
      setLoadingOauth(false);
    }
  };

  const onMicrosoft = async () => {
    setError("");
    setLoadingOauth(true);
    try {
      await loginWithMicrosoft();
      setProviderMemory("microsoft");
      redirectWithSuccess();
    } catch (e) {
      setError(e?.message || "Microsoft sign-in failed.");
    } finally {
      setLoadingOauth(false);
    }
  };

  const onFacebook = async () => {
    setError("");
    setLoadingOauth(true);
    try {
      await loginWithFacebook();
      setProviderMemory("facebook");
      redirectWithSuccess();
    } catch (e) {
      setError(e?.message || "Facebook sign-in failed.");
    } finally {
      setLoadingOauth(false);
    }
  };

  const primaryHandler =
    primaryProvider === "google"
      ? onGoogle
      : primaryProvider === "microsoft"
      ? onMicrosoft
      : primaryProvider === "facebook"
      ? onFacebook
      : null;

  const primaryIcon =
    primaryProvider === "google" ? (
      <FcGoogle size={20} />
    ) : primaryProvider === "microsoft" ? (
      <FaMicrosoft size={18} className="text-[#5E5E5E]" />
    ) : primaryProvider === "facebook" ? (
      <FaFacebook size={18} className="text-[#1877F2]" />
    ) : null;

  const primaryLabel =
    primaryProvider === "google"
      ? "Continue with Google"
      : primaryProvider === "microsoft"
      ? "Continue with Microsoft"
      : primaryProvider === "facebook"
      ? "Continue with Facebook"
      : "Choose a sign-in method";

  const emailError = useMemo(() => {
    if (!email) return "";
    return emailRegex.test(email) ? "" : "Enter a valid email address.";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "";
    return password.length >= 8 ? "" : "Password must be at least 8 characters.";
  }, [password]);

  const canSubmit = useMemo(() => {
    return emailRegex.test(email) && password.length >= 8 && !loadingEmail && !loadingOauth;
  }, [email, password, loadingEmail, loadingOauth]);

  const onEmailSignIn = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoadingEmail(true);
    try {
      await signInWithEmail({ email, password, remember });
      setProviderMemory("email");
      redirectWithSuccess();
    } catch (err) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-to-b from-[#13264f] to-[#233f7e] text-white p-12 items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow">
            <Sprout className="text-[#1f4d9b]" />
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Welcome back.
            <br />
            Your farm awaits.
          </h1>
          <p className="text-lg text-blue-100">
            Sign in to discover updates, connect with communities, and never miss what matters.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div
          className={`w-full max-w-md bg-white rounded-3xl border border-slate-200/70 p-10 shadow-[0_20px_45px_rgba(0,0,0,0.08)] space-y-6 transition-all
            ${success ? "scale-[0.99] opacity-90" : ""}
          `}
        >
          <div className="space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome to Verdant Vision</h2>
            <p className="text-slate-500 text-sm">Sign in to continue</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              {loadingOauth && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-600">Signing in...</span>
                </div>
              )}

              <ProviderButton
                icon={primaryIcon}
                label={primaryLabel}
                onClick={() => (primaryHandler ? primaryHandler() : setChooserOpen(true))}
                disabled={loadingOauth || !primaryProvider}
                isPrimary
              />

              {availableProviderKeys.length > 1 && (
                <button
                  type="button"
                  className="mt-2 w-full text-sm text-slate-500 hover:text-slate-900 transition"
                  onClick={() => setChooserOpen(true)}
                  disabled={loadingOauth}
                >
                  Use another account or method
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            OR
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={onEmailSignIn} className="space-y-4">
            <FloatingField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />

            <div>
              <FloatingField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
              <StrengthMeter password={password} />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={remember}
                  onChange={() => setRemember((v) => !v)}
                />
                Remember me
              </label>

              <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-slate-900 transition">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 rounded-xl bg-[#0b1736] hover:bg-[#08122b] text-white font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-60"
            >
              {loadingEmail ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/70 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </form>

          <p className="text-sm text-slate-500 text-center">
            New?{" "}
            <Link className="text-sky-600 font-semibold hover:text-sky-700" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <AccountChooserModal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        providers={providers}
        lastProvider={primaryProvider}
        onSelect={(key) => {
          setChooserOpen(false);
          if (key === "google") onGoogle();
          if (key === "microsoft") onMicrosoft();
          if (key === "facebook") onFacebook();
        }}
      />
    </div>
  );
}