import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Building2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export default function Login() {
  const { signInWithGoogle, signInWithEmail, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState('attendee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/Home');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const payload = parseJwt(response.credential);
        if (!payload?.email) {
          setError('Google login did not return a valid email.');
          return;
        }
        await signInWithGoogle({ name: payload.name, email: payload.email, picture: payload.picture, accountType });
        navigate(decodeURIComponent(params.get('next') || '/Home'));
      },
    });

    const node = document.getElementById('google-signin-btn');
    if (node) window.google.accounts.id.renderButton(node, { theme: 'outline', size: 'large', width: 360 });
  }, [accountType, navigate, params, signInWithGoogle]);

  const onEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithEmail({ email, password });
      navigate(decodeURIComponent(params.get('next') || '/Home'));
    } catch (err) {
      setError(err?.message || 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-to-b from-[#13264f] to-[#233f7e] text-white p-12 items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div className="mx-auto bg-white w-16 h-16 rounded-xl flex items-center justify-center">
            <GraduationCap className="text-[#1f4d9b]" />
          </div>
          <h1 className="text-5xl font-bold">Welcome back.<br />Your campus awaits.</h1>
          <p className="text-lg text-blue-100">Sign in to discover events, connect with communities, and never miss what matters.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white border p-8 shadow-xl space-y-5">
          <h2 className="text-4xl font-bold">Sign In</h2>
          <p className="text-slate-500">New? <Link className="text-sky-600 font-semibold" to="/signup">Create an account</Link></p>

          <div id="google-signin-btn" className="flex justify-center" />
          <div className="text-center text-sm text-slate-500">OR WITH EMAIL</div>

          <form onSubmit={onEmailSignIn} className="space-y-4">
            <p className="font-semibold">Sign in as</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setAccountType('attendee')} className={`border rounded-xl p-4 ${accountType === 'attendee' ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
                <UserRound className="mx-auto mb-2 text-violet-700" />Attendee
              </button>
              <button type="button" onClick={() => setAccountType('organizer')} className={`border rounded-xl p-4 ${accountType === 'organizer' ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
                <Building2 className="mx-auto mb-2 text-slate-500" />Organizer
              </button>
            </div>
            <Input placeholder="you@campus.edu" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input placeholder="********" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" disabled={isSubmitting} className="w-full bg-sky-500 hover:bg-sky-600 text-white">Sign In</Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
