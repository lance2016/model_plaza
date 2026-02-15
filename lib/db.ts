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
  api_format: 'completion' | 'responses';
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
  agent_id: string;
  title: string;
  messages: string;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_color: string;
  system_prompt: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  tags: string;
  is_preset: number;
  is_published: number;
  is_favorited: number;
  use_count: number;
  sort_order: number;
  supports_vision: number;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
  enabled_tools: string; // JSON array of tool names, e.g. ["web_search"]
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

const PRESET_AGENTS = [
  {
    id: 'agent-default', name: '通用助手', description: '智能对话助手，支持联网搜索，帮你回答问题、查找资料、分析信息', icon: 'sparkles', icon_color: '#3b82f6',
    system_prompt: `你是一个智能助手。你可以帮助用户回答问题、提供建议、进行分析和创作。

当用户的问题涉及实时信息、最新事件、需要验证的事实、或你不确定的内容时，请使用 web_search 工具搜索互联网获取最新信息。搜索时请使用简洁准确的关键词。

回答时请：
- 基于搜索结果提供准确、有据可查的信息
- 标注信息来源
- 如果搜索结果不足以回答问题，坦诚告知用户
- 使用用户的语言回答`,
    tags: '["通用", "搜索", "助手"]', sort_order: 0,
  },
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
      reasoning_type TEXT DEFAULT 'levels',
      supports_vision INTEGER DEFAULT 1
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

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'bot',
      icon_color TEXT DEFAULT '#3b82f6',
      system_prompt TEXT NOT NULL DEFAULT '',
      model_id TEXT DEFAULT '',
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      top_p REAL DEFAULT 1.0,
      frequency_penalty REAL DEFAULT 0,
      presence_penalty REAL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      is_preset INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      is_favorited INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      supports_vision INTEGER DEFAULT 1,
      is_reasoning_model INTEGER DEFAULT 0,
      default_reasoning_effort TEXT DEFAULT 'medium',
      reasoning_type TEXT DEFAULT 'levels',
      enabled_tools TEXT DEFAULT '["web_search"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrations
  const columns = db.prepare("PRAGMA table_info(providers)").all() as { name: string }[];
  if (!columns.some(c => c.name === 'api_format')) {
    db.exec("ALTER TABLE providers ADD COLUMN api_format TEXT DEFAULT 'completion'");
  }

  const modelColumns = db.prepare("PRAGMA table_info(models)").all() as { name: string }[];
  if (!modelColumns.some(c => c.name === 'supports_vision')) {
    db.exec("ALTER TABLE models ADD COLUMN supports_vision INTEGER DEFAULT 1");
  }

  const agentColumns = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
  if (!agentColumns.some(c => c.name === 'supports_vision')) {
    db.exec("ALTER TABLE agents ADD COLUMN supports_vision INTEGER DEFAULT 1");
  }
  if (!agentColumns.some(c => c.name === 'is_reasoning_model')) {
    db.exec("ALTER TABLE agents ADD COLUMN is_reasoning_model INTEGER DEFAULT 0");
  }
  if (!agentColumns.some(c => c.name === 'default_reasoning_effort')) {
    db.exec("ALTER TABLE agents ADD COLUMN default_reasoning_effort TEXT DEFAULT 'medium'");
  }
  if (!agentColumns.some(c => c.name === 'reasoning_type')) {
    db.exec("ALTER TABLE agents ADD COLUMN reasoning_type TEXT DEFAULT 'levels'");
  }
  if (!agentColumns.some(c => c.name === 'enabled_tools')) {
    db.exec('ALTER TABLE agents ADD COLUMN enabled_tools TEXT DEFAULT \'["web_search"]\'');
  }

  const convColumns = db.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
  if (!convColumns.some(c => c.name === 'agent_id')) {
    db.exec("ALTER TABLE conversations ADD COLUMN agent_id TEXT DEFAULT ''");
  }

  // Auto-seed if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number };
  if (count.count === 0) {
    seedData(db);
  }

  // Seed agents if empty
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  if (agentCount.count === 0) {
    seedAgents(db);
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

function seedAgents(database: Database.Database) {
  const insertAgent = database.prepare(
    'INSERT OR REPLACE INTO agents (id, name, description, icon, icon_color, system_prompt, tags, is_preset, is_published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)'
  );

  const tx = database.transaction(() => {
    for (const a of PRESET_AGENTS) {
      insertAgent.run(a.id, a.name, a.description, a.icon, a.icon_color, a.system_prompt, a.tags, a.sort_order);
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

export function createProvider(data: { id: string; name: string; type: string; base_url: string; api_key?: string; api_format?: string; enabled?: number; sort_order?: number }) {
  const encryptedKey = data.api_key ? encrypt(data.api_key) : '';
  getDb().prepare(
    'INSERT INTO providers (id, name, type, base_url, api_key, api_format, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(data.id, data.name, data.type, data.base_url, encryptedKey, data.api_format ?? 'completion', data.enabled ?? 1, data.sort_order ?? 0);
}

export function updateProvider(id: string, data: Partial<{ name: string; type: string; base_url: string; api_key: string; api_format: string; enabled: number; sort_order: number }>) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { sets.push('type = ?'); values.push(data.type); }
  if (data.base_url !== undefined) { sets.push('base_url = ?'); values.push(data.base_url); }
  if (data.api_key !== undefined) { sets.push('api_key = ?'); values.push(data.api_key ? encrypt(data.api_key) : ''); }
  if (data.api_format !== undefined) { sets.push('api_format = ?'); values.push(data.api_format); }
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

export function createModel(data: { 
  id: string; 
  provider_id: string; 
  name: string; 
  enabled?: number; 
  temperature?: number; 
  max_tokens?: number; 
  sort_order?: number; 
  is_reasoning_model?: number; 
  default_reasoning_effort?: string; 
  reasoning_type?: string;
  supports_vision?: number;
}) {
  getDb().prepare(
    'INSERT INTO models (id, provider_id, name, enabled, temperature, max_tokens, sort_order, is_reasoning_model, default_reasoning_effort, reasoning_type, supports_vision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
    data.reasoning_type ?? 'levels',
    data.supports_vision ?? 1 // Default to support vision
  );
}

export function updateModel(id: string, data: Partial<{ 
  name: string; 
  provider_id: string; 
  enabled: number; 
  temperature: number; 
  max_tokens: number; 
  sort_order: number; 
  is_reasoning_model: number; 
  default_reasoning_effort: string; 
  reasoning_type: string;
  supports_vision: number;
}>) {
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
  if (data.supports_vision !== undefined) { sets.push('supports_vision = ?'); values.push(data.supports_vision); }
  if (sets.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE models SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteModel(id: string) {
  getDb().prepare('DELETE FROM models WHERE id = ?').run(id);
}

// === Conversation queries ===

export function getAllConversations(mode?: 'model' | 'agent'): Omit<Conversation, 'messages'>[] {
  let sql = 'SELECT id, model_id, agent_id, title, token_count, created_at, updated_at FROM conversations';
  if (mode === 'model') sql += " WHERE agent_id = '' OR agent_id IS NULL";
  else if (mode === 'agent') sql += " WHERE agent_id != '' AND agent_id IS NOT NULL";
  sql += ' ORDER BY updated_at DESC';
  return getDb().prepare(sql).all() as Omit<Conversation, 'messages'>[];
}

export function searchConversations(query: string, mode?: 'model' | 'agent'): Omit<Conversation, 'messages'>[] {
  const searchPattern = `%${query}%`;
  let sql = `SELECT id, model_id, agent_id, title, token_count, created_at, updated_at
     FROM conversations
     WHERE (title LIKE ? OR messages LIKE ?)`;
  if (mode === 'model') sql += " AND (agent_id = '' OR agent_id IS NULL)";
  else if (mode === 'agent') sql += " AND (agent_id != '' AND agent_id IS NOT NULL)";
  sql += ' ORDER BY updated_at DESC';
  return getDb().prepare(sql).all(searchPattern, searchPattern) as Omit<Conversation, 'messages'>[];
}

export function getConversation(id: string): Conversation | undefined {
  return getDb().prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
}

export function createConversation(data: { id: string; model_id: string; title?: string; messages?: string; agent_id?: string }) {
  getDb().prepare(
    'INSERT INTO conversations (id, model_id, title, messages, agent_id) VALUES (?, ?, ?, ?, ?)'
  ).run(data.id, data.model_id, data.title || '', data.messages || '[]', data.agent_id || '');
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

// === Agent queries ===

export function getAllAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents ORDER BY sort_order, created_at DESC').all() as Agent[];
}

export function getPublishedAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents WHERE is_published = 1 ORDER BY sort_order, created_at DESC').all() as Agent[];
}

export function getFavoritedAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents WHERE is_favorited = 1 ORDER BY sort_order, created_at DESC').all() as Agent[];
}

export function searchAgents(query: string): Agent[] {
  const pattern = `%${query}%`;
  return getDb().prepare(
    'SELECT * FROM agents WHERE (name LIKE ? OR description LIKE ? OR tags LIKE ?) AND is_published = 1 ORDER BY sort_order, created_at DESC'
  ).all(pattern, pattern, pattern) as Agent[];
}

export function getAgent(id: string): Agent | undefined {
  return getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

export function getDefaultAgent(): Agent | undefined {
  const defaultId = getSetting('default_agent_id');
  if (defaultId) {
    const agent = getDb().prepare('SELECT * FROM agents WHERE id = ?').get(defaultId) as Agent | undefined;
    if (agent) return agent;
  }
  // Fallback: first agent by sort order
  return getDb().prepare('SELECT * FROM agents ORDER BY sort_order ASC, created_at ASC LIMIT 1').get() as Agent | undefined;
}

export function createAgent(data: {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  icon_color?: string;
  system_prompt: string;
  model_id?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tags?: string;
  is_published?: number;
  supports_vision?: number;
  is_reasoning_model?: number;
  default_reasoning_effort?: string;
  reasoning_type?: string;
  enabled_tools?: string;
}) {
  getDb().prepare(
    `INSERT INTO agents (id, name, description, icon, icon_color, system_prompt, model_id, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, tags, is_published, supports_vision, is_reasoning_model, default_reasoning_effort, reasoning_type, enabled_tools)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.id,
    data.name,
    data.description ?? '',
    data.icon ?? 'bot',
    data.icon_color ?? '#3b82f6',
    data.system_prompt,
    data.model_id ?? '',
    data.temperature ?? 0.7,
    data.max_tokens ?? 4096,
    data.top_p ?? 1.0,
    data.frequency_penalty ?? 0,
    data.presence_penalty ?? 0,
    data.tags ?? '[]',
    data.is_published ?? 1,
    data.supports_vision ?? 1,
    data.is_reasoning_model ?? 0,
    data.default_reasoning_effort ?? 'medium',
    data.reasoning_type ?? 'levels',
    data.enabled_tools ?? '["web_search"]'
  );
}

export function updateAgent(id: string, data: Partial<{
  name: string;
  description: string;
  icon: string;
  icon_color: string;
  system_prompt: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  tags: string;
  is_published: number;
  is_favorited: number;
  sort_order: number;
  supports_vision: number;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
  enabled_tools: string;
}>) {
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.icon !== undefined) { sets.push('icon = ?'); values.push(data.icon); }
  if (data.icon_color !== undefined) { sets.push('icon_color = ?'); values.push(data.icon_color); }
  if (data.system_prompt !== undefined) { sets.push('system_prompt = ?'); values.push(data.system_prompt); }
  if (data.model_id !== undefined) { sets.push('model_id = ?'); values.push(data.model_id); }
  if (data.temperature !== undefined) { sets.push('temperature = ?'); values.push(data.temperature); }
  if (data.max_tokens !== undefined) { sets.push('max_tokens = ?'); values.push(data.max_tokens); }
  if (data.top_p !== undefined) { sets.push('top_p = ?'); values.push(data.top_p); }
  if (data.frequency_penalty !== undefined) { sets.push('frequency_penalty = ?'); values.push(data.frequency_penalty); }
  if (data.presence_penalty !== undefined) { sets.push('presence_penalty = ?'); values.push(data.presence_penalty); }
  if (data.tags !== undefined) { sets.push('tags = ?'); values.push(data.tags); }
  if (data.is_published !== undefined) { sets.push('is_published = ?'); values.push(data.is_published); }
  if (data.is_favorited !== undefined) { sets.push('is_favorited = ?'); values.push(data.is_favorited); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.supports_vision !== undefined) { sets.push('supports_vision = ?'); values.push(data.supports_vision); }
  if (data.is_reasoning_model !== undefined) { sets.push('is_reasoning_model = ?'); values.push(data.is_reasoning_model); }
  if (data.default_reasoning_effort !== undefined) { sets.push('default_reasoning_effort = ?'); values.push(data.default_reasoning_effort); }
  if (data.reasoning_type !== undefined) { sets.push('reasoning_type = ?'); values.push(data.reasoning_type); }
  if (data.enabled_tools !== undefined) { sets.push('enabled_tools = ?'); values.push(data.enabled_tools); }
  if (sets.length <= 1) return;
  values.push(id);
  getDb().prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteAgent(id: string) {
  getDb().prepare('DELETE FROM agents WHERE id = ?').run(id);
}

export function incrementAgentUseCount(id: string) {
  getDb().prepare('UPDATE agents SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}
