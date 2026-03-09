const textDecoder = new TextDecoder();
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const OPENID_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const jwksCache = new Map();
const openIdCache = new Map();

class SocialAuthError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "SocialAuthError";
    this.code = code;
    this.status = status;
  }
}

const splitConfiguredValues = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

const socialError = (code, message, status = 400) => new SocialAuthError(code, message, status);

const requireEnvValue = (env, keys, providerLabel) => {
  const names = Array.isArray(keys) ? keys : [keys];
  for (const key of names) {
    const value = String(env?.[key] || "").trim();
    if (value) return value;
  }
  throw socialError(
    "social_provider_not_configured",
    `${providerLabel} sign-in is not configured on the API.`,
    503
  );
};

const decodeBase64UrlBytes = (value = "") => {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const decodeJwtJson = (segment, label) => {
  try {
    const bytes = decodeBase64UrlBytes(segment);
    return JSON.parse(textDecoder.decode(bytes));
  } catch {
    throw socialError("invalid_social_token", `Unable to decode ${label} token data.`, 401);
  }
};

const parseJwt = (token = "") => {
  const segments = String(token || "").split(".");
  if (segments.length !== 3) {
    throw socialError("invalid_social_token", "Identity token is malformed.", 401);
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  return {
    header: decodeJwtJson(headerSegment, "identity"),
    claims: decodeJwtJson(payloadSegment, "identity"),
    signingInput: new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    signature: decodeBase64UrlBytes(signatureSegment),
  };
};

const fetchJson = async (url, init = {}, { provider, invalidStatuses = [] } = {}) => {
  let response;
  try {
    response = await fetch(url, init);
  } catch {
    throw socialError("social_provider_unreachable", `${provider} verification endpoint could not be reached.`, 502);
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }
  }

  if (!response.ok) {
    const message =
      data?.error_description ||
      data?.error?.message ||
      data?.error?.type ||
      data?.message ||
      `${provider} verification failed.`;
    if (invalidStatuses.includes(response.status)) {
      throw socialError("invalid_social_token", message, 401);
    }
    throw socialError("social_provider_error", message, 502);
  }

  return data;
};

const getCachedJson = async (cache, cacheKey, ttlMs, loader) => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ttlMs) {
    return cached.value;
  }
  const value = await loader();
  cache.set(cacheKey, { cachedAt: Date.now(), value });
  return value;
};

const getOpenIdConfiguration = async (url, provider) =>
  getCachedJson(openIdCache, url, OPENID_CACHE_TTL_MS, async () => fetchJson(url, {}, { provider }));

const getJwksKeys = async (jwksUri, provider, forceRefresh = false) => {
  if (forceRefresh) {
    jwksCache.delete(jwksUri);
  }
  const keys = await getCachedJson(jwksCache, jwksUri, JWKS_CACHE_TTL_MS, async () => {
    const data = await fetchJson(jwksUri, {}, { provider });
    if (!Array.isArray(data?.keys) || data.keys.length === 0) {
      throw socialError("social_provider_error", `${provider} key set is unavailable.`, 502);
    }
    return data.keys;
  });
  return Array.isArray(keys) ? keys : [];
};

const ensureAudienceMatch = (actualAudience, acceptedAudiences = []) => {
  const actualValues = Array.isArray(actualAudience)
    ? actualAudience.map((item) => String(item || "").trim()).filter(Boolean)
    : [String(actualAudience || "").trim()].filter(Boolean);
  return actualValues.some((value) => acceptedAudiences.includes(value));
};

const verifyJwt = async ({ token, provider, jwksUri, expectedAudience, expectedIssuer }) => {
  const { header, claims, signingInput, signature } = parseJwt(token);
  if (String(header?.alg || "") !== "RS256") {
    throw socialError("invalid_social_token", `${provider} identity token uses an unsupported signing algorithm.`, 401);
  }

  const keyId = String(header?.kid || "").trim();
  if (!keyId) {
    throw socialError("invalid_social_token", `${provider} identity token is missing a key identifier.`, 401);
  }

  const acceptedAudience = splitConfiguredValues(expectedAudience);
  if (!acceptedAudience.length || !ensureAudienceMatch(claims.aud, acceptedAudience)) {
    throw socialError("invalid_social_token", `${provider} identity token audience does not match this application.`, 401);
  }

  const issuer = String(claims.iss || "").trim();
  if (issuer !== String(expectedIssuer || "").trim()) {
    throw socialError("invalid_social_token", `${provider} identity token issuer is invalid.`, 401);
  }

  const now = Date.now();
  if (claims.nbf && now + CLOCK_SKEW_MS < Number(claims.nbf) * 1000) {
    throw socialError("invalid_social_token", `${provider} identity token is not valid yet.`, 401);
  }
  if (claims.exp && now - CLOCK_SKEW_MS >= Number(claims.exp) * 1000) {
    throw socialError("invalid_social_token", `${provider} identity token has expired.`, 401);
  }

  let keys = await getJwksKeys(jwksUri, provider, false);
  let jwk = keys.find((candidate) => String(candidate?.kid || "") === keyId);
  if (!jwk) {
    keys = await getJwksKeys(jwksUri, provider, true);
    jwk = keys.find((candidate) => String(candidate?.kid || "") === keyId);
  }
  if (!jwk?.n || !jwk?.e) {
    throw socialError("social_provider_error", `${provider} signing key is unavailable.`, 502);
  }

  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      {
        kty: "RSA",
        kid: keyId,
        n: jwk.n,
        e: jwk.e,
        alg: "RS256",
        ext: true,
      },
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );
  } catch {
    throw socialError("social_provider_error", `${provider} signing key could not be imported.`, 502);
  }

  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    signature,
    signingInput
  );

  if (!verified) {
    throw socialError("invalid_social_token", `${provider} identity token signature is invalid.`, 401);
  }

  return claims;
};

const verifyGoogleIdentity = async (payload, env) => {
  const clientId = requireEnvValue(env, "GOOGLE_CLIENT_ID", "Google");
  const accessToken = String(payload?.access_token || "").trim();
  if (!accessToken) {
    throw socialError("access_token_required", "Google access token is required.", 400);
  }

  const tokenInfo = await fetchJson(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    {},
    {
      provider: "Google",
      invalidStatuses: [400, 401],
    }
  );

  const acceptedClientIds = splitConfiguredValues(clientId);
  const tokenAudience = String(tokenInfo?.aud || tokenInfo?.azp || "").trim();
  if (!acceptedClientIds.includes(tokenAudience)) {
    throw socialError("invalid_social_token", "Google access token audience does not match this application.", 401);
  }

  const expiresIn = Number.parseInt(String(tokenInfo?.expires_in || "0"), 10);
  if (Number.isFinite(expiresIn) && expiresIn <= 0) {
    throw socialError("invalid_social_token", "Google access token has expired.", 401);
  }

  const userInfo = await fetchJson(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      provider: "Google",
      invalidStatuses: [400, 401, 403],
    }
  );

  const email = normalizeEmail(userInfo?.email || tokenInfo?.email || "");
  if (!email) {
    throw socialError("social_identity_unusable", "Google did not return an email address for this account.", 400);
  }
  if (userInfo?.email_verified === false) {
    throw socialError("social_identity_unusable", "Google account email is not verified.", 400);
  }

  return {
    provider: "google",
    subject: String(userInfo?.sub || tokenInfo?.sub || email),
    email,
    name: String(userInfo?.name || userInfo?.given_name || email.split("@")[0] || "User").trim(),
    picture: String(userInfo?.picture || "").trim(),
    emailVerified: userInfo?.email_verified !== false,
  };
};

const verifyMicrosoftIdentity = async (payload, env) => {
  const clientId = requireEnvValue(env, ["ENTRA_CLIENT_ID", "MICROSOFT_CLIENT_ID"], "Microsoft");
  const configuredTenant = String(env?.ENTRA_TENANT_ID || env?.MICROSOFT_TENANT_ID || "common").trim() || "common";
  const identityToken = String(payload?.identity_token || payload?.id_token || "").trim();
  if (!identityToken) {
    throw socialError("identity_token_required", "Microsoft identity token is required.", 400);
  }

  const parsed = parseJwt(identityToken);
  const tokenTenantId = String(parsed.claims?.tid || "").trim();
  const normalizedConfiguredTenant = configuredTenant.toLowerCase();
  if (
    tokenTenantId &&
    !["common", "organizations", "consumers"].includes(normalizedConfiguredTenant) &&
    tokenTenantId.toLowerCase() !== normalizedConfiguredTenant
  ) {
    throw socialError("invalid_social_token", "Microsoft identity token tenant does not match this application.", 401);
  }

  const tenantForMetadata = tokenTenantId || configuredTenant;
  const metadata = await getOpenIdConfiguration(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantForMetadata)}/v2.0/.well-known/openid-configuration`,
    "Microsoft"
  );

  const claims = await verifyJwt({
    token: identityToken,
    provider: "Microsoft",
    jwksUri: metadata?.jwks_uri,
    expectedAudience: clientId,
    expectedIssuer: metadata?.issuer,
  });

  const email = normalizeEmail(claims?.email || claims?.preferred_username || claims?.upn || "");
  if (!email) {
    throw socialError("social_identity_unusable", "Microsoft did not return an email address for this account.", 400);
  }

  return {
    provider: "microsoft",
    subject: String(claims?.oid || claims?.sub || email),
    email,
    name: String(claims?.name || email.split("@")[0] || "User").trim(),
    picture: "",
    emailVerified: true,
    tenantId: tokenTenantId || "",
  };
};

const verifyFacebookIdentity = async (payload, env) => {
  const appId = requireEnvValue(env, "FACEBOOK_APP_ID", "Facebook");
  const appSecret = requireEnvValue(env, "FACEBOOK_APP_SECRET", "Facebook");
  const accessToken = String(payload?.access_token || "").trim();
  if (!accessToken) {
    throw socialError("access_token_required", "Facebook access token is required.", 400);
  }

  const appAccessToken = `${appId}|${appSecret}`;
  const debugResponse = await fetchJson(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
    {},
    {
      provider: "Facebook",
      invalidStatuses: [400, 401, 403],
    }
  );

  const debugData = debugResponse?.data || {};
  if (!debugData?.is_valid) {
    throw socialError("invalid_social_token", "Facebook access token is invalid.", 401);
  }
  if (String(debugData?.app_id || "") !== appId) {
    throw socialError("invalid_social_token", "Facebook access token audience does not match this application.", 401);
  }
  if (debugData?.expires_at && Date.now() - CLOCK_SKEW_MS >= Number(debugData.expires_at) * 1000) {
    throw socialError("invalid_social_token", "Facebook access token has expired.", 401);
  }

  const me = await fetchJson(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
    {},
    {
      provider: "Facebook",
      invalidStatuses: [400, 401, 403],
    }
  );

  const email = normalizeEmail(me?.email || "");
  if (!email) {
    throw socialError("social_identity_unusable", "Facebook did not return an email address for this account.", 400);
  }
  if (debugData?.user_id && String(debugData.user_id) !== String(me?.id || "")) {
    throw socialError("invalid_social_token", "Facebook token identity does not match the returned profile.", 401);
  }

  return {
    provider: "facebook",
    subject: String(me?.id || debugData?.user_id || email),
    email,
    name: String(me?.name || email.split("@")[0] || "User").trim(),
    picture: String(me?.picture?.data?.url || "").trim(),
    emailVerified: true,
  };
};

export const verifySocialIdentity = async (payload, env) => {
  const provider = String(payload?.provider || "").trim().toLowerCase();
  if (provider === "google") return verifyGoogleIdentity(payload, env);
  if (provider === "microsoft") return verifyMicrosoftIdentity(payload, env);
  if (provider === "facebook") return verifyFacebookIdentity(payload, env);
  throw socialError("invalid_provider", "Unsupported social provider.", 400);
};

export { SocialAuthError };
