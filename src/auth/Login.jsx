import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const strengthScore = (pwd = "") => {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score; // 0..4
};

const StrengthMeter = ({ password }) => {
  const score = strengthScore(password);
  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

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

export default function Login() {
  const { signInWithGoogle, signInWithEmail, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [remember, setRemember] = useState(true);

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingOauth, setLoadingOauth] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const googleInitialized = useRef(false);

  const nextPath = useMemo(() => decodeURIComponent(params.get("next") || "/Home"), [params]);

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

  useEffect(() => {
    if (isAuthenticated) navigate(nextPath, { replace: true });
  }, [isAuthenticated, navigate, nextPath]);

  // Google Sign-In button + One Tap
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    if (googleInitialized.current) return;

    const tryInit = () => {
      if (!window.google?.accounts?.id) return false;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setError("");
          setLoadingOauth(true);

          const payload = parseJwt(response.credential);
          if (!payload?.email) {
            setError("Google login did not return a valid email.");
            setLoadingOauth(false);
            return;
          }

          try {
            await signInWithGoogle({
              name: payload.name,
              email: payload.email,
              picture: payload.picture,
            });

            // Success micro-animation before redirect
            setSuccess(true);
            setTimeout(() => navigate(nextPath, { replace: true }), 450);
          } catch (e) {
            setError(e?.message || "Unable to sign in using Google.");
          } finally {
            setLoadingOauth(false);
          }
        },
      });

      const node = document.getElementById("google-signin-btn");
      if (node) {
        node.innerHTML = "";
        window.google.accounts.id.renderButton(node, {
          theme: "outline",
          size: "large",
          width: 360,
        });
      }

      // Google One Tap prompt (best-effort)
      try {
        window.google.accounts.id.prompt();
      } catch {}

      googleInitialized.current = true;
      return true;
    };

    // Initialize immediately if SDK already loaded; otherwise retry briefly.
    if (tryInit()) return;

    const t = setInterval(() => {
      if (tryInit()) clearInterval(t);
    }, 200);

    setTimeout(() => clearInterval(t), 5000);

    return () => clearInterval(t);
  }, [navigate, nextPath, signInWithGoogle]);

  const onEmailSignIn = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoadingEmail(true);

    try {
      await signInWithEmail({ email, password, remember });

      setSuccess(true);
      setTimeout(() => navigate(nextPath, { replace: true }), 450);
    } catch (err) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setLoadingEmail(false);
    }
  };

  // Visible but disabled (your backend currently doesn't implement these providers)
  const oauthDisabledMessage = "Not configured in this build yet.";

  return (
    <div className="min-h-screen bg-[#f3f5f9] grid md:grid-cols-2">
      {/* Left panel */}
      <div className="hidden md:flex bg-gradient-to-b from-[#13264f] to-[#233f7e] text-white p-12 items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow">
            <Sprout className="text-[#1f4d9b]" />
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Welcome back.
            <br />
            Your farm management awaits.
          </h1>
          <p className="text-lg text-blue-100">
            Sign in to discover updates, connect with communities, and never miss what matters.
          </p>
        </div>
      </div>

      {/* Right panel */}
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

          {/* Unified Social buttons */}
          <div className="space-y-3">
            <div className="relative">
              {loadingOauth && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-600">Signing in...</span>
                </div>
              )}
              <div id="google-signin-btn" className="flex justify-center" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl justify-center"
              disabled
              title={oauthDisabledMessage}
            >
              Continue with Microsoft
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl justify-center"
              disabled
              title={oauthDisabledMessage}
            >
              Continue with Facebook
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            OR
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email login */}
          <form onSubmit={onEmailSignIn} className="space-y-4">
            <FloatingField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />

            <div>
              <FloatingField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
              />
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
    </div>
  );
}
