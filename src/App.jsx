import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'

import {
  BrowserRouter as Router,
  Route,
  Routes
} from 'react-router-dom';

import PageNotFound from './lib/PageNotFound'

/* ---------------- AUTH ---------------- */
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'

/* ✅ NEW PREMIUM AUTH MODULE */
import Login from '@/auth/Login'
import Signup from '@/pages/Signup' // keep until migrated
import ProtectedRoute from '@/auth/ProtectedRoute'
import AuthLoader from '@/auth/AuthLoader'

/* ---------------- PAGE CONFIG ---------------- */
const { Pages, Layout, mainPage } = pagesConfig;

const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>
      {children}
    </Layout>
  ) : (
    <>{children}</>
  );

/* ================= AUTHENTICATED APP ================= */

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
  } = useAuth();

  /* ---------- GLOBAL AUTH LOADER ---------- */
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AuthLoader />;
  }

  /* ---------- USER NOT REGISTERED CASE ---------- */
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>

      {/* ---------- PUBLIC ROUTES ---------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ---------- PROTECTED ROUTES ---------- */}
      <Route element={<ProtectedRoute />}>

        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          }
        />

        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}

      </Route>

      {/* ---------- FALLBACK ---------- */}
      <Route path="*" element={<PageNotFound />} />

    </Routes>
  );
};

/* ================= ROOT APP ================= */

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>

        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;