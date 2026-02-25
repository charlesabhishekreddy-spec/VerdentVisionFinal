import { PublicClientApplication } from "@azure/msal-browser";
import { appClient } from "@/api/appClient";

/* =========================
   Helpers
========================= */

const normalizeUser = (profile) =>
  appClient.auth.signInWithGoogle({
    name: profile.name,
    email: profile.email,
    picture: profile.picture || "",
  });

/* =========================
   GOOGLE (Popup OAuth2 token client)
   - Always opens popup (fixes "prompt not displayed")
========================= */

export function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) return reject(new Error("Missing VITE_GOOGLE_CLIENT_ID"));

      if (!window.google?.accounts?.oauth2) {
        return reject(
          new Error("Google OAuth2 not loaded. Ensure gsi/client script is in index.html")
        );
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          try {
            if (tokenResponse?.error) throw new Error(tokenResponse.error);

            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch Google user profile");

            const profile = await res.json();
            const user = await normalizeUser({
              name: profile.name,
              email: profile.email,
              picture: profile.picture,
            });

            resolve(user);
          } catch (e) {
            reject(e);
          }
        },
      });

      // Always show chooser
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (e) {
      reject(e);
    }
  });
}

/* =========================
   MICROSOFT ENTRA (MSAL)
   - Fixes uninitialized_public_client_application
========================= */

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID || "common"}`,
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT || window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
});

let msalInitPromise = null;

async function ensureMsalInitialized() {
  if (!import.meta.env.VITE_ENTRA_CLIENT_ID) throw new Error("Missing VITE_ENTRA_CLIENT_ID");
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
  if (!account?.username) throw new Error("Microsoft login did not return an account");

  return normalizeUser({
    name: account.name || account.username,
    email: account.username,
    picture: "",
  });
}

/* =========================
   FACEBOOK (SDK init inside JS)
========================= */

let fbInitialized = false;

function initFacebook() {
  if (fbInitialized) return;

  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!appId) throw new Error("Missing VITE_FACEBOOK_APP_ID");

  if (!window.FB) {
    throw new Error("Facebook SDK not loaded. Ensure SDK script is in index.html");
  }

  window.FB.init({
    appId,
    cookie: true,
    xfbml: false,
    version: "v18.0",
  });

  fbInitialized = true;
}

export function loginWithFacebook() {
  return new Promise((resolve, reject) => {
    try {
      initFacebook();

      window.FB.login(
        function (response) {
          if (!response.authResponse) return reject(new Error("Facebook login cancelled"));

          window.FB.api(
            "/me",
            { fields: "name,email,picture" },
            async function (userInfo) {
              try {
                const user = await normalizeUser({
                  name: userInfo.name,
                  email: userInfo.email,
                  picture: userInfo.picture?.data?.url,
                });
                resolve(user);
              } catch (e) {
                reject(e);
              }
            }
          );
        },
        { scope: "public_profile,email", auth_type: "rerequest" }
      );
    } catch (e) {
      reject(e);
    }
  });
}