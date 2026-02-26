import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';

export default function Signup() {
  const { registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await registerWithEmail({ fullName, email, password });
      navigate('/Home');
    } catch (err) {
      setError(err?.message || 'Sign up failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-to-b from-[#13264f] to-[#233f7e] text-white p-12 items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center">
            <Sprout className="text-[#1f4d9b]" />
          </div>
          <h1 className="text-5xl font-bold">Create your account.</h1>
          <p className="text-lg text-blue-100">Join Verdent Vision to manage farms, diagnostics, and AI-powered planning.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white border p-8 shadow-xl space-y-5">
          <h2 className="text-4xl font-bold">Sign Up</h2>
          <p className="text-slate-500">Already have an account? <Link className="text-sky-600 font-semibold" to="/login">Sign in</Link></p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input placeholder="Password (min 8 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <Input placeholder="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
            <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white">Create Account</Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}