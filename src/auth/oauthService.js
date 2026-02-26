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
   GOOGLE (Identity Services)
========================= */

let googleIdentityInitialized = false;

function assertGoogleSigninEnvironment() {
  const origin = window.location.origin;
  const isLocalhost =
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  if (!window.isSecureContext && !isLocalhost) {
    throw new Error("Google sign-in requires HTTPS (or localhost in development).");
  }

  // Google OAuth frequently blocks embedded app contexts.
  if (window.top !== window.self) {
    throw new Error("Google sign-in is blocked in embedded windows. Open the app in a new browser tab and try again.");
  }
}

function ensureGoogleSdkSync() {
  if (!window.google?.accounts?.id) {
    throw new Error("Google SDK is still loading. Please wait a second and try again.");
  }
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) throw new Error("Invalid Google credential.");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const normalized = payload + "=".repeat((4 - (payload.length % 4 || 4)) % 4);
  const json = atob(normalized);
  return JSON.parse(json);
}

function mapGooglePromptError(reason) {
  if (reason === "unregistered_origin") {
    return `Google sign-in blocked: this origin (${window.location.origin}) is not authorized for your Google client ID. Add it to Authorized JavaScript origins in Google Cloud Console.`;
  }
  if (reason === "secure_http_required") {
    return "Google sign-in requires HTTPS (or localhost in development).";
  }
  if (reason === "browser_not_supported") {
    return "Google sign-in is not supported in this browser context. Open in a normal browser tab and try again.";
  }
  return `Google sign-in could not start (${reason}).`;
}

export async function loginWithGoogle() {
  assertGoogleSigninEnvironment();
  ensureGoogleSdkSync();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Missing VITE_GOOGLE_CLIENT_ID in your .env file");

  return new Promise((resolve, reject) => {
    let settled = false;
    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      if (!googleIdentityInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            try {
              const profile = decodeJwtPayload(response?.credential);
              if (!profile?.email) throw new Error("Google did not return an email (check consent + scopes).");
              const user = await normalizeUser(
                { name: profile.name || profile.given_name || "Google User", email: profile.email, picture: profile.picture },
                "google"
              );
              safeResolve(user);
            } catch (e) {
              safeReject(e);
            }
          },
        });
        googleIdentityInitialized = true;
      }

      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.()) {
          const reason = notification.getNotDisplayedReason?.() || "not_displayed";
          safeReject(new Error(mapGooglePromptError(reason)));
        } else if (notification?.isSkippedMoment?.()) {
          const reason = notification.getSkippedReason?.() || "skipped";
          safeReject(new Error(mapGooglePromptError(reason)));
        } else if (notification?.isDismissedMoment?.()) {
          const reason = notification.getDismissedReason?.() || "dismissed";
          safeReject(new Error(mapGooglePromptError(reason)));
        }
      });
    } catch (e) {
      safeReject(e);
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
