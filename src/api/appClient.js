const STORAGE_KEY = 'verdent_vision_db_v3';
const SESSION_KEY = 'verdent_vision_session_v2';
const ADMIN_EMAIL = 'charlesabhishekreddy@gmail.com';

const nowIso = () => new Date().toISOString();
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const getRoleForEmail = (email = '') => normalizeEmail(email) === ADMIN_EMAIL ? 'admin' : 'user';

const seedDatabase = () => ({
  User: [
    {
      id: 'u-admin',
      full_name: 'Charles Admin',
      email: ADMIN_EMAIL,
      role: 'admin',
      provider: 'google',
      farm_location: 'Main Farm',
      created_date: nowIso(),
    },
  ],
  AuthEvent: [],
  ActivityLog: [],
  PlantDatabase: [
    { id: 'p1', common_name: 'Tomato', scientific_name: 'Solanum lycopersicum', common_diseases: ['Early Blight', 'Late Blight'], common_pests: ['Aphids'], created_date: nowIso() },
    { id: 'p2', common_name: 'Potato', scientific_name: 'Solanum tuberosum', common_diseases: ['Scab'], common_pests: ['Beetle'], created_date: nowIso() },
  ],
  PlantDiagnosis: [], Treatment: [], Task: [], PestPrediction: [], WeatherLog: [], OutbreakReport: [], DiagnosisFeedback: [], ForumPost: [], CropPlan: [],
});

const readDb = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = seedDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedDatabase();
  }
};
const writeDb = (db) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

const sortItems = (items, sortBy = '') => {
  if (!sortBy) return [...items];
  const desc = sortBy.startsWith('-');
  const field = desc ? sortBy.slice(1) : sortBy;
  return [...items].sort((a, b) => {
    const av = a?.[field]; const bv = b?.[field];
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
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
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
  async list(sortBy = '', limit) {
    const items = sortItems(readDb()[entityName] || [], sortBy);
    return Number.isFinite(limit) ? items.slice(0, limit) : items;
  },
  async filter(criteria = {}, sortBy = '', limit) {
    const filtered = (readDb()[entityName] || []).filter((item) => Object.entries(criteria).every(([k, v]) => item?.[k] === v));
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

const getSession = () => {
  // Prefer sessionStorage (non-persistent) over localStorage (persistent)
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

const setSession = (user, { remember = true } = {}) => {
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

const buildFarmAdvice = (prompt = '') => {
  const lower = prompt.toLowerCase();
  if (lower.includes('tomato') && lower.includes('blight')) return 'For blight on tomatoes, remove infected leaves, improve airflow, and consider a copper-based fungicide.';
  if (lower.includes('aphid')) return 'For aphids, spray with neem oil, introduce ladybugs, and avoid excessive nitrogen fertilizer.';
  return 'Maintain good soil health, monitor your crops regularly, and act early when symptoms appear.';
};

const entities = new Proxy({}, { get: (_t, prop) => entityApi(prop) });

export const appClient = {
  entities,
  auth: {
    async me() {
      const session = getSession();
      if (session) return session;
      throw Object.assign(new Error('Authentication required'), { status: 401 });
    },
    async signInWithGoogle(profile) {
      const user = upsertUserByEmail({
        full_name: profile.name,
        email: profile.email,
        avatar_url: profile.picture,
        provider: 'google',
      });
      setSession(user, { remember: true });
      logAuthEvent('google_login', profile.email);
      return sanitizeUser(user);
    },
    async registerWithEmail({ fullName, email, password, accountType = 'attendee', remember = true }) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !password || password.length < 8) {
        throw new Error('Use a valid email and password with at least 8 characters.');
      }
      if (getStoredUserByEmail(normalizedEmail)?.password_hash) {
        throw new Error('An account already exists with this email. Please sign in.');
      }
      const password_hash = await hashPassword(password);
      const user = upsertUserByEmail({
        full_name: fullName,
        email: normalizedEmail,
        provider: 'email',
        account_type: accountType,
        password_hash,
      });
      setSession(user, { remember });
      logAuthEvent('register', normalizedEmail);
      return sanitizeUser(user);
    },
    async signInWithEmail({ email, password, remember = true }) {
      const user = getStoredUserByEmail(email);
      if (!user?.password_hash) throw new Error('No email/password account found. Please sign up first.');
      const attemptedHash = await hashPassword(password);
      if (attemptedHash !== user.password_hash) throw new Error('Invalid email or password.');
      const updated = upsertUserByEmail({ ...user, last_login_date: nowIso() });
      setSession(updated, { remember });
      logAuthEvent('email_login', email);
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
      return sanitizeUser(upsertUserByEmail({ email, full_name: email.split('@')[0], role: 'user', provider: 'invite' }));
    },
  },
  ai: {
    async getFarmAdvice(prompt) {
      return { answer: buildFarmAdvice(prompt) };
    },
  },
};