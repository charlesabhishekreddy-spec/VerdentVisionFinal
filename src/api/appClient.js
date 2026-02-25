const STORAGE_KEY = "verdent_vision_db_v3";
const SESSION_KEY = "verdent_vision_session_v2";
const ADMIN_EMAIL = "charlesabhishekreddy@gmail.com";

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

/* ================= LOCAL DB ================= */

const seedDatabase = () => ({
  User: [
    {
      id: "u-admin",
      full_name: "Charles Admin",
      email: ADMIN_EMAIL,
      role: "admin",
      provider: "google",
      farm_location: "Main Farm",
      created_date: nowIso(),
    },
  ],
  AuthEvent: [],
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
    parsed.DeviceSessions = parsed.DeviceSessions || [];
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
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const logAuthEvent = (type, email) => {
  const db = readDb();
  db.AuthEvent = db.AuthEvent || [];
  db.AuthEvent.push({ id: makeId(), type, email: normalizeEmail(email), created_date: nowIso() });
  writeDb(db);
};

const hashPassword = async (password) => {
  const payload = new TextEncoder().encode(`verdent:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};

const upsertUserByEmail = (profile) => {
  const db = readDb();
  const email = normalizeEmail(profile.email);
  const role = getRoleForEmail(email);
  const found = (db.User || []).find((u) => normalizeEmail(u.email) === email);

  const user = found
    ? { ...found, ...profile, email, role, updated_date: nowIso() }
    : { id: makeId(), created_date: nowIso(), role, email, ...profile };

  db.User = [user, ...(db.User || []).filter((u) => normalizeEmail(u.email) !== email)];
  writeDb(db);
  return user;
};

const getStoredUserByEmail = (email) => {
  const db = readDb();
  return (db.User || []).find((u) => normalizeEmail(u.email) === normalizeEmail(email));
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

const getSession = () => {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  try {
    const l = localStorage.getItem(SESSION_KEY);
    if (l) return JSON.parse(l);
  } catch {}
  return null;
};

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

const setSession = (user, { remember = true } = {}) => {
  if (user?.email) touchDeviceSession(user.email);

  const safe = JSON.stringify(sanitizeUser(user));
  if (remember) {
    try { localStorage.setItem(SESSION_KEY, safe); } catch {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  } else {
    try { sessionStorage.setItem(SESSION_KEY, safe); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
};

const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
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
      async InvokeLLM({ prompt = "", response_json_schema } = {}) {
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
      const db = readDb();
      const normalized = normalizeEmail(email);
      const currentDevice = getDeviceId();

      return (db.DeviceSessions || [])
        .filter((s) => normalizeEmail(s.user_email) === normalized)
        .map((s) => ({ ...s, is_current_device: s.device_id === currentDevice }));
    },

    async logoutOtherDevices(email) {
      const db = readDb();
      const normalized = normalizeEmail(email);
      const currentDevice = getDeviceId();

      db.DeviceSessions = (db.DeviceSessions || []).filter((s) => {
        if (normalizeEmail(s.user_email) !== normalized) return true;
        return s.device_id === currentDevice;
      });

      writeDb(db);
      return true;
    },
  },

  /* ================= AUTH ================= */
  auth: {
    async me() {
      const session = getSession();
      if (session) {
        if (session?.email) touchDeviceSession(session.email);
        return session;
      }
      throw Object.assign(new Error("Authentication required"), { status: 401 });
    },

    async signInWithGoogle(profile, { remember = true } = {}) {
      if (!profile?.email) throw new Error("Missing email from provider");

      const user = upsertUserByEmail({
        full_name: profile.name,
        email: profile.email,
        avatar_url: profile.picture,
        provider: profile.provider || "google",
      });

      setSession(user, { remember });
      logAuthEvent(`${user.provider}_login`, profile.email);
      return sanitizeUser(user);
    },

    async registerWithEmail({ fullName, email, password, accountType = "attendee", remember = true }) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !password || password.length < 8) {
        throw new Error("Use a valid email and password with at least 8 characters.");
      }
      if (getStoredUserByEmail(normalizedEmail)?.password_hash) {
        throw new Error("An account already exists with this email. Please sign in.");
      }
      const password_hash = await hashPassword(password);
      const user = upsertUserByEmail({
        full_name: fullName,
        email: normalizedEmail,
        provider: "email",
        account_type: accountType,
        password_hash,
      });
      setSession(user, { remember });
      logAuthEvent("register", normalizedEmail);
      return sanitizeUser(user);
    },

    async signInWithEmail({ email, password, remember = true }) {
      const user = getStoredUserByEmail(email);
      if (!user?.password_hash) throw new Error("No email/password account found. Please sign up first.");
      const attemptedHash = await hashPassword(password);
      if (attemptedHash !== user.password_hash) throw new Error("Invalid email or password.");
      const updated = upsertUserByEmail({ ...user, last_login_date: nowIso() });
      setSession(updated, { remember });
      logAuthEvent("email_login", email);
      return sanitizeUser(updated);
    },

    async updateMe(updateData) {
      const current = await this.me();
      const user = upsertUserByEmail({ ...current, ...updateData });
      setSession(user, { remember: true });
      return sanitizeUser(user);
    },

    logout(redirectTo) {
      clearSession();
      if (redirectTo) window.location.href = redirectTo;
    },

    redirectToLogin(redirectTo) {
      const next = encodeURIComponent(redirectTo || window.location.href);
      window.location.href = `/login?next=${next}`;
    },
  },

  users: {
    async inviteUser(email) {
      return sanitizeUser(upsertUserByEmail({ email, full_name: email.split("@")[0], role: "user", provider: "invite" }));
    },
  },

  ai: {
    async getFarmAdvice(prompt) {
      return { answer: buildFarmAdvice(prompt) };
    },
  },
};