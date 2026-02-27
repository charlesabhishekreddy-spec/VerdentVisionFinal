import { useState } from "react";
import { Link } from "react-router-dom";
import { Sprout, Mail, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await requestPasswordReset({ email });
      setResult(response);
    } catch (forgotError) {
      setError(forgotError?.message || "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent grid md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-gradient-to-b from-[#2e1065] via-[#4c1d95] to-[#312e81] p-12 text-white">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow">
            <Sprout className="text-[#1f4d9b]" />
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Recover access.
            <br />
            Stay secure.
          </h1>
          <p className="text-lg text-violet-100">
            Password reset tokens are short-lived and protected by audit logs and session revocation.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-3xl border border-white/75 bg-white/75 p-10 shadow-[0_20px_45px_rgba(109,40,217,0.18)] backdrop-blur-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Forgot Password</h2>
            <p className="text-slate-500 text-sm">Request a secure reset link</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            For security, we return a generic response even if an email does not exist.
          </div>

          {result ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                {result.message}
              </div>
              {result.debug_reset_url ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 space-y-2">
                  <p className="font-medium">Local mode reset link</p>
                  <code className="block break-all text-xs text-sky-800">{result.debug_reset_url}</code>
                  <Link className="text-sky-700 font-semibold hover:text-sky-900" to={result.debug_reset_url}>
                    Continue to reset password
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-xl pl-10"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-semibold shadow-[0_8px_22px_rgba(124,58,237,0.32)] hover:brightness-110"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>

              {error ? <p className="text-sm text-red-600 text-center">{error}</p> : null}
            </form>
          )}

          <p className="text-sm text-slate-500 text-center">
            <Link className="font-semibold text-violet-600 hover:text-violet-700" to="/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
