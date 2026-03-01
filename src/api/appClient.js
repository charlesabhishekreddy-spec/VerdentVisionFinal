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

/* ---- CROP PLANNER KNOWLEDGE BASE ---- */

const CROP_KNOWLEDGE = {
  tomato: {
    aliases: ["tomatoes", "tomato", "roma", "cherry tomato", "beefsteak"],
    weeks: 12,
    soil: "Well-drained, fertile loam with pH 6.0–6.8. Amend with 4–6 inches of compost and balanced pre-plant fertilizer (10-10-10).",
    water: "1–2 inches per week. Water deeply 2–3 times weekly at soil level; increase to near-daily in summer heat. Avoid overhead watering to prevent fungal disease.",
    fertilizer: "Week 1: balanced 10-10-10 at planting. Weeks 4–5: switch to low-N, high-P/K fertilizer to encourage fruiting. Week 8: calcium spray (0.5% calcium chloride) to prevent blossom-end rot.",
    phases: [
      { weeks: [1], stage: "Bed Preparation & Transplanting", activities: ["Prepare planting bed with 4–6 inches of compost tilled in", "Test and adjust soil pH to 6.0–6.8", "Transplant seedlings 18–24 inches apart in rows 3 feet wide", "Install tomato cages or stakes at planting time", "Water in with diluted starter fertilizer (high-phosphorus)"], tips: "Plant on a cloudy day or in the evening to reduce transplant shock. Bury the stem up to the lowest leaves to encourage strong root development." },
      { weeks: [2, 3], stage: "Establishment & Root Development", activities: ["Water deeply 2–3×/week (1 inch per session)", "Mulch 2–3 inches of straw around plants to retain moisture", "Watch for cutworms — use cardboard collars around stems", "Remove any flowers appearing before week 3 to focus energy on roots"], tips: "Consistent moisture is critical in the first 3 weeks. Uneven watering causes blossom-end rot later in the season." },
      { weeks: [4, 5], stage: "Vegetative Growth", activities: ["Side-dress with nitrogen fertilizer (1 tbsp per plant)", "Prune suckers in leaf axils (indeterminate varieties only)", "Check for aphids and whiteflies; apply neem oil if detected", "Tie main stem to stake when plant reaches 12 inches tall"], tips: "Only prune suckers on indeterminate varieties. Determinate tomatoes should NOT be suckered — it reduces yield." },
      { weeks: [6, 7], stage: "Pre-Flowering", activities: ["Switch to low-nitrogen, high-potassium fertilizer", "Inspect lower leaves daily for early blight (yellow-brown spots)", "Ensure 6–8 hours of direct sunlight per day", "Thin to 1–2 strong main stems for larger fruit"], tips: "Drought stress at this stage reduces flower set significantly. Keep soil consistently moist going into flowering." },
      { weeks: [8, 9], stage: "Flowering & Fruit Set", activities: ["Gently shake plants in the morning to aid pollination", "Apply calcium spray (0.5% calcium chloride) to prevent blossom-end rot", "Increase watering to 2 inches per week", "Scout for tomato hornworms; remove by hand or apply Bt if severe"], tips: "Temperatures above 95°F (35°C) or below 55°F (13°C) at night cause flowers to drop. Shade cloth can help in extreme heat." },
      { weeks: [10, 11], stage: "Fruit Development & Ripening", activities: ["Reduce nitrogen; increase potassium to improve flavor and firmness", "Watch for late blight (dark greasy patches on leaves and stems)", "Check for fruit cracking — indicates uneven watering; mulch well", "Remove leaves touching the soil to reduce disease splash"], tips: "Uniform irrigation is the best defence against fruit cracking. Drip irrigation is ideal at this stage." },
      { weeks: [12], stage: "Harvest & Season-End", activities: ["Harvest when fruits are fully colored and slightly soft to the touch", "Pick every 2–3 days to encourage continued production", "Store harvested tomatoes at room temperature — never refrigerate", "Remove and compost (or dispose of diseased) plant material", "Amend soil and plan for crop rotation next season"], tips: "Tomatoes picked slightly early will continue ripening indoors at room temperature. Refrigeration destroys flavor and texture." },
    ],
  },
  corn: {
    aliases: ["corn", "maize", "sweet corn", "field corn", "popcorn"],
    weeks: 14,
    soil: "Deep, well-drained loam or sandy-loam with pH 5.8–7.0. Till 8–10 inches deep. Apply nitrogen-rich amendments based on soil test.",
    water: "1–1.5 inches per week. Most critical periods: silking/tasseling and grain fill — never let plants wilt during these stages.",
    fertilizer: "Pre-plant: 30-30-30 NPK. Side-dress with nitrogen (urea or ammonium nitrate) at knee-high stage (week 4–5). Foliar micronutrients (zinc, boron) at tasseling.",
    phases: [
      { weeks: [1], stage: "Soil Preparation & Planting", activities: ["Till soil 8–10 inches deep and remove previous crop debris", "Apply pre-plant fertilizer (30-30-30 NPK) and incorporate", "Plant seeds 1–1.5 inches deep, 8–12 inches apart in rows", "Space rows 30–36 inches apart for wind pollination", "Plant in blocks of at least 4 rows (not single rows) for good pollination"], tips: "Soil temperature must be at least 50°F (10°C) for germination; ideal is 60–65°F (16–18°C). Cold soils cause uneven emergence." },
      { weeks: [2, 3], stage: "Germination & Emergence", activities: ["Keep soil moist but not waterlogged during germination", "Thin seedlings to 8–10 inches apart once they reach 3–4 inches tall", "Watch for seed corn maggots; check germination rate by day 7–10", "Apply pre-emergent herbicide if weed pressure is anticipated"], tips: "Uniform plant spacing is critical for consistent yields. Crowded plants produce smaller ears." },
      { weeks: [4, 5, 6], stage: "Vegetative Growth (V1–V6)", activities: ["Side-dress with nitrogen fertilizer when plants are knee-high (V4–V5)", "Cultivate between rows to control weeds (most critical at V3–V6)", "Scout for corn rootworm beetles; apply soil insecticide if heavy population", "Water 1–1.5 inches per week; increase in hot, dry weather"], tips: "Each 'V' stage represents one visible leaf collar. V6 means 6 leaves fully emerged. Weed control here has the highest yield impact." },
      { weeks: [7, 8, 9], stage: "Tasseling & Silking", activities: ["Maintain consistent soil moisture — critical for pollination success", "Check that silks are green and moist (dry silks = poor kernel set)", "Scout for corn earworm in silk tips; apply Bt or spinosad if present", "Do NOT cultivate near roots during tasseling — root damage reduces yield"], tips: "Pollen from tassels must reach silks (each silk = one potential kernel). Wind is the pollinator — block planting ensures cross-pollination." },
      { weeks: [10, 11, 12], stage: "Grain Fill (Blister–Dough Stage)", activities: ["Check kernel development by peeling back husks — look for milky fluid", "Maintain irrigation through the dough stage", "Watch for gibberella ear rot (pink mold at tip); improve airflow if detected", "Scout for stalk borers — push on stalks to check for internal damage"], tips: "Kernel moisture drops from ~85% at silking to ~35% at maturity. Grain fill is the most yield-determining stage." },
      { weeks: [13], stage: "Maturity & Pre-Harvest", activities: ["Allow husks to dry and turn brown/tan", "Check for black layer formation at the base of kernels (= physiological maturity)", "Plan harvest equipment, logistics, and storage", "Scout for stalk lodging — harvest early if >10% of stalks are compromised"], tips: "The 'black layer' forms when grain moisture is ~30–35%. For grain storage, wait until moisture is below 15%." },
      { weeks: [14], stage: "Harvest & Post-Harvest", activities: ["Harvest when grain moisture is 14–20% for storage or when milky for sweet corn", "Set combine/harvester to minimize kernel cracking and grain loss", "Test grain for mycotoxins (aflatoxin) if drought stress occurred", "Till under crop residue or manage as mulch; apply potassium to replenish"], tips: "Store grain corn below 15% moisture and below 50°F to prevent mold and mycotoxin development." },
    ],
  },
  wheat: {
    aliases: ["wheat", "winter wheat", "spring wheat", "hard wheat", "soft wheat"],
    weeks: 17,
    soil: "Well-drained loam or clay-loam with pH 6.0–7.0. Apply phosphorus and potassium pre-plant based on soil test. Avoid compacted soils.",
    water: "15–20 inches total over the season. Critical periods: tillering and heading. Supplement with irrigation in dry springs if available.",
    fertilizer: "Pre-plant: phosphorus and potassium based on soil test. Spring topdress: split nitrogen at green-up. Foliar sulfur at flag-leaf stage for protein quality.",
    phases: [
      { weeks: [1, 2], stage: "Seedbed Preparation & Planting", activities: ["Prepare firm, well-drained seedbed (avoid fluffy, freshly tilled soil)", "Apply pre-plant P and K fertilizer based on soil test results", "Drill seed at 1–1.5 inch depth, 60–120 lbs/acre or 4–8 lbs/1000 sq ft", "Calibrate seeder for target population (1.0–1.4 million plants/acre)", "Treat seed with fungicide if smut or bunt disease is present in the area"], tips: "Avoid planting too early — early planting increases Hessian fly and aphid (Barley Yellow Dwarf virus vector) pressure significantly." },
      { weeks: [3, 4, 5], stage: "Germination & Tillering", activities: ["Scout for Hessian fly adults (small flies near base of plants)", "Scout for aphids which can vector Barley Yellow Dwarf Virus", "Control winter annual weeds (cheatgrass, wild garlic) before they compete", "Monitor for powdery mildew in humid conditions; apply fungicide if widespread"], tips: "Tillering determines yield potential. Each healthy tiller can produce a head. Good establishment before dormancy is essential." },
      { weeks: [6, 7, 8], stage: "Winter Dormancy (Winter Wheat)", activities: ["Ensure adequate ground cover to prevent frost heaving", "Monitor for ice sheeting over plants — break up if possible to allow gas exchange", "Check plant survival after severe cold events (walk fields in early spring)", "Finalize spring fertility plan based on fall tiller counts and soil test"], tips: "Winter wheat requires 6–8 weeks of vernalization (temperatures below 40°F) to transition from vegetative to reproductive growth." },
      { weeks: [9, 10], stage: "Spring Green-Up & Jointing", activities: ["Apply spring nitrogen topdress at green-up (split into 2 applications if rate is high)", "Scout intensively for aphids, Hessian fly, and early foliar diseases", "Apply herbicide for winter broadleaf weeds before the jointing stage", "Evaluate stand — consider replanting if fewer than 3 plants per square foot"], tips: "Spring nitrogen application timing and rate is the single most impactful management decision for winter wheat yield." },
      { weeks: [11, 12], stage: "Heading & Anthesis (Flowering)", activities: ["Scout daily for powdery mildew, stripe rust, and leaf rust", "Apply fungicide at Feekes 10.5 (full head emergence) if Fusarium scab risk is high", "Monitor for aphids in the flag leaf canopy; treat if >10–15 per tiller", "Irrigate if rainfall has been less than 1 inch in the past 10 days"], tips: "Fusarium head blight (scab) is most damaging at anthesis in warm, wet conditions. Prothioconazole or metconazole fungicides are most effective." },
      { weeks: [13, 14, 15], stage: "Grain Fill & Maturation", activities: ["Maintain moisture through the soft-dough stage", "Scout for aphids in the canopy — still capable of yield loss through this stage", "Check for ergot (purple-black sclerotia replacing kernels in the head)", "Monitor for lodging risk, especially in heavy-yield varieties"], tips: "Grain moisture drops rapidly in the final 2 weeks before harvest. Plan harvest logistics and equipment in advance." },
      { weeks: [16, 17], stage: "Harvest & Post-Harvest", activities: ["Harvest when grain moisture is 13–14% (dry enough for long-term storage)", "Set combine header and threshing for minimum grain damage and loss", "Manage straw residue — incorporate or manage as mulch for the next crop", "Test grain for protein content, test weight, and falling number for quality assessment"], tips: "Delaying harvest after physiological maturity by even a few days in wet weather can cause significant quality losses (sprouting, mycotoxins)." },
    ],
  },
  soybean: {
    aliases: ["soybean", "soybeans", "soya", "soya bean", "soya beans"],
    weeks: 16,
    soil: "Well-drained loam with pH 6.0–6.8. Soybeans fix their own nitrogen — do NOT apply heavy pre-plant N fertilizer. Inoculate seed with Bradyrhizobium inoculant.",
    water: "18–25 inches total. Most critical: pod fill (R3–R6 stages). Yield loss is severe from drought during pod fill.",
    fertilizer: "Inoculate seed with rhizobium inoculant. Apply phosphorus and potassium pre-plant. Sulfur application may benefit high-yield environments.",
    phases: [
      { weeks: [1], stage: "Seed Inoculation & Planting", activities: ["Inoculate seed with Bradyrhizobium japonicum inoculant (especially on first-time fields)", "Apply phosphorus and potassium fertilizer based on soil test", "Plant at 1–1.5 inch depth once soil temperature reaches 50°F (10°C)", "Target population of 140,000–160,000 plants/acre (adjust for row width)", "Row spacing 15–30 inches; narrow rows boost early-season canopy closure"], tips: "Do NOT apply high nitrogen fertilizer — soybeans fix atmospheric nitrogen through root nodules. Excess N suppresses nodulation." },
      { weeks: [2, 3, 4], stage: "Emergence & Vegetative Growth", activities: ["Check emergence uniformity; expect 75–85% emergence under good conditions", "Scout for bean leaf beetles and soybean aphids early", "Control broadleaf and grass weeds — critical through V3 stage", "Thin or evaluate plant population if emergence was uneven"], tips: "Soybeans have strong yield compensation ability — fewer plants per acre can produce more pods per plant to compensate." },
      { weeks: [5, 6, 7], stage: "Late Vegetative & Branching", activities: ["Scout weekly for soybean aphids (threshold: 250 aphids/plant on >80% of plants)", "Monitor for sudden death syndrome (SDS) and brown stem rot in wet soils", "Control any remaining weeds before canopy closure", "Watch for spider mites in hot, dry conditions"], tips: "Once the canopy closes (V6–V8), weed competition is suppressed naturally. Focus scouting on insects and disease." },
      { weeks: [8, 9, 10], stage: "Flowering (R1–R2)", activities: ["Protect pollinators — minimize insecticide applications during bloom", "Scout for bean pod mottle virus (ragged, mottled leaves)", "Apply foliar fungicide if white mold or frogeye leaf spot are present", "Ensure adequate moisture — drought stress during bloom reduces pod set"], tips: "Soybeans are self-pollinating but benefit from insect activity. Each flower that sets a pod represents yield potential." },
      { weeks: [11, 12, 13], stage: "Pod Fill (R3–R6)", activities: ["Maintain irrigation if rainfall is insufficient — this is the highest-yield-impact period", "Scout for stink bugs which damage developing seeds", "Apply fungicide for foliar diseases if canopy is wet and disease is present", "Monitor for late-season aphid flares"], tips: "Yield is almost entirely determined during pod fill. A week of drought stress at R5 (bean fill) can reduce yield by 10–20%." },
      { weeks: [14, 15], stage: "Maturation & Dry-Down", activities: ["Allow pods to turn brown and seeds to rattle — indicates maturity", "Scout for phytophthora root rot or sudden death syndrome symptoms", "Plan harvest logistics and equipment preparation", "Evaluate desiccant application if uneven maturity is a concern (commercial scale)"], tips: "Harvest when seed moisture is 13–15%. Early harvest at high moisture requires artificial drying but reduces harvest losses from pod shatter." },
      { weeks: [16], stage: "Harvest", activities: ["Harvest when moisture is 13–15% to minimize pod shatter losses", "Set combine for minimum gathering losses and cylinder/concave damage", "Evaluate yield monitor data across the field for management zones", "Apply soil amendments as needed; plan crop rotation for next season"], tips: "Soybean harvest losses can easily be 5–10% of yield. Slow down at field edges and adjust settings often." },
    ],
  },
  potato: {
    aliases: ["potato", "potatoes", "russet", "red potato", "yukon gold"],
    weeks: 16,
    soil: "Loose, well-drained sandy-loam to loam with pH 5.0–6.0. High pH causes scab disease. Hill rows for tuber development. Avoid compacted soils.",
    water: "1–2 inches per week. Most critical: tuber initiation and bulking. Maintain even moisture — uneven irrigation causes hollow heart and growth cracks.",
    fertilizer: "Pre-plant: high phosphorus starter. At-planting nitrogen band. Side-dress additional nitrogen and potassium at hilling. Foliar calcium during bulking.",
    phases: [
      { weeks: [1, 2], stage: "Seed Piece Preparation & Planting", activities: ["Cut certified seed pieces to 1.5–2 oz, each with 1–2 eyes", "Allow cut pieces to suberize (heal) for 2–3 days before planting", "Plant 3–4 inches deep in loosened soil, 10–12 inches apart in rows", "Space rows 30–36 inches apart for hilling access", "Apply pre-plant herbicide and incorporate starter fertilizer"], tips: "Use certified disease-free seed potatoes. Never plant grocery store potatoes — they may carry diseases and are often chemically sprouted." },
      { weeks: [3, 4], stage: "Emergence & Early Growth", activities: ["Monitor for stand establishment — expect emergence in 2–3 weeks", "Scout for wireworms and Colorado potato beetle eggs", "Control weeds early — potatoes are poor weed competitors", "Apply foliar nitrogen if early growth appears stunted"], tips: "Early weed control is critical — potatoes do not shade out weeds well until hilling." },
      { weeks: [5, 6], stage: "Vegetative Growth & Hilling", activities: ["Hill soil 6–8 inches up around stems when plants are 8–10 inches tall", "Colorado potato beetle scouting — treat if >1 adult/plant (use Bt or spinosad)", "Apply additional nitrogen and potassium during hilling", "Watch for early blight (brown concentric rings on lower leaves)"], tips: "Hilling is essential — exposed tubers will turn green (solanine) and become toxic. Hill at least twice during the season." },
      { weeks: [7, 8, 9], stage: "Tuber Initiation", activities: ["Maintain even, consistent soil moisture — critical for uniform tuber set", "Scout for late blight (dark water-soaked lesions on leaves)", "Apply fungicide if late blight is present in the region", "Avoid excessive nitrogen after tuber initiation — it delays maturity"], tips: "Tuber initiation occurs on stolons just below the soil surface. Cool nights (50–65°F) and long days promote tuber set." },
      { weeks: [10, 11, 12], stage: "Tuber Bulking", activities: ["Maintain 1.5–2 inches of water per week — most critical period for yield", "Apply foliar calcium to reduce internal defects (hollow heart)", "Scout for late blight; apply protectant fungicide on a regular schedule", "Avoid mechanical damage to tubers during cultivation"], tips: "Tubers gain 75% of their final weight during bulking. Drought stress here dramatically reduces yield and quality." },
      { weeks: [13, 14], stage: "Maturation & Vine Kill", activities: ["Reduce irrigation gradually to allow skin set", "Desiccate or mechanically kill vines 10–14 days before harvest (commercial scale)", "Test tuber skin set — rub thumb across skin; set skin does not slip", "Scout for late blight in vines — infected vines can spread rot to tubers"], tips: "Skin set is critical for harvest quality and storage. Harvest before vine kill risks skinning injuries that invite rot." },
      { weeks: [15, 16], stage: "Harvest & Curing", activities: ["Harvest when soil temperature is below 65°F to reduce bruising", "Set digger or harvester to minimize mechanical damage", "Cure potatoes at 50–60°F and 85–90% humidity for 2 weeks to heal skin", "Sort and discard diseased, damaged, or green tubers before storage"], tips: "Potatoes harvested in cool soils bruise less. Never store potatoes with apples or onions — ethylene gas causes sprouting." },
    ],
  },
  lettuce: {
    aliases: ["lettuce", "iceberg", "romaine", "leaf lettuce", "butterhead", "salad"],
    weeks: 7,
    soil: "Loose, well-drained loam or sandy-loam with pH 6.0–7.0. Rich in nitrogen. Raised beds improve drainage and root growth.",
    water: "1–1.5 inches per week. Lettuce is shallow-rooted — keep top 6 inches consistently moist. Overhead irrigation is fine for this crop.",
    fertilizer: "Pre-plant: nitrogen-rich fertilizer (21-0-0 or composted manure). Side-dress with diluted liquid nitrogen at week 3 if growth is slow.",
    phases: [
      { weeks: [1], stage: "Bed Preparation & Seeding", activities: ["Prepare fine, loose seedbed — lettuce needs good seed-soil contact", "Amend soil with nitrogen-rich compost (3–4 inches)", "Sow seed 1/8 inch deep (do not bury too deep — needs light to germinate)", "Space rows 12–18 inches apart; seed in rows or scatter in wide beds", "Water gently after seeding — avoid displacing seeds"], tips: "Lettuce seed needs light for germination — do not bury deeply. Germination fails at soil temperatures above 85°F. Plant in spring or fall." },
      { weeks: [2, 3], stage: "Germination & Thinning", activities: ["Keep soil consistently moist for germination (expect 7–10 days)", "Thin seedlings to 8–12 inches apart once they have 2 true leaves", "Scout for cutworms and slugs — apply diatomaceous earth if present", "Weed carefully between plants — lettuces are easily out-competed"], tips: "Thinning is critical — crowded lettuce does not form heads and bolts quickly. Use thinnings as micro-greens." },
      { weeks: [4, 5], stage: "Leaf Development & Head Formation", activities: ["Side-dress with liquid nitrogen fertilizer if leaves appear pale yellow", "Water consistently — lettuce wilts quickly and does not recover well", "Protect from heat if temperatures exceed 80°F (shade cloth)", "Scout for aphids (check undersides of leaves) and thrips"], tips: "Heat causes bolting (premature flowering) which makes lettuce bitter. Cool, consistent temperatures produce the best quality." },
      { weeks: [6], stage: "Head Maturity", activities: ["Check head firmness — press on top of head; firm = ready to harvest", "Reduce watering slightly in the final week to concentrate flavor", "Harvest romaine and butterhead types when heads reach full size", "Loose-leaf types can be harvested leaf-by-leaf from week 4 onward"], tips: "Harvest in the morning for the best flavor and shelf-life. Lettuce stored at near-freezing (34°F) lasts 2–3 weeks." },
      { weeks: [7], stage: "Final Harvest & Succession Planning", activities: ["Harvest all remaining plants before they bolt in heat", "Remove all plant debris to prevent disease carryover", "Re-amend soil with compost for the next succession planting", "Plan next planting date for 2–3 weeks later for continuous harvest"], tips: "Plant new seeds every 2–3 weeks for continuous harvests. Lettuce is ideal for quick succession cropping." },
    ],
  },
  carrot: {
    aliases: ["carrot", "carrots", "baby carrot", "nantes", "chantenay"],
    weeks: 11,
    soil: "Deep, loose, stone-free sandy-loam with pH 6.0–6.8. Avoid heavy clay or compacted soils — causes forked, stunted roots. Till 12 inches deep.",
    water: "1 inch per week. Consistent moisture is critical — alternating wet and dry causes cracking and forking. Drip irrigation is ideal.",
    fertilizer: "Pre-plant: low-nitrogen, high-phosphorus and potassium (avoid excess N which promotes tops over roots). Side-dress with potassium at week 5 for root development.",
    phases: [
      { weeks: [1, 2], stage: "Seedbed Preparation & Seeding", activities: ["Till 12 inches deep to remove rocks, clods, and debris", "Apply pre-plant fertilizer (low N, high P/K)", "Sow seeds 1/4 inch deep in rows 12–18 inches apart", "Cover with fine soil and firm gently for seed-soil contact", "Water gently — avoid crusting which prevents emergence"], tips: "Carrot seeds are tiny and slow to germinate (14–21 days). Mark rows and consider inter-seeding with fast-germinating radishes as row markers." },
      { weeks: [3, 4], stage: "Germination & Thinning", activities: ["Keep seedbed consistently moist during germination (14–21 days)", "Thin seedlings to 2–3 inches apart once they reach 2 inches tall", "Weed carefully — young carrots are weak competitors", "Watch for carrot rust fly maggots; use row covers if detected"], tips: "Thinning is the most important and most neglected step. Un-thinned carrots produce forked, unusable roots." },
      { weeks: [5, 6, 7], stage: "Active Root Development", activities: ["Maintain consistent moisture — 1 inch per week", "Apply potassium side-dress to support root development", "Continue weed control — hand weed or use shallow cultivation only", "Scout for leafhoppers and aphids; use row covers if pressure is high"], tips: "Avoid high nitrogen during root development — it promotes leafy tops at the expense of roots." },
      { weeks: [8, 9], stage: "Root Maturation & Color Development", activities: ["Reduce irrigation slightly to concentrate sugars in roots", "Check root shoulder color and size by exposing top of roots", "Continue scouting for carrot weevil and aster yellows disease", "Harvest baby carrots can begin at this stage"], tips: "Cool temperatures (below 60°F) during the final weeks dramatically improve sweetness and color intensity in carrots." },
      { weeks: [10, 11], stage: "Harvest & Storage", activities: ["Harvest when roots are 3/4 to 1 inch in diameter at the shoulder", "Loosen soil with fork before pulling to avoid root breakage", "Twist off tops immediately after harvest to prevent moisture loss", "Store in cool, humid conditions (34–38°F, 95% humidity) for up to 6 months"], tips: "Carrots left in the ground after heavy frost can be very sweet and can remain there until needed in mild climates." },
    ],
  },
  pepper: {
    aliases: ["pepper", "peppers", "bell pepper", "jalapeño", "chili", "chilli", "capsicum"],
    weeks: 14,
    soil: "Well-drained, fertile loam with pH 6.0–6.8. Avoid waterlogged soils. Amend with compost. Requires warm soil (above 65°F) for strong establishment.",
    water: "1–2 inches per week. Deep, infrequent watering encourages deep roots. Reduce slightly when fruit is setting. Avoid wet foliage.",
    fertilizer: "At planting: balanced 10-10-10. Week 4: nitrogen side-dress. When fruit sets: switch to high-K, low-N formula. Apply calcium throughout to prevent blossom-end rot.",
    phases: [
      { weeks: [1], stage: "Transplanting & Establishment", activities: ["Transplant seedlings after last frost when soil is above 65°F", "Space plants 18 inches apart in rows 24 inches wide", "Water in with high-phosphorus starter fertilizer", "Mulch with 2–3 inches of straw to retain soil warmth", "Use floating row covers if late cold is forecast"], tips: "Peppers are extremely sensitive to cold — a single frost kills them. Transplant only after the last frost date is reliably past." },
      { weeks: [2, 3, 4], stage: "Establishment & Early Vegetative Growth", activities: ["Water consistently 1–2 inches per week", "Apply first nitrogen side-dress at 3 weeks", "Remove first flowers to encourage vegetative growth and a stronger plant", "Scout for aphids and mites — apply neem oil if detected"], tips: "Removing the first flowers seems counter-intuitive but results in significantly larger, more productive plants." },
      { weeks: [5, 6, 7], stage: "Vegetative Growth & Branching", activities: ["Continue nitrogen fertilization every 2 weeks", "Stake or cage larger varieties to prevent breakage", "Control weeds — peppers are poor competitors against established weeds", "Watch for bacterial leaf spot (water-soaked spots on leaves)"], tips: "Peppers benefit from consistent temperatures between 70–85°F during the day and above 60°F at night for optimal growth." },
      { weeks: [8, 9], stage: "Flowering & Fruit Set", activities: ["Switch to high-K, low-N fertilizer when flowering begins", "Apply calcium spray to prevent blossom-end rot", "Scout for thrips which can damage flowers and spread viruses", "Maintain consistent moisture — drought stress during flowering drops blossoms"], tips: "High temperatures (above 95°F) and low temperatures (below 60°F) both cause flower drop. Shade cloth helps in extreme heat." },
      { weeks: [10, 11, 12], stage: "Fruit Development & Color Change", activities: ["Continue consistent irrigation; reduce slightly to intensify flavor", "Apply foliar calcium every 2 weeks to prevent blossom-end rot", "Scout for pepper weevil and corn earworm in fruit", "Begin harvesting green peppers if desired — promotes continued production"], tips: "All peppers start green and transition to their final color (red, yellow, orange) with time on the plant. Green harvest extends the season." },
      { weeks: [13, 14], stage: "Peak Harvest & Season-End", activities: ["Harvest continuously every 3–4 days to maximize production", "Allow desired fruits to fully ripen to final color for maximum nutrition", "Watch for Phytophthora root rot in wet soils at season-end", "Prepare soil for next season — amend and rotate crops"], tips: "Peppers can continue producing until the first frost. Bring potted peppers indoors for a second season in mild climates." },
    ],
  },
  cucumber: {
    aliases: ["cucumber", "cucumbers", "pickling cucumber", "english cucumber", "slicing cucumber"],
    weeks: 10,
    soil: "Well-drained, fertile loam with pH 6.0–7.0. Warm soil required (above 60°F). Avoid waterlogged areas. Amend with compost.",
    water: "1–2 inches per week. Consistent moisture is critical — irregular watering causes bitterness and fruit curling. Drip irrigation preferred.",
    fertilizer: "At planting: balanced fertilizer. Week 3: nitrogen side-dress when vines begin to run. When fruit sets: high-K fertilizer. Avoid excessive nitrogen which promotes vines over fruit.",
    phases: [
      { weeks: [1, 2], stage: "Planting & Germination", activities: ["Plant seeds 1 inch deep when soil temperature is above 60°F", "Space hills 3 feet apart with 4–5 seeds per hill", "Thin to 2–3 plants per hill after emergence", "Install trellis for vining types (saves space and reduces disease)", "Water in with diluted starter fertilizer"], tips: "Cucumbers are fast-growing warm-season crops. Direct seeding is preferred — they do not transplant well due to sensitive taproots." },
      { weeks: [3, 4], stage: "Vine Establishment", activities: ["Train vines to trellis as they begin to run", "Apply nitrogen side-dress fertilizer when vines are 6–8 inches long", "Scout for cucumber beetle (striped or spotted) — vector for bacterial wilt", "Control weeds while plants are small"], tips: "Cucumber beetles are the most serious pest. Bacterial wilt they transmit kills plants quickly. Row covers early; remove at flowering." },
      { weeks: [5, 6], stage: "Flowering & Pollination", activities: ["Remove row covers when first female flowers appear (flowers with tiny cucumber behind them)", "Ensure adequate bee presence for pollination", "Scout for powdery mildew (white powder on leaves)", "Switch to high-K fertilizer when flowering begins"], tips: "Male flowers appear first; female flowers (with tiny cucumber at base) come 1–2 weeks later. Poor pollination causes misshapen fruit." },
      { weeks: [7, 8, 9], stage: "Fruit Development & Harvest", activities: ["Harvest slicing cucumbers at 6–8 inches long; pickling types at 2–4 inches", "Harvest every 2–3 days — leaving overripe fruits signals the plant to stop producing", "Apply foliar fungicide if powdery mildew spreads to more than 20% of leaf area", "Maintain consistent irrigation to prevent bitterness"], tips: "Overripe cucumbers left on the vine tell the plant it has successfully reproduced and it stops producing. Harvest frequently!" },
      { weeks: [10], stage: "Late Season & Final Harvest", activities: ["Harvest all remaining cucumbers before vines die back", "Remove and compost vines to reduce disease inoculum", "Clean trellis and garden beds for next season", "Plan for crop rotation — do not plant cucurbits in same spot for 2–3 years"], tips: "Cucumber plants naturally decline after 8–10 weeks. Plant a second succession crop 4–6 weeks after the first for extended harvest." },
    ],
  },
};

/**
 * Generate a realistic week-by-week crop timeline from the LLM prompt.
 * @param {string} prompt
 */
const buildCropTimeline = (prompt = "") => {
  // Extract crop name from "crop timeline for <cropName> starting from"
  const cropMatch = prompt.match(/crop timeline for (.+?) starting from/i);
  const cropRaw = cropMatch ? cropMatch[1].trim().toLowerCase() : "";

  // Extract planting date
  const dateMatch = prompt.match(/starting from (\d{4}-\d{2}-\d{2})/i);
  const plantingDateStr = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
  const plantingDate = new Date(`${plantingDateStr}T12:00:00`);

  // Find best matching crop using word-boundary matching to avoid false positives
  const wordBoundaryMatch = (text, word) => {
    const re = new RegExp(`(?:^|\\s)${word}(?:\\s|s\\b|es\\b|$)`, "i");
    return re.test(text);
  };
  let cropData = null;
  let matchedName = cropRaw || "Crop";
  for (const [, data] of Object.entries(CROP_KNOWLEDGE)) {
    if (data.aliases.some((alias) => wordBoundaryMatch(cropRaw, alias) || wordBoundaryMatch(alias, cropRaw))) {
      cropData = data;
      break;
    }
  }
  // Fall back to tomato data as a safe default if no crop is recognized
  if (!cropData) cropData = CROP_KNOWLEDGE.tomato;

  // Use the original crop name from the prompt if available (better display)
  const displayName = cropMatch
    ? cropMatch[1]
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : matchedName;

  // Build flat week-by-week timeline from phases
  const timeline = [];
  for (const phase of cropData.phases) {
    for (const weekNum of phase.weeks) {
      timeline.push({
        week: weekNum,
        stage: phase.stage,
        activities: phase.activities,
        tips: phase.tips,
      });
    }
  }

  // Calculate expected harvest date
  const harvestDate = new Date(plantingDate);
  harvestDate.setDate(harvestDate.getDate() + cropData.weeks * 7);

  return {
    crop_name: displayName,
    total_weeks: cropData.weeks,
    expected_harvest_date: harvestDate.toISOString().slice(0, 10),
    timeline,
    watering_schedule: cropData.water,
    fertilizer_plan: cropData.fertilizer,
    soil_requirements: cropData.soil,
  };
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

        // Crop Planner requests expect a structured timeline object
        const looksLikeCropPlan =
          p.includes("crop timeline") ||
          p.includes("week-by-week crop") ||
          p.includes("crop plan") ||
          (response_json_schema?.properties?.timeline && response_json_schema?.properties?.total_weeks);

        if (looksLikeCropPlan) {
          return buildCropTimeline(prompt);
        }

        // Weather widgets expect structured object
        const looksLikeWeather =
          response_json_schema?.properties?.current ||
          p.includes("weather") ||
          p.includes("forecast") ||
          p.includes("real-time weather");

        if (looksLikeWeather) {
          const loc = "Your area";
          return demoWeather(loc);
        }

        // Chat and other pages expect a string
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
