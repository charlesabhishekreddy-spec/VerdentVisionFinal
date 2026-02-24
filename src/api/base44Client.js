const STORAGE_KEY = 'verdent_vision_local_db_v1';

const nowIso = () => new Date().toISOString();

const makeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const seedDatabase = () => ({
  User: [{ id: 'u-admin', full_name: 'Demo Admin', email: 'admin@verdent.local', role: 'admin', farm_location: 'Demo Farm', created_date: nowIso() }],
  PlantDatabase: [
    {
      id: 'plant-1',
      common_name: 'Tomato',
      scientific_name: 'Solanum lycopersicum',
      common_diseases: ['Early Blight', 'Late Blight', 'Leaf Spot'],
      common_pests: ['Aphids', 'Whiteflies', 'Hornworms'],
      ideal_temperature: '18-30°C',
      created_date: nowIso(),
    },
    {
      id: 'plant-2',
      common_name: 'Potato',
      scientific_name: 'Solanum tuberosum',
      common_diseases: ['Late Blight', 'Scab'],
      common_pests: ['Colorado Potato Beetle'],
      ideal_temperature: '15-25°C',
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDatabase();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
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
    const av = a?.[field];
    const bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
};

const entityApi = (entityName) => ({
  async list(sortBy = '', limit) {
    const db = readDb();
    const items = sortItems(db[entityName] || [], sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },
  async filter(criteria = {}, sortBy = '', limit) {
    const db = readDb();
    const filtered = (db[entityName] || []).filter((item) =>
      Object.entries(criteria).every(([k, v]) => item?.[k] === v)
    );
    const items = sortItems(filtered, sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },
  async create(data) {
    const db = readDb();
    const record = { id: makeId(), created_date: nowIso(), ...data };
    db[entityName] = [...(db[entityName] || []), record];
    writeDb(db);
    return record;
  },
  async update(id, data) {
    const db = readDb();
    db[entityName] = (db[entityName] || []).map((item) =>
      String(item.id) === String(id) ? { ...item, ...data, updated_date: nowIso() } : item
    );
    writeDb(db);
    return (db[entityName] || []).find((item) => String(item.id) === String(id));
  },
  async delete(id) {
    const db = readDb();
    const before = (db[entityName] || []).length;
    db[entityName] = (db[entityName] || []).filter((item) => String(item.id) !== String(id));
    writeDb(db);
    return { success: before !== db[entityName].length };
  },
});

const createMockFromSchema = (schema, prompt = '') => {
  if (!schema) return { text: 'Generated local mock response', prompt };
  if (schema.type === 'object') {
    const out = {};
    Object.entries(schema.properties || {}).forEach(([key, propertySchema]) => {
      out[key] = createMockFromSchema(propertySchema, prompt);
    });
    return out;
  }
  if (schema.type === 'array') {
    return [createMockFromSchema(schema.items || { type: 'string' }, prompt)];
  }
  if (schema.type === 'number' || schema.type === 'integer') return 85;
  if (schema.type === 'boolean') return true;
  if (schema.enum?.length) return schema.enum[0];
  return `Mocked ${schema.title || 'value'} from local AI integration`;
};

const getCurrentUser = () => {
  const db = readDb();
  const existing = (db.User || [])[0];
  if (existing) return existing;
  const seeded = { id: 'u-admin', full_name: 'Demo Admin', role: 'admin', email: 'admin@verdent.local', created_date: nowIso() };
  db.User = [seeded];
  writeDb(db);
  return seeded;
};

const entities = new Proxy({}, {
  get(_target, prop) {
    return entityApi(prop);
  },
});

export const base44 = {
  entities,
  auth: {
    async me() {
      return getCurrentUser();
    },
    async updateMe(updateData) {
      const user = getCurrentUser();
      const updated = { ...user, ...updateData, updated_date: nowIso() };
      const db = readDb();
      db.User = [updated, ...(db.User || []).filter((u) => u.id !== user.id)];
      writeDb(db);
      return updated;
    },
    logout(redirectTo) {
      if (redirectTo) window.location.href = redirectTo;
    },
    redirectToLogin(redirectTo) {
      if (redirectTo) window.location.href = redirectTo;
    },
  },
  users: {
    async inviteUser(email, role = 'member') {
      const name = email.split('@')[0].replace(/[._-]/g, ' ');
      return entityApi('User').create({ email, role, full_name: name, invited: true });
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (file instanceof File) {
          return { file_url: URL.createObjectURL(file) };
        }
        return { file_url: '' };
      },
      async InvokeLLM({ prompt = '', response_json_schema }) {
        return createMockFromSchema(response_json_schema, prompt);
      },
    },
  },
  appLogs: {
    async logUserInApp() {
      return { success: true };
    },
  },
};
