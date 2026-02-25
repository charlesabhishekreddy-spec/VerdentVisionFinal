import { PublicClientApplication } from "@azure/msal-browser";
import { appClient } from "@/api/appClient";

/* =========================
   Small helpers
========================= */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(predicate, { timeoutMs = 6000, intervalMs = 100 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return false;
}

const normalizeUser = (profile, provider) =>
  appClient.auth.signInWithGoogle(
    {
      name: profile.name,
      email: profile.email,
      picture: profile.picture || "",
      provider,
    },
    { remember: true }
  );

/* =========================
   GOOGLE (OAuth2 Token Client)
========================= */

let googleTokenClient = null;

export async function loginWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Missing VITE_GOOGLE_CLIENT_ID in your .env file");

  // Ensure gsi script loaded (index.html already includes it)
  const ok = await waitFor(() => !!window.google?.accounts?.oauth2, { timeoutMs: 8000 });
  if (!ok) {
    throw new Error("Google SDK not loaded. Confirm index.html has https://accounts.google.com/gsi/client");
  }

  return new Promise((resolve, reject) => {
    try {
      if (!googleTokenClient) {
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async (tokenResponse) => {
            try {
              if (tokenResponse?.error) throw new Error(tokenResponse.error);

              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Failed to fetch Google user profile (${res.status}). ${txt}`);
              }

              const profile = await res.json();
              if (!profile?.email) throw new Error("Google did not return an email (check consent + scopes).");

              const user = await normalizeUser(
                { name: profile.name, email: profile.email, picture: profile.picture },
                "google"
              );

              resolve(user);
            } catch (e) {
              reject(e);
            }
          },
        });
      }

      // Always show account chooser
      googleTokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (e) {
      reject(e);
    }
  });
}

/* =========================
   MICROSOFT ENTRA (MSAL)
========================= */

const entraClientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenant = import.meta.env.VITE_ENTRA_TENANT_ID || "common";

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: entraClientId || "MISSING",
    authority: `https://login.microsoftonline.com/${tenant}`,
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT || window.location.origin,
  },
  cache: { cacheLocation: "localStorage" },
});

let msalInitPromise = null;

async function ensureMsalInitialized() {
  if (!entraClientId) throw new Error("Missing VITE_ENTRA_CLIENT_ID in your .env file");
  if (!msalInitPromise) msalInitPromise = msalInstance.initialize();
  await msalInitPromise;
}

export async function loginWithMicrosoft() {
  await ensureMsalInitialized();

  const result = await msalInstance.loginPopup({
    scopes: ["openid", "profile", "email", "User.Read"],
    prompt: "select_account",
  });

  const account = result.account;
  if (!account?.username) throw new Error("Microsoft login did not return an email/username.");

  return normalizeUser(
    { name: account.name || account.username, email: account.username, picture: "" },
    "microsoft"
  );
}

/* =========================
   FACEBOOK (SDK)
========================= */

let fbInitialized = false;

async function initFacebook() {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!appId) throw new Error("Missing VITE_FACEBOOK_APP_ID in your .env file");

  // index.html includes the FB SDK script
  const ok = await waitFor(() => !!window.FB, { timeoutMs: 8000 });
  if (!ok) throw new Error("Facebook SDK not loaded. Confirm index.html has connect.facebook.net sdk.js");

  if (fbInitialized) return;

  window.FB.init({
    appId,
    cookie: true,
    xfbml: false,
    version: "v18.0",
  });

  fbInitialized = true;
}

export async function loginWithFacebook() {
  await initFacebook();

  return new Promise((resolve, reject) => {
    window.FB.login(
      function (response) {
        if (!response.authResponse) return reject(new Error("Facebook login cancelled"));

        window.FB.api(
          "/me",
          { fields: "name,email,picture" },
          async function (userInfo) {
            try {
              if (!userInfo?.email) {
                throw new Error("Facebook did not return an email (your FB app must request email permission).");
              }

              const user = await normalizeUser(
                { name: userInfo.name, email: userInfo.email, picture: userInfo.picture?.data?.url },
                "facebook"
              );

              resolve(user);
            } catch (e) {
              reject(e);
            }
          }
        );
      },
      { scope: "public_profile,email", auth_type: "rerequest" }
    );
  });
}