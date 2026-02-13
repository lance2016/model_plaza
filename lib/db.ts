import Database from 'better-sqlite3';
import path from 'path';
import { encrypt, decrypt } from './crypto';

// Types
export interface Provider {
  id: string;
  name: string;
  type: 'openai_compatible' | 'anthropic' | 'google';
  base_url: string;
  api_key: string;
  enabled: number;
  sort_order: number;
  created_at: string;
}

export interface Model {
  id: string;
  provider_id: string;
  name: string;
  enabled: number;
  temperature: number;
  max_tokens: number;
  sort_order: number;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string; // 'binary' or 'levels'
  provider_name?: string;
}

export interface Conversation {
  id: string;
  model_id: string;
  title: string;
  messages: string;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  key: string;
  value: string;
}

// Preset data
const PRESET_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', type: 'openai_compatible', base_url: 'https://api.openai.com/v1', sort_order: 0 },
  { id: 'anthropic', name: 'Anthropic', type: 'anthropic', base_url: 'https://api.anthropic.com', sort_order: 1 },
  { id: 'google', name: 'Google', type: 'google', base_url: 'https://generativelanguage.googleapis.com', sort_order: 2 },
  { id: 'deepseek', name: 'DeepSeek', type: 'openai_compatible', base_url: 'https://api.deepseek.com/v1', sort_order: 3 },
  { id: 'qwen', name: '通义千问', type: 'openai_compatible', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', sort_order: 4 },
  { id: 'doubao', name: '豆包', type: 'openai_compatible', base_url: 'https://ark.cn-beijing.volces.com/api/v3', sort_order: 5 },
  { id: 'zhipu', name: '智谱AI', type: 'openai_compatible', base_url: 'https://open.bigmodel.cn/api/paas/v4/', sort_order: 6 },
  { id: 'moonshot', name: 'Moonshot', type: 'openai_compatible', base_url: 'https://api.moonshot.cn/v1', sort_order: 7 },
];

const PRESET_MODELS = [
  { id: 'gpt-4o', provider_id: 'openai', name: 'GPT-4o', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'gpt-4o-mini', provider_id: 'openai', name: 'GPT-4o Mini', sort_order: 1, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'claude-sonnet-4-20250514', provider_id: 'anthropic', name: 'Claude Sonnet 4', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'claude-3-5-haiku-20241022', provider_id: 'anthropic', name: 'Claude 3.5 Haiku', sort_order: 1, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'gemini-2.0-flash', provider_id: 'google', name: 'Gemini 2.0 Flash', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'deepseek-chat', provider_id: 'deepseek', name: 'DeepSeek Chat', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'deepseek-reasoner', provider_id: 'deepseek', name: 'DeepSeek Reasoner', sort_order: 1, is_reasoning: true, reasoning_type: 'binary' },
  { id: 'qwen-plus', provider_id: 'qwen', name: 'Qwen Plus', sort_order: 0, is_reasoning: true, reasoning_type: 'binary' },
  { id: 'glm-4-flash', provider_id: 'zhipu', name: 'GLM-4-Flash', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
  { id: 'glm-zero-preview', provider_id: 'zhipu', name: 'GLM-Zero-Preview (思考)', sort_order: 1, is_reasoning: true, reasoning_type: 'binary' },
  { id: 'moonshot-v1-8k', provider_id: 'moonshot', name: 'Moonshot v1 8K', sort_order: 0, is_reasoning: false, reasoning_type: 'levels' },
];

// Singleton
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'llm-plaza.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('openai_compatible', 'anthropic', 'google')),
      base_url TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      sort_order INTEGER DEFAULT 0,
      is_reasoning_model INTEGER DEFAULT 0,
      default_reasoning_effort TEXT DEFAULT 'medium',
      reasoning_type TEXT DEFAULT 'levels'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      messages TEXT NOT NULL DEFAULT '[]',
      token_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Auto-seed if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number };
  if (count.count === 0) {
    seedData(db);
  }

  return db;
}

function seedData(database: Database.Database) {
  const insertProvider = database.prepare(
    'INSERT OR IGNORE INTO providers (id, name, type, base_url, api_key, enabled, sort_order) VALUES (?, ?, ?, ?, \'\', 1, ?)'
  );
  const insertModel = database.prepare(
    'INSERT OR IGNORE INTO models (id, provider_id, name, enabled, temperature, max_tokens, sort_order, is_reasoning_model, default_reasoning_effort, reasoning_type) VALUES (?, ?, ?, 1, 0.7, 4096, ?, ?, ?, ?)'
  );

  const tx = database.transaction(() => {
    for (const p of PRESET_PROVIDERS) {
      insertProvider.run(p.id, p.name, p.type, p.base_url, p.sort_order);
    }
    for (const m of PRESET_MODELS) {
      insertModel.run(
        m.id, 
        m.provider_id, 
        m.name, 
        m.sort_order, 
        m.is_reasoning ? 1 : 0,
        m.is_reasoning ? (m.reasoning_type === 'binary' ? 'enabled' : 'medium') : 'medium',
        m.reasoning_type
      );
    }
  });
  tx();
}

// === Provider queries ===

export function getAllProviders(): Provider[] {
  const rows = getDb().prepare('SELECT * FROM providers ORDER BY sort_order').all() as Provider[];
  return rows.map(r => ({ ...r, api_key: r.api_key ? decrypt(r.api_key) : '' }));
}

export function getProvider(id: string): Provider | undefined {
  const row = getDb().prepare('SELECT * FROM providers WHERE id = ?').get(id) as Provider | undefined;
  if (row && row.api_key) {
    row.api_key = decrypt(row.api_key);
  }
  return row;
}

export function createProvider(data: { id: string; name: string; type: string; base_url: string; api_key?: string; enabled?: number; sort_order?: number }) {
  const encryptedKey = data.api_key ? encrypt(data.api_key) : '';
  getDb().prepare(
    'INSERT INTO providers (id, name, type, base_url, api_key, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(data.id, data.name, data.type, data.base_url, encryptedKey, data.enabled ?? 1, data.sort_order ?? 0);
}

export function updateProvider(id: string, data: Partial<{ name: string; type: string; base_url: string; api_key: string; enabled: number; sort_order: number }>) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { sets.push('type = ?'); values.push(data.type); }
  if (data.base_url !== undefined) { sets.push('base_url = ?'); values.push(data.base_url); }
  if (data.api_key !== undefined) { sets.push('api_key = ?'); values.push(data.api_key ? encrypt(data.api_key) : ''); }
  if (data.enabled !== undefined) { sets.push('enabled = ?'); values.push(data.enabled); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(data.sort_order); }
  if (sets.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteProvider(id: string) {
  getDb().prepare('DELETE FROM providers WHERE id = ?').run(id);
}

// === Model queries ===

export function getAllModels(): Model[] {
  return getDb().prepare(
    'SELECT m.*, p.name as provider_name FROM models m JOIN providers p ON m.provider_id = p.id ORDER BY p.sort_order, m.sort_order'
  ).all() as Model[];
}

export function getEnabledModels(): Model[] {
  return getDb().prepare(
    'SELECT m.*, p.name as provider_name FROM models m JOIN providers p ON m.provider_id = p.id WHERE m.enabled = 1 AND p.enabled = 1 ORDER BY p.sort_order, m.sort_order'
  ).all() as Model[];
}

export function getModel(id: string): Model | undefined {
  return getDb().prepare(
    'SELECT m.*, p.name as provider_name FROM models m JOIN providers p ON m.provider_id = p.id WHERE m.id = ?'
  ).get(id) as Model | undefined;
}

export function getModelsByProvider(providerId: string): Model[] {
  return getDb().prepare(
    'SELECT * FROM models WHERE provider_id = ? ORDER BY sort_order'
  ).all(providerId) as Model[];
}

export function createModel(data: { id: string; provider_id: string; name: string; enabled?: number; temperature?: number; max_tokens?: number; sort_order?: number; is_reasoning_model?: number; default_reasoning_effort?: string; reasoning_type?: string }) {
  getDb().prepare(
    'INSERT INTO models (id, provider_id, name, enabled, temperature, max_tokens, sort_order, is_reasoning_model, default_reasoning_effort, reasoning_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    data.id, 
    data.provider_id, 
    data.name, 
    data.enabled ?? 1, 
    data.temperature ?? 0.7, 
    data.max_tokens ?? 4096, 
    data.sort_order ?? 0,
    data.is_reasoning_model ?? 0,
    data.default_reasoning_effort ?? 'medium',
    data.reasoning_type ?? 'levels'
  );
}

export function updateModel(id: string, data: Partial<{ name: string; provider_id: string; enabled: number; temperature: number; max_tokens: number; sort_order: number; is_reasoning_model: number; default_reasoning_effort: string; reasoning_type: string }>) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.provider_id !== undefined) { sets.push('provider_id = ?'); values.push(data.provider_id); }
  if (data.enabled !== undefined) { sets.push('enabled = ?'); values.push(data.enabled); }
  if (data.temperature !== undefined) { sets.push('temperature = ?'); values.push(data.temperature); }
  if (data.max_tokens !== undefined) { sets.push('max_tokens = ?'); values.push(data.max_tokens); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.is_reasoning_model !== undefined) { sets.push('is_reasoning_model = ?'); values.push(data.is_reasoning_model); }
  if (data.default_reasoning_effort !== undefined) { sets.push('default_reasoning_effort = ?'); values.push(data.default_reasoning_effort); }
  if (data.reasoning_type !== undefined) { sets.push('reasoning_type = ?'); values.push(data.reasoning_type); }
  if (sets.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE models SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteModel(id: string) {
  getDb().prepare('DELETE FROM models WHERE id = ?').run(id);
}

// === Conversation queries ===

export function getAllConversations(): Omit<Conversation, 'messages'>[] {
  return getDb().prepare(
    'SELECT id, model_id, title, token_count, created_at, updated_at FROM conversations ORDER BY updated_at DESC'
  ).all() as Omit<Conversation, 'messages'>[];
}

export function searchConversations(query: string): Omit<Conversation, 'messages'>[] {
  const searchPattern = `%${query}%`;
  return getDb().prepare(
    `SELECT id, model_id, title, token_count, created_at, updated_at 
     FROM conversations 
     WHERE title LIKE ? OR messages LIKE ?
     ORDER BY updated_at DESC`
  ).all(searchPattern, searchPattern) as Omit<Conversation, 'messages'>[];
}

export function getConversation(id: string): Conversation | undefined {
  return getDb().prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
}

export function createConversation(data: { id: string; model_id: string; title?: string; messages?: string }) {
  getDb().prepare(
    'INSERT INTO conversations (id, model_id, title, messages) VALUES (?, ?, ?, ?)'
  ).run(data.id, data.model_id, data.title || '', data.messages || '[]');
}

export function updateConversation(id: string, data: Partial<{ title: string; messages: string; token_count: number; model_id: string }>) {
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: unknown[] = [];
  if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title); }
  if (data.messages !== undefined) { sets.push('messages = ?'); values.push(data.messages); }
  if (data.token_count !== undefined) { sets.push('token_count = ?'); values.push(data.token_count); }
  if (data.model_id !== undefined) { sets.push('model_id = ?'); values.push(data.model_id); }
  values.push(id);
  getDb().prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteConversation(id: string) {
  getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

// === Settings queries ===

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as Settings[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

export function clearAllConversations() {
  getDb().prepare('DELETE FROM conversations').run();
}
