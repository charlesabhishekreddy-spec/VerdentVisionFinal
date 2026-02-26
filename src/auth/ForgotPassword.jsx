import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 shadow-xl space-y-5">
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="text-sm text-slate-500">
          Enter your email address and we will send reset instructions.
        </p>

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            If an account exists for <strong>{email}</strong>, reset instructions have been sent.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="text-sm text-slate-500">
          <Link className="text-sky-600 hover:text-sky-700" to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
