import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sprout, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

export default function ResetPassword() {
  const { validateResetToken, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token") || "";
  const [tokenState, setTokenState] = useState({ loading: true, valid: false, email_hint: "" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!token) {
        setTokenState({ loading: false, valid: false, email_hint: "" });
        return;
      }

      try {
        const result = await validateResetToken(token);
        if (!active) return;
        setTokenState({ loading: false, valid: Boolean(result?.valid), email_hint: result?.email_hint || "" });
      } catch {
        if (!active) return;
        setTokenState({ loading: false, valid: false, email_hint: "" });
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [token, validateResetToken]);

  const confirmError = confirmPassword && confirmPassword !== password ? "Passwords do not match." : "";
  const canSubmit = tokenState.valid && password.length >= 12 && confirmPassword === password && !loading;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    try {
      await resetPassword({ token, newPassword: password });
      navigate("/login?reset=success", { replace: true });
    } catch (resetError) {
      setError(resetError?.message || "Password reset failed.");
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
            Reset password.
            <br />
            Re-secure your account.
          </h1>
          <p className="text-lg text-violet-100">
            Reset links expire quickly and invalidate old sessions after successful password updates.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-3xl border border-white/75 bg-white/75 p-10 shadow-[0_20px_45px_rgba(109,40,217,0.18)] backdrop-blur-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Reset Password</h2>
            <p className="text-slate-500 text-sm">
              {tokenState.email_hint ? `Updating account for ${tokenState.email_hint}` : "Create a new secure password"}
            </p>
          </div>

          {tokenState.loading ? (
            <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Verifying reset token...
            </div>
          ) : !tokenState.valid ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                This reset link is invalid or expired.
              </div>
              <Link className="font-semibold text-violet-600 hover:text-violet-700" to="/forgot-password">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Use a strong password with 12+ characters and mixed character types.
              </div>

              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="New password"
                className="h-12 rounded-xl"
                required
              />

              <div>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className={`h-12 rounded-xl ${confirmError ? "border-red-400 focus-visible:ring-red-200" : ""}`}
                  required
                />
                {confirmError ? <p className="mt-1 text-xs text-red-600">{confirmError}</p> : null}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-semibold shadow-[0_8px_22px_rgba(124,58,237,0.32)] hover:brightness-110"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating password...
                  </span>
                ) : (
                  "Update password"
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
