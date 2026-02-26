const STORAGE_KEY = "verdent_vision_db_v3";
const SESSION_KEY = "verdent_vision_session_token_v1";
const LEGACY_PROFILE_SESSION_KEY = "verdent_vision_profile_v1";
const ADMIN_EMAIL = "charlesabhishekreddy@gmail.com";
const DEFAULT_SESSION_HOURS = 8;
const REMEMBER_SESSION_DAYS = 30;
const RESET_TOKEN_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_MIN_LENGTH = 12;

/* ================= ENTERPRISE SESSION HELPERS ================= */

const DEVICE_KEY = "verdent_device_id";

const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

const getDeviceInfo = () => ({
  id: getDeviceId(),
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  created_at: new Date().toISOString(),
});

const nowIso = () => new Date().toISOString();
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const getRoleForEmail = (email = "") => (normalizeEmail(email) === ADMIN_EMAIL ? "admin" : "user");
const normalizeCrops = (value) => {
  if (Array.isArray(value)) return value.map((crop) => String(crop || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((crop) => crop.trim())
      .filter(Boolean);
  }
  return [];
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_ENUM = new Set(["admin", "user"]);
const ACCOUNT_STATUS_ENUM = new Set(["active", "invited", "suspended"]);
const SOCIAL_PROVIDER_ENUM = new Set(["google", "microsoft", "facebook"]);
const LOGIN_THROTTLE_WINDOW_MS = LOCKOUT_MINUTES * 60 * 1000;

const isValidEmail = (email = "") => EMAIL_REGEX.test(normalizeEmail(email));

const safeStringCompare = (a = "", b = "") => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
};

const hexFromBytes = (bytes) =>
  Array.from(bytes || [])
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const bytesFromHex = (hex = "") => {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const generateToken = (byteLength = 32) => {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return hexFromBytes(bytes);
};

const hashText = async (text = "") => {
  const payload = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return hexFromBytes(new Uint8Array(digest));
};

const derivePasswordHash = async (password, saltHex, iterations = PASSWORD_ITERATIONS) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBytes = bytesFromHex(saltHex);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return hexFromBytes(new Uint8Array(bits));
};

const makePasswordRecord = async (password) => {
  const salt = generateToken(16);
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return { password_hash: hash, password_salt: salt, password_iterations: PASSWORD_ITERATIONS };
};

const validatePassword = (password = "", email = "") => {
  const pwd = String(password || "");
  const emailLocal = normalizeEmail(email).split("@")[0] || "";
  if (pwd.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must include a symbol.";
  if (/\s/.test(pwd)) return "Password must not contain spaces.";
  if (emailLocal && pwd.toLowerCase().includes(emailLocal)) return "Password must not contain your email name.";
  return "";
};

const maskEmail = (email = "") => {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "your email";
  const maskedLocal = `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ================= LOCAL DB ================= */

const seedDatabase = () => ({
  User: [
    {
      id: "u-admin",
      full_name: "Charles Admin",
      email: ADMIN_EMAIL,
      role: "admin",
      provider: "system",
      account_status: "active",
      email_verified: true,
      farm_location: "Main Farm",
      created_date: nowIso(),
    },
  ],
  AuthEvent: [],
  AuthSession: [],
  PasswordResetToken: [],
  LoginThrottle: [],
  ActivityLog: [],
  DeviceSessions: [],

  PlantDatabase: [
    {
      id: "p1",
      common_name: "Tomato",
      scientific_name: "Solanum lycopersicum",
      common_diseases: ["Early Blight", "Late Blight"],
      common_pests: ["Aphids"],
      created_date: nowIso(),
    },
    {
      id: "p2",
      common_name: "Potato",
      scientific_name: "Solanum tuberosum",
      common_diseases: ["Scab"],
      common_pests: ["Beetle"],
      created_date: nowIso(),
    },
  ],
  PlantDiagnosis: [],
  Treatment: [],
  Task: [],
  PestPrediction: [],
  WeatherLog: [],
  OutbreakReport: [],
  DiagnosisFeedback: [],
  ForumPost: [],
  CropPlan: [],
});

const readDb = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = seedDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
  try {
    const parsed = JSON.parse(raw);
    parsed.User = parsed.User || [];
    parsed.AuthEvent = parsed.AuthEvent || [];
    parsed.AuthSession = parsed.AuthSession || [];
    parsed.PasswordResetToken = parsed.PasswordResetToken || [];
    parsed.LoginThrottle = parsed.LoginThrottle || [];
    parsed.DeviceSessions = parsed.DeviceSessions || [];
    parsed.ActivityLog = parsed.ActivityLog || [];
    parsed.User = parsed.User.map((user) => ({
      account_status: "active",
      email_verified: true,
      ...user,
      role: ROLE_ENUM.has(user?.role) ? user.role : getRoleForEmail(user?.email || ""),
      account_status: ACCOUNT_STATUS_ENUM.has(user?.account_status) ? user.account_status : "active",
    }));
    return parsed;
  } catch {
    return seedDatabase();
  }
};

const writeDb = (db) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

const sortItems = (items, sortBy = "") => {
  if (!sortBy) return [...items];
  const desc = sortBy.startsWith("-");
  const field = desc ? sortBy.slice(1) : sortBy;
  return [...items].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, password_salt, password_iterations, ...safeUser } = user;
  return safeUser;
};

const logAuthEvent = (type, email, metadata = {}) => {
  const db = readDb();
  db.AuthEvent = db.AuthEvent || [];
  db.AuthEvent.unshift({
    id: makeId(),
    type,
    email: normalizeEmail(email),
    metadata,
    created_date: nowIso(),
  });
  db.AuthEvent = db.AuthEvent.slice(0, 5000);
  writeDb(db);
};

const upsertUserByEmail = (profile) => {
  const db = readDb();
  const email = normalizeEmail(profile.email);
  const found = (db.User || []).find((u) => normalizeEmail(u.email) === email);
  const role = found?.role || getRoleForEmail(email);
  const account_status = ACCOUNT_STATUS_ENUM.has(profile?.account_status)
    ? profile.account_status
    : found?.account_status || "active";
  const email_verified = typeof profile?.email_verified === "boolean"
    ? profile.email_verified
    : found?.email_verified ?? false;

  const user = found
    ? {
        ...found,
        ...profile,
        email,
        role,
        account_status,
        email_verified,
        id: found.id,
        updated_date: nowIso(),
      }
    : {
        id: makeId(),
        created_date: nowIso(),
        role,
        email,
        account_status,
        email_verified,
        ...profile,
      };

  db.User = [user, ...(db.User || []).filter((u) => normalizeEmail(u.email) !== email)];
  writeDb(db);
  return user;
};

const getUserByEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return (readDb().User || []).find((u) => normalizeEmail(u.email) === normalized) || null;
};

const getUserById = (id) => {
  if (!id) return null;
  return (readDb().User || []).find((u) => u.id === id) || null;
};

const ensureUserActive = (user) => {
  if (!user) throw Object.assign(new Error("Invalid credentials."), { status: 401 });
  if (user.account_status === "suspended") {
    throw Object.assign(new Error("Account suspended. Contact an administrator."), { status: 403 });
  }
  return user;
};

const getStoredToken = () => {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) return token;
  } catch {}
  try {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) return token;
  } catch {}
  return null;
};

const setStoredToken = (token, { remember = true } = {}) => {
  if (!token) return;
  if (remember) {
    try { localStorage.setItem(SESSION_KEY, token); } catch {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  } else {
    try { sessionStorage.setItem(SESSION_KEY, token); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
  try { localStorage.removeItem(LEGACY_PROFILE_SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(LEGACY_PROFILE_SESSION_KEY); } catch {}
};

const clearStoredToken = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  try { localStorage.removeItem(LEGACY_PROFILE_SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(LEGACY_PROFILE_SESSION_KEY); } catch {}
};

const expireMs = ({ remember = true } = {}) =>
  remember ? REMEMBER_SESSION_DAYS * 24 * 60 * 60 * 1000 : DEFAULT_SESSION_HOURS * 60 * 60 * 1000;

const createAuthSession = async (user, { remember = true } = {}) => {
  const db = readDb();
  const token = generateToken(32);
  const token_hash = await hashText(token);
  const now = new Date();
  const expires = new Date(now.getTime() + expireMs({ remember }));

  db.AuthSession = (db.AuthSession || []).filter((session) => {
    if (session.revoked_date) return false;
    if (new Date(session.expires_at).getTime() <= now.getTime()) return false;
    return true;
  });

  db.AuthSession.unshift({
    id: makeId(),
    token_hash,
    user_id: user.id,
    user_email: normalizeEmail(user.email),
    remember,
    device_id: getDeviceId(),
    created_date: now.toISOString(),
    last_active: now.toISOString(),
    expires_at: expires.toISOString(),
  });

  writeDb(db);
  setStoredToken(token, { remember });
  touchDeviceSession(user.email);
  return token;
};

const revokeSessionByToken = async (token) => {
  if (!token) return;
  const tokenHash = await hashText(token);
  const db = readDb();
  db.AuthSession = (db.AuthSession || []).map((session) =>
    session.token_hash === tokenHash && !session.revoked_date
      ? { ...session, revoked_date: nowIso(), updated_date: nowIso() }
      : session
  );
  writeDb(db);
};

const revokeUserSessions = (userId, exceptSessionId) => {
  const db = readDb();
  db.AuthSession = (db.AuthSession || []).map((session) =>
    session.user_id === userId && session.id !== exceptSessionId && !session.revoked_date
      ? { ...session, revoked_date: nowIso(), updated_date: nowIso() }
      : session
  );
  writeDb(db);
};

const getSessionWithUser = async () => {
  const token = getStoredToken();
  if (!token) return { token: null, session: null, user: null };
  const tokenHash = await hashText(token);
  const db = readDb();
  const now = Date.now();

  const session = (db.AuthSession || []).find((record) => record.token_hash === tokenHash) || null;
  if (!session || session.revoked_date || new Date(session.expires_at).getTime() <= now) {
    clearStoredToken();
    return { token: null, session: null, user: null };
  }

  const user = (db.User || []).find((u) => u.id === session.user_id) || null;
  if (!user || user.account_status === "suspended") {
    clearStoredToken();
    return { token: null, session: null, user: null };
  }

  session.last_active = nowIso();
  writeDb(db);
  return { token, session, user };
};

const getThrottleRecord = (db, email) => {
  const deviceId = getDeviceId();
  const normalizedEmail = normalizeEmail(email);
  return (db.LoginThrottle || []).find(
    (entry) => entry.email === normalizedEmail && entry.device_id === deviceId
  );
};

const checkLoginThrottle = (email) => {
  const db = readDb();
  const record = getThrottleRecord(db, email);
  if (!record?.lock_until) return { allowed: true };

  const now = Date.now();
  const lockUntil = new Date(record.lock_until).getTime();
  if (lockUntil > now) {
    return { allowed: false, retryAfterMs: lockUntil - now };
  }

  db.LoginThrottle = (db.LoginThrottle || []).map((entry) =>
    entry.id === record.id ? { ...entry, lock_until: null, attempts: 0, first_attempt_at: null } : entry
  );
  writeDb(db);
  return { allowed: true };
};

const markFailedLogin = (email) => {
  const db = readDb();
  db.LoginThrottle = db.LoginThrottle || [];
  const now = Date.now();
  const normalizedEmail = normalizeEmail(email);
  const deviceId = getDeviceId();
  const existing = getThrottleRecord(db, normalizedEmail);

  if (!existing) {
    db.LoginThrottle.push({
      id: makeId(),
      email: normalizedEmail,
      device_id: deviceId,
      attempts: 1,
      first_attempt_at: new Date(now).toISOString(),
      last_attempt_at: new Date(now).toISOString(),
      lock_until: null,
    });
    writeDb(db);
    return;
  }

  const firstAttemptMs = existing.first_attempt_at ? new Date(existing.first_attempt_at).getTime() : now;
  const withinWindow = now - firstAttemptMs <= LOGIN_THROTTLE_WINDOW_MS;
  const attempts = withinWindow ? (existing.attempts || 0) + 1 : 1;
  const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

  db.LoginThrottle = db.LoginThrottle.map((entry) =>
    entry.id !== existing.id
      ? entry
      : {
          ...entry,
          attempts,
          first_attempt_at: withinWindow ? entry.first_attempt_at : new Date(now).toISOString(),
          last_attempt_at: new Date(now).toISOString(),
          lock_until: shouldLock ? new Date(now + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null,
        }
  );
  writeDb(db);
};

const clearFailedLogin = (email) => {
  const db = readDb();
  const normalizedEmail = normalizeEmail(email);
  const deviceId = getDeviceId();
  db.LoginThrottle = (db.LoginThrottle || []).filter(
    (entry) => !(entry.email === normalizedEmail && entry.device_id === deviceId)
  );
  writeDb(db);
};

const assertAdmin = async () => {
  const { user } = await getSessionWithUser();
  if (!user) throw Object.assign(new Error("Authentication required"), { status: 401 });
  if (user.role !== "admin") throw Object.assign(new Error("Admin access required"), { status: 403 });
  return user;
};

const entityApi = (entityName) => ({
  async list(sortBy = "", limit) {
    const items = sortItems(readDb()[entityName] || [], sortBy);
    return Number.isFinite(limit) ? items.slice(0, limit) : items;
  },
  async filter(criteria = {}, sortBy = "", limit) {
    const filtered = (readDb()[entityName] || []).filter((item) =>
      Object.entries(criteria).every(([k, v]) => item?.[k] === v)
    );
    const items = sortItems(filtered, sortBy);
    return Number.isFinite(limit) ? items.slice(0, limit) : items;
  },
  async create(data) {
    const db = readDb();
    const item = { id: makeId(), created_date: nowIso(), ...data };
    db[entityName] = [item, ...(db[entityName] || [])];
    writeDb(db);
    return item;
  },
  async update(id, data) {
    const db = readDb();
    db[entityName] = (db[entityName] || []).map((i) => (i.id === id ? { ...i, ...data, updated_date: nowIso() } : i));
    writeDb(db);
    return (db[entityName] || []).find((i) => i.id === id);
  },
  async delete(id) {
    const db = readDb();
    const before = (db[entityName] || []).length;
    db[entityName] = (db[entityName] || []).filter((i) => i.id !== id);
    writeDb(db);
    return { success: before > db[entityName].length };
  },
});

const entities = new Proxy({}, { get: (_t, prop) => entityApi(prop) });

/* ================= SESSION STORAGE ================= */

const touchDeviceSession = (email) => {
  const db = readDb();
  const deviceId = getDeviceId();
  const now = nowIso();

  db.DeviceSessions = db.DeviceSessions || [];

  db.DeviceSessions = db.DeviceSessions.filter(
    (s) => !(normalizeEmail(s.user_email) === normalizeEmail(email) && s.device_id === deviceId)
  );

  db.DeviceSessions.unshift({
    id: makeId(),
    user_email: normalizeEmail(email),
    device_id: deviceId,
    device_info: getDeviceInfo(),
    last_active: now,
  });

  writeDb(db);
};

/* ================= LOCAL "LLM" STUBS (STOPS CRASHES) ================= */

const demoWeather = (loc = "Your area") => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  const forecast = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      day: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
      date: d.toISOString().split("T")[0],
      high: 86 - i,
      low: 72 - i,
      conditions: i % 3 === 0 ? "Partly Cloudy" : i % 3 === 1 ? "Sunny" : "Light Rain",
      precipitation_chance: i % 3 === 2 ? 35 : 10,
      wind_speed: 8 + i,
      icon: "sun",
    };
  });

  return {
    current: {
      location: loc,
      temperature: 84,
      feels_like: 86,
      humidity: 62,
      wind_speed: 10,
      wind_direction: "NE",
      conditions: "Partly Cloudy",
      description: "Warm with light clouds",
      uv_index: 7,
      pressure: 1012,
    },
    forecast,
    alerts: [],
    farming_conditions: {
      overall: "good",
      irrigation_advice: "Check soil moisture; irrigate early morning if needed.",
      pest_risk: "Moderate — scout for aphids/leaf spots after humid periods.",
      task_timing: "Best time: morning/evening to avoid heat stress.",
    },
  };
};

const buildFarmAdvice = (prompt = "") => {
  const lower = prompt.toLowerCase();
  if (lower.includes("tomato") && lower.includes("blight"))
    return "For blight on tomatoes: remove infected leaves, improve airflow, avoid overhead watering, and consider a copper-based fungicide.";
  if (lower.includes("aphid"))
    return "For aphids: spray neem oil/soap solution, introduce ladybugs, and reduce excess nitrogen fertilizer.";
  return "Maintain soil health, monitor crops regularly, and act early when symptoms appear.";
};

export const appClient = {
  entities,

  integrations: {
    Core: {
      /**
       * Local-mode stub for InvokeLLM used across pages.
       * - If a JSON schema for weather exists → return weather-shaped object.
       * - Otherwise return a plain string.
       */
      async InvokeLLM(/** @type {any} */ { prompt = "", response_json_schema } = {}) {
        const p = String(prompt || "").toLowerCase();

        // Weather widgets expect structured object
        const looksLikeWeather =
          response_json_schema?.properties?.current ||
          p.includes("weather") ||
          p.includes("forecast") ||
          p.includes("real-time weather");

        if (looksLikeWeather) {
          // Best-effort "location"
          const loc = "Your area";
          return demoWeather(loc);
        }

        // Chat expects string
        return buildFarmAdvice(prompt);
      },

      /**
       * Local-mode upload: return blob URL for previews.
       */
      async UploadFile({ file }) {
        if (!file) throw new Error("No file provided");
        const file_url = URL.createObjectURL(file);
        return { file_url };
      },
    },
  },

  /* ================= ENTERPRISE ================= */
  enterprise: {
    async listSessions(email) {
      const { user: currentUser } = await getSessionWithUser();
      if (!currentUser) throw Object.assign(new Error("Authentication required"), { status: 401 });

      const db = readDb();
      const normalized = normalizeEmail(email || currentUser.email);
      if (currentUser.role !== "admin" && normalized !== normalizeEmail(currentUser.email)) {
        throw Object.assign(new Error("Access denied."), { status: 403 });
      }

      const now = Date.now();
      const token = getStoredToken();
      const currentTokenHash = token ? await hashText(token) : "";
      const currentDevice = getDeviceId();
      const latestByDevice = new Map();

      (db.DeviceSessions || [])
        .filter((s) => normalizeEmail(s.user_email) === normalized)
        .forEach((session) => {
          const prior = latestByDevice.get(session.device_id);
          if (!prior || new Date(session.last_active).getTime() > new Date(prior.last_active).getTime()) {
            latestByDevice.set(session.device_id, session);
          }
        });

      return (db.AuthSession || [])
        .filter(
          (session) =>
            normalizeEmail(session.user_email) === normalized &&
            !session.revoked_date &&
            new Date(session.expires_at).getTime() > now
        )
        .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
        .map((session) => ({
          id: session.id,
          user_email: session.user_email,
          device_id: session.device_id,
          device_info: latestByDevice.get(session.device_id)?.device_info || getDeviceInfo(),
          last_active: session.last_active,
          created_date: session.created_date,
          expires_at: session.expires_at,
          is_current_device: session.device_id === currentDevice,
          is_current_session: session.token_hash === currentTokenHash,
        }));
    },

    async logoutOtherDevices(email) {
      const { user: currentUser } = await getSessionWithUser();
      if (!currentUser) throw Object.assign(new Error("Authentication required"), { status: 401 });

      const db = readDb();
      const normalized = normalizeEmail(email || currentUser.email);
      if (currentUser.role !== "admin" && normalized !== normalizeEmail(currentUser.email)) {
        throw Object.assign(new Error("Access denied."), { status: 403 });
      }

      const token = getStoredToken();
      const currentTokenHash = token ? await hashText(token) : "";
      const currentDevice = getDeviceId();

      db.DeviceSessions = (db.DeviceSessions || []).filter((s) => {
        if (normalizeEmail(s.user_email) !== normalized) return true;
        return s.device_id === currentDevice;
      });

      db.AuthSession = (db.AuthSession || []).map((session) => {
        if (normalizeEmail(session.user_email) !== normalized) return session;
        if (session.token_hash === currentTokenHash) return session;
        return { ...session, revoked_date: nowIso(), updated_date: nowIso() };
      });

      writeDb(db);
      logAuthEvent("logout_other_devices", normalized);
      return true;
    },
  },

  /* ================= AUTH ================= */
  auth: {
    async me() {
      const { user } = await getSessionWithUser();
      if (!user) throw Object.assign(new Error("Authentication required"), { status: 401, code: "auth_required" });
      touchDeviceSession(user.email);
      return sanitizeUser(user);
    },

    async signInWithSocial({ provider, profile, remember = true } = {}) {
      const normalizedProvider = String(provider || "").toLowerCase();
      if (!SOCIAL_PROVIDER_ENUM.has(normalizedProvider)) {
        throw new Error("Unsupported social provider.");
      }

      const normalizedEmail = normalizeEmail(profile?.email || "");
      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Social provider did not return a valid email.");
      }

      const existing = getUserByEmail(normalizedEmail);
      if (existing?.account_status === "suspended") {
        throw new Error("Account suspended. Contact an administrator.");
      }

      const cleanName = String(profile?.name || existing?.full_name || normalizedEmail.split("@")[0] || "User").trim();
      const linkedProviders = Array.from(
        new Set([...(existing?.linked_providers || []), normalizedProvider].filter(Boolean))
      );

      const user = upsertUserByEmail({
        ...existing,
        full_name: cleanName || "User",
        email: normalizedEmail,
        role: existing?.role || getRoleForEmail(normalizedEmail),
        provider: normalizedProvider,
        linked_providers: linkedProviders,
        avatar_url: profile?.picture || existing?.avatar_url || "",
        account_status: "active",
        email_verified: true,
        last_login_date: nowIso(),
      });

      clearFailedLogin(normalizedEmail);
      await createAuthSession(user, { remember });
      logAuthEvent("social_login_success", normalizedEmail, { provider: normalizedProvider, remember });
      return sanitizeUser(user);
    },

    async signInWithEmail({ email, password, remember = true } = {}) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail) || !password) {
        throw new Error("Enter a valid email and password.");
      }

      const throttle = checkLoginThrottle(normalizedEmail);
      if (!throttle.allowed) {
        const retryMinutes = Math.max(1, Math.ceil((throttle.retryAfterMs || 0) / 60000));
        throw new Error(`Too many failed attempts. Try again in about ${retryMinutes} minute(s).`);
      }

      const user = getUserByEmail(normalizedEmail);
      if (!user?.password_hash) {
        markFailedLogin(normalizedEmail);
        logAuthEvent("login_failed", normalizedEmail, { reason: "invalid_credentials" });
        await sleep(300);
        throw new Error("Invalid email or password.");
      }

      ensureUserActive(user);
      const attemptedHash = await derivePasswordHash(
        password,
        user.password_salt,
        user.password_iterations || PASSWORD_ITERATIONS
      );
      if (!safeStringCompare(attemptedHash, user.password_hash)) {
        markFailedLogin(normalizedEmail);
        logAuthEvent("login_failed", normalizedEmail, { reason: "invalid_credentials" });
        await sleep(300);
        throw new Error("Invalid email or password.");
      }

      clearFailedLogin(normalizedEmail);
      const updated = upsertUserByEmail({ ...user, last_login_date: nowIso() });
      await createAuthSession(updated, { remember });
      logAuthEvent("login_success", normalizedEmail, { remember });
      return sanitizeUser(updated);
    },

    async registerWithEmail({
      fullName,
      email,
      password,
      confirmPassword,
      remember = true,
      ...profilePayload
    } = {}) {
      const normalizedEmail = normalizeEmail(email);
      const cleanName = String(fullName || "").trim();
      if (!cleanName || cleanName.length < 2) throw new Error("Full name must be at least 2 characters.");
      if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email address.");
      if (!password) throw new Error("Password is required.");
      if (typeof confirmPassword === "string" && confirmPassword !== password) {
        throw new Error("Passwords do not match.");
      }
      const passwordError = validatePassword(password, normalizedEmail);
      if (passwordError) throw new Error(passwordError);

      const existing = getUserByEmail(normalizedEmail);
      if (existing?.password_hash) throw new Error("An account with this email already exists.");
      if (existing?.account_status === "suspended") {
        throw new Error("Account suspended. Contact an administrator.");
      }

      const passwordRecord = await makePasswordRecord(password);
      const user = upsertUserByEmail({
        ...existing,
        ...profilePayload,
        full_name: cleanName,
        email: normalizedEmail,
        role: existing?.role || getRoleForEmail(normalizedEmail),
        provider: "email",
        account_status: "active",
        email_verified: true,
        farm_name: profilePayload.farm_name || existing?.farm_name || "",
        location: profilePayload.location || existing?.location || "",
        farm_size: profilePayload.farm_size || existing?.farm_size || "",
        farming_method: profilePayload.farming_method || existing?.farming_method || "conventional",
        soil_type: profilePayload.soil_type || existing?.soil_type || "",
        climate_zone: profilePayload.climate_zone || existing?.climate_zone || "",
        years_experience: Number.isFinite(Number(profilePayload.years_experience))
          ? Number(profilePayload.years_experience)
          : existing?.years_experience || 0,
        primary_crops: normalizeCrops(profilePayload.primary_crops ?? existing?.primary_crops),
        notifications_enabled: profilePayload.notifications_enabled !== false,
        ...passwordRecord,
      });

      await createAuthSession(user, { remember });
      logAuthEvent("register_success", normalizedEmail, { role: user.role });
      return sanitizeUser(user);
    },

    async requestPasswordReset({ email } = {}) {
      const normalizedEmail = normalizeEmail(email);
      const genericMessage = "If an account exists, password reset instructions have been sent.";
      if (!isValidEmail(normalizedEmail)) {
        return { success: true, message: genericMessage };
      }

      const user = getUserByEmail(normalizedEmail);
      if (!user?.password_hash || user.account_status !== "active") {
        logAuthEvent("password_reset_requested", normalizedEmail, { status: "ignored" });
        return { success: true, message: genericMessage };
      }

      const db = readDb();
      const token = generateToken(24);
      const tokenHash = await hashText(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000).toISOString();

      db.PasswordResetToken = (db.PasswordResetToken || [])
        .filter((entry) => !(entry.user_id === user.id && !entry.used_at))
        .concat({
          id: makeId(),
          user_id: user.id,
          token_hash: tokenHash,
          created_date: nowIso(),
          expires_at: expiresAt,
          used_at: null,
        });

      writeDb(db);
      logAuthEvent("password_reset_requested", normalizedEmail, { status: "issued" });

      return {
        success: true,
        message: genericMessage,
        debug_reset_url: `/reset-password?token=${encodeURIComponent(token)}`,
      };
    },

    async validateResetToken(token) {
      if (!token) return { valid: false };
      const tokenHash = await hashText(String(token));
      const db = readDb();
      const now = Date.now();
      const resetRecord = (db.PasswordResetToken || []).find((entry) => entry.token_hash === tokenHash);
      if (!resetRecord || resetRecord.used_at) return { valid: false };
      if (new Date(resetRecord.expires_at).getTime() <= now) return { valid: false };
      const user = (db.User || []).find((entry) => entry.id === resetRecord.user_id);
      if (!user) return { valid: false };
      return { valid: true, email_hint: maskEmail(user.email) };
    },

    async resetPassword({ token, newPassword } = {}) {
      if (!token || !newPassword) throw new Error("Reset token and new password are required.");
      const passwordError = validatePassword(newPassword);
      if (passwordError) throw new Error(passwordError);

      const tokenHash = await hashText(String(token));
      const db = readDb();
      const resetRecord = (db.PasswordResetToken || []).find((entry) => entry.token_hash === tokenHash);

      if (!resetRecord || resetRecord.used_at || new Date(resetRecord.expires_at).getTime() <= Date.now()) {
        throw new Error("Reset link is invalid or expired.");
      }

      const user = (db.User || []).find((entry) => entry.id === resetRecord.user_id);
      ensureUserActive(user);

      const passwordRecord = await makePasswordRecord(newPassword);
      db.User = (db.User || []).map((entry) =>
        entry.id === user.id
          ? {
              ...entry,
              ...passwordRecord,
              updated_date: nowIso(),
              password_reset_at: nowIso(),
            }
          : entry
      );
      db.PasswordResetToken = (db.PasswordResetToken || []).map((entry) =>
        entry.id === resetRecord.id ? { ...entry, used_at: nowIso(), updated_date: nowIso() } : entry
      );
      db.AuthSession = (db.AuthSession || []).map((session) =>
        session.user_id === user.id && !session.revoked_date
          ? { ...session, revoked_date: nowIso(), updated_date: nowIso() }
          : session
      );

      writeDb(db);
      clearStoredToken();
      logAuthEvent("password_reset_completed", user.email);
      return { success: true };
    },

    async updateMe(updateData = {}) {
      const current = await this.me();

      const {
        email,
        fullName,
        full_name,
        primary_crops,
        ...safeUpdateData
      } = updateData || {};
      const currentEmail = normalizeEmail(current.email || "");
      if (email && normalizeEmail(email) !== currentEmail) {
        throw new Error("Email updates require administrator assistance.");
      }
      if (currentEmail && !isValidEmail(currentEmail)) throw new Error("Invalid email format.");
      const merged = {
        ...current,
        ...safeUpdateData,
        email: currentEmail || current.email,
        full_name: full_name || fullName || current.full_name || "Farmer",
        role: current.role || "user",
        provider: current.provider || "email",
      };

      if (Object.prototype.hasOwnProperty.call(updateData, "primary_crops")) {
        merged.primary_crops = normalizeCrops(primary_crops);
      }

      const user = upsertUserByEmail(merged);
      touchDeviceSession(user.email);
      logAuthEvent("profile_updated", user.email);
      return sanitizeUser(user);
    },

    async changePassword({ currentPassword, newPassword } = {}) {
      if (!currentPassword || !newPassword) throw new Error("Current and new passwords are required.");
      const auth = await getSessionWithUser();
      const user = ensureUserActive(auth.user);
      if (!user?.password_hash) throw new Error("Password login is not configured for this account.");

      const currentHash = await derivePasswordHash(
        currentPassword,
        user.password_salt,
        user.password_iterations || PASSWORD_ITERATIONS
      );
      if (!safeStringCompare(currentHash, user.password_hash)) {
        throw new Error("Current password is incorrect.");
      }

      const passwordError = validatePassword(newPassword, user.email);
      if (passwordError) throw new Error(passwordError);
      if (safeStringCompare(currentPassword, newPassword)) {
        throw new Error("New password must be different from the current password.");
      }

      const passwordRecord = await makePasswordRecord(newPassword);
      const updated = upsertUserByEmail({ ...user, ...passwordRecord, password_changed_at: nowIso() });
      revokeUserSessions(user.id, auth.session?.id);
      logAuthEvent("password_changed", user.email);
      return sanitizeUser(updated);
    },

    async logout(redirectTo) {
      const token = getStoredToken();
      await revokeSessionByToken(token);
      clearStoredToken();
      if (redirectTo) window.location.href = redirectTo;
    },

    redirectToLogin(redirectTo) {
      const next = encodeURIComponent(redirectTo || window.location.href);
      window.location.href = `/login?next=${next}`;
    },
  },

  users: {
    async listUsers(limit = 200) {
      await assertAdmin();
      return sortItems(readDb().User || [], "-created_date").slice(0, limit).map(sanitizeUser);
    },

    async updateUser(userId, updates = {}) {
      const admin = await assertAdmin();
      const target = getUserById(userId);
      if (!target) throw new Error("User not found.");

      const nextRole = updates.role ?? target.role;
      if (!ROLE_ENUM.has(nextRole)) throw new Error("Invalid role.");
      if (normalizeEmail(target.email) === ADMIN_EMAIL && nextRole !== "admin") {
        throw new Error("Primary admin role cannot be removed.");
      }

      const nextStatus = updates.account_status ?? target.account_status;
      if (!ACCOUNT_STATUS_ENUM.has(nextStatus)) throw new Error("Invalid account status.");
      if (normalizeEmail(target.email) === ADMIN_EMAIL && nextStatus !== "active") {
        throw new Error("Primary admin account cannot be suspended.");
      }

      const updated = upsertUserByEmail({
        ...target,
        role: nextRole,
        account_status: nextStatus,
        full_name: updates.full_name ?? target.full_name,
      });

      if (nextStatus === "suspended") revokeUserSessions(target.id);
      logAuthEvent("admin_user_updated", target.email, { by: admin.email, role: nextRole, status: nextStatus });
      return sanitizeUser(updated);
    },

    async inviteUser(email) {
      await assertAdmin();
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) throw new Error("Invalid email address.");

      const existing = getUserByEmail(normalizedEmail);
      if (existing?.account_status === "active") {
        throw new Error("This user already has an active account.");
      }

      const invited = upsertUserByEmail({
        ...existing,
        email: normalizedEmail,
        full_name: existing?.full_name || normalizedEmail.split("@")[0],
        role: existing?.role || getRoleForEmail(normalizedEmail),
        provider: existing?.provider || "invite",
        account_status: "invited",
        email_verified: false,
      });

      logAuthEvent("user_invited", normalizedEmail);
      return sanitizeUser(invited);
    },
  },

  security: {
    async listAuthEvents(limit = 100) {
      await assertAdmin();
      return (readDb().AuthEvent || []).slice(0, limit);
    },
  },

  ai: {
    async getFarmAdvice(prompt) {
      return { answer: buildFarmAdvice(prompt) };
    },
  },
};
