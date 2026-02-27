import { useState } from "react";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

export default function PasswordSecurityCard() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const confirmError = confirmPassword && confirmPassword !== newPassword ? "Passwords do not match." : "";
  const canSubmit = currentPassword && newPassword.length >= 12 && confirmPassword === newPassword && !loading;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated. Other active sessions were signed out.");
    } catch (changeError) {
      setError(changeError?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/75 bg-white/65 p-6 space-y-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(124,58,237,0.12)]">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-violet-600" />
        <h3 className="text-lg font-semibold text-slate-900">Password Security</h3>
      </div>

      <p className="text-sm text-slate-500">
        Change your password regularly. Minimum 12 characters with uppercase, lowercase, numbers, and symbols.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          className="h-11"
        />
        <Input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          className="h-11"
        />
        <div>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            className={`h-11 ${confirmError ? "border-red-400 focus-visible:ring-red-200" : ""}`}
          />
          {confirmError ? <p className="mt-1 text-xs text-red-600">{confirmError}</p> : null}
        </div>

        <Button type="submit" disabled={!canSubmit} className="w-full gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              Update Password
            </>
          )}
        </Button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      </form>
    </div>
  );
}
