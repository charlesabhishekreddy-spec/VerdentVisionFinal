import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export default function Login() {
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/Home');
    }
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
        await signInWithGoogle({ name: payload.name, email: payload.email, picture: payload.picture });
        navigate(decodeURIComponent(params.get('next') || '/Home'));
      },
    });

    const node = document.getElementById('google-signin-btn');
    if (node) {
      window.google.accounts.id.renderButton(node, { theme: 'outline', size: 'large', width: 280 });
    }
  }, [navigate, params, signInWithGoogle]);

  const fallbackGoogleSignIn = async () => {
    const email = window.prompt('Enter your Gmail address');
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    await signInWithGoogle({ name: email.split('@')[0], email, picture: '' });
    navigate(decodeURIComponent(params.get('next') || '/Home'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/80 flex items-center justify-center shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Verdent Vision</h1>
          <p className="text-slate-600">Sign in to access dashboard, admin controls, and farm insights.</p>
        </div>

        <div id="google-signin-btn" className="flex justify-center" />

        <Button onClick={fallbackGoogleSignIn} className="w-full bg-white/80 text-slate-800 hover:bg-white border border-slate-200 gap-2">
          <Mail className="w-4 h-4" />
          Continue with Google Mail
        </Button>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}
