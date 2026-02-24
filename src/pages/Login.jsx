import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

/* ---------------- JWT PARSER ---------------- */
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export default function Login() {
  const { signInWithGoogle, signInWithEmail, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const googleInitialized = useRef(false);

  /* ---------------- REDIRECT IF LOGGED ---------------- */
  useEffect(() => {
    if (isAuthenticated) navigate("/Home");
  }, [isAuthenticated, navigate]);

  /* ---------------- GOOGLE AUTH INIT (RUN ONCE) ---------------- */
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || googleInitialized.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setError("");
          setGoogleLoading(true);

          const payload = parseJwt(response.credential);

          if (!payload?.email) {
            setError("Google login failed.");
            setGoogleLoading(false);
            return;
          }

          try {
            await signInWithGoogle({
              name: payload.name,
              email: payload.email,
              picture: payload.picture,
            });

            navigate(
              decodeURIComponent(params.get("next") || "/Home")
            );
          } catch {
            setError("Unable to sign in using Google.");
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      const node = document.getElementById("google-signin-btn");

      if (node && node.childElementCount === 0) {
        window.google.accounts.id.renderButton(node, {
          theme: "outline",
          size: "large",
          width: 360,
        });
      }

      googleInitialized.current = true;
    };

    initGoogle();
  }, [navigate, params, signInWithGoogle]);

  /* ---------------- EMAIL LOGIN ---------------- */
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmail({ email, password });

      navigate(decodeURIComponent(params.get("next") || "/Home"));
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  /* ======================= UI ======================= */

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#f3f5f9]">
      
      {/* -------- LEFT PANEL -------- */}
      <div className="hidden md:flex bg-gradient-to-b from-[#13264f] to-[#233f7e] text-white items-center justify-center p-12">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow">
            <Sprout className="text-[#1f4d9b]" />
          </div>

          {/* SAME CONTENT AS FIRST IMAGE */}
          <h1 className="text-5xl font-bold leading-tight">
            Welcome back.
            <br />
            Your farm management awaits.
          </h1>

          <p className="text-lg text-blue-100">
            Sign in to discover updates, connect with communities,
            and never miss what matters.
          </p>
        </div>
      </div>

      {/* -------- RIGHT PANEL -------- */}
      <div className="flex items-center justify-center p-8">
        <div
          className="
          w-full max-w-md
          bg-white
          rounded-2xl
          border border-slate-200
          p-10
          shadow-[0_10px_30px_rgba(0,0,0,0.06)]
          space-y-6
        "
        >
          {/* HEADER */}
          <div className="space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight">
              Welcome to Verdant Vision
            </h2>
            <p className="text-slate-500 text-sm">
              Sign in to continue
            </p>
          </div>

          {/* GOOGLE LOGIN */}
          <div className="flex justify-center relative">
            {googleLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                <span className="text-sm text-slate-600">
                  Signing in...
                </span>
              </div>
            )}
            <div id="google-signin-btn" />
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            OR
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* EMAIL LOGIN */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              className="
                w-full
                bg-[#0f172a]
                hover:bg-black
                text-white
                transition-all
              "
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            {error && (
              <p className="text-sm text-red-600 text-center">
                {error}
              </p>
            )}
          </form>

          {/* FOOTER */}
          <div className="flex justify-between text-sm text-slate-500">
            <Link
              to="/forgot-password"
              className="hover:text-slate-900 transition"
            >
              Forgot password?
            </Link>

            <Link
              to="/signup"
              className="font-medium text-sky-600 hover:text-sky-700"
            >
              Need an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}