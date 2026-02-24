import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/appClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: 'verdent-local', public_settings: { auth_required: true } });

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await appClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error?.message || 'Authentication required' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAppState();
  }, []);

  const signInWithGoogle = async (profile) => {
    const currentUser = await appClient.auth.signInWithGoogle(profile);
    setUser(currentUser);
    setIsAuthenticated(true);
    setAuthError(null);
    return currentUser;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) appClient.auth.logout('/login');
    else appClient.auth.logout();
  };

  const navigateToLogin = () => {
    appClient.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      signInWithGoogle,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
