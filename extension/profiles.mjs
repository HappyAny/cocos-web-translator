// Copyright (C) 2026 HappyAny
// SPDX-License-Identifier: GPL-3.0-only
import { DEFAULTS, validateSettings, pageScope } from './core.mjs';
export { pageScope } from './core.mjs';
import { TranslationEngine, digest, localDate } from './engine.mjs';
import { createCache } from './cache.mjs';
import { LruCache, CACHE_MISS } from './lru.mjs';

const REGISTRY = 'translationProfiles', SHARED = 'globalPreferences';
const SHARED_FIELDS = ['paused', 'interfaceLanguage'];
const select = (value, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const fail = message => { throw new Error(message); };
export function profileName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) fail('Profile 名称须为 1 到 80 字符');
  return value.trim();
}
function networkLimiter() {
  let active = 0; const waiting = [];
  return async callback => {
    if (active >= 2) await new Promise(resolve => waiting.push(resolve)); else active++;
    try { return await callback(); } finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
}
function usageLedger(storage, date) {
  let queue = Promise.resolve(), usage;
  const ready = storage.local.get(['usage']).then(value => { usage = value.usage; });
  const current = async () => { await ready; if (usage?.date !== date()) usage = { date: date(), characters: 0 }; return { ...usage }; };
  return {
    current,
    reserve(text, limit) {
      const work = queue.then(async () => {
        const next = await current(), count = [...text].length;
        if (next.characters + count > limit) { const error = new Error('每日提交预算已用完，缓存和内置词表仍可使用'); error.name = 'BudgetExceeded'; throw error; }
        usage = { ...next, characters: next.characters + count }; await storage.local.set({ usage });
      });
      queue = work.catch(() => {}); return work;
    },
  };
}

// Pages can only use their saved binding; editing a profile never binds a page.
export class ProfileManager {
  constructor({ storage, indexedDB, glossary, permitted, fetchImpl, date = localDate, timeoutMs }) {
    Object.assign(this, { storage, indexedDB, glossary, permitted, fetchImpl, date, timeoutMs });
    this.queue = Promise.resolve(); this.areaQueue = Promise.resolve(); this.engines = new Map();
    this.routes = new LruCache({ maxEntries: 256, maxBytes: 256 * 1024 });
    this.networkScheduler = networkLimiter(); this.usageLedger = usageLedger(storage, date); this.ready = this.load();
  }
  serial(callback) { const next = this.queue.then(callback); this.queue = next.catch(() => {}); return next; }
  areaSerial(callback) { const next = this.areaQueue.then(callback); this.areaQueue = next.catch(() => {}); return next; }
  async load() {
    const local = await this.storage.local.get([REGISTRY, SHARED, 'settings', 'revision']);
    const settings = validateSettings({ ...DEFAULTS, ...local.settings });
    this.shared = select(validateSettings({ ...DEFAULTS, ...select(local[SHARED] || settings, SHARED_FIELDS) }), SHARED_FIELDS);
    const saved = local[REGISTRY];
    if (saved?.version === 1 && Array.isArray(saved.items) && saved.items.some(item => item.id === 'default')) {
      const items = saved.items.filter(item => typeof item?.id === 'string' && /^(?:default|[a-f0-9-]{36})$/.test(item.id)).slice(0, 50).map(item => ({ id: item.id, name: profileName(item.name) }));
      this.registry = { version: 1, revision: Math.max(saved.revision || 1, local.revision || 1), items, editorId: items.some(item => item.id === saved.editorId) ? saved.editorId : 'default', bindings: {} };
      for (const [key, binding] of Object.entries(saved.bindings || {})) if (/^[a-f0-9]{64}$/.test(key) && items.some(item => item.id === binding?.id)) this.registry.bindings[key] = { id: binding.id, revision: Number.isInteger(binding.revision) ? binding.revision : 1 };
    } else this.registry = { version: 1, revision: local.revision || 1, editorId: 'default', items: [{ id: 'default', name: 'Default' }], bindings: {} };
    await this.persist();
  }
  persist() { return this.storage.local.set({ [REGISTRY]: this.registry, [SHARED]: this.shared }); }
  async bump() { this.registry.revision++; await this.persist(); }
  require(id) { const item = this.registry.items.find(item => item.id === id); if (!item) fail('请选择有效的 Profile'); return item; }
  scopedStorage(id) {
    const manager = this;
    function area(kind) {
      const source = manager.storage[kind], key = 'profile:' + id;
      async function getRecord() { return id === 'default' ? null : (await source.get([key]))[key] || {}; }
      return {
        async get(keys) {
          const value = id === 'default' ? await source.get(keys) : select(await getRecord(), keys);
          if (kind === 'local' && keys.includes('settings')) value.settings = { ...DEFAULTS, ...value.settings, ...manager.shared };
          return value;
        },
        set(values) { return manager.areaSerial(async () => {
          const data = { ...values };
          if (kind === 'local' && data.settings) data.settings = { ...data.settings, ...manager.shared };
          if (id === 'default') return source.set(data);
          await source.set({ [key]: { ...await getRecord(), ...data } });
        }); },
        remove(keys) { return manager.areaSerial(async () => {
          if (id === 'default') return source.remove(keys);
          const record = await getRecord(); for (const name of Array.isArray(keys) ? keys : [keys]) delete record[name];
          await source.set({ [key]: record });
        }); },
      };
    }
    return { local: area('local'), session: area('session') };
  }
  async get(id) {
    await this.ready; this.require(id);
    if (!this.engines.has(id)) {
      const cache = createCache(this.indexedDB, id === 'default' ? 'cocos-translations' : 'cocos-translations-' + id);
      const engine = new TranslationEngine({ storage: this.scopedStorage(id), cache, glossary: this.glossary, permitted: this.permitted,
        fetchImpl: this.fetchImpl, date: this.date, timeoutMs: this.timeoutMs, usageLedger: this.usageLedger, networkScheduler: this.networkScheduler });
      this.engines.set(id, engine);
    }
    const engine = this.engines.get(id); await engine.ready; return engine;
  }
  async list() { await this.ready; return { profiles: this.registry.items.map(item => ({ ...item, isDefault: item.id === 'default' })), editorId: this.registry.editorId }; }
  async view(id, full = false, snapshotRevision = null) {
    await this.ready;
    const revision = snapshotRevision ?? this.registry.revision, shared = { ...this.shared };
    if (!id) return { ...select(DEFAULTS, ['provider', 'targetLanguage', 'historyEnabled', 'historyMaxEntries', 'maxFreeCharacters', 'requestTimeoutSeconds']),
      ...shared, storyEnabled: false, uiEnabled: false, systemFont: false, lookahead: 0, profileId: null, profileRequired: true,
      revision, providerSignature: 'unbound', uiGlossaryKeys: [], personalTextKeys: [], usedFreeCharacters: (await this.usageLedger.current()).characters };
    const item = { ...this.require(id) }, engine = await this.get(id), data = await engine.publicSettings(full);
    return { ...data, ...shared, profileId: id, profileName: item.name, profileRequired: false, revision, providerSignature: id + ':' + data.providerSignature };
  }
  async routeKey(scope) {
    const clean = pageScope(scope), hit = this.routes.get(clean); if (hit !== CACHE_MISS) return hit;
    const key = await digest(clean); this.routes.set(clean, key); return key;
  }
  async binding(scope) { await this.ready; if (!scope) return null; return this.registry.bindings[await this.routeKey(scope)] || null; }
  async pageView(scope) {
    await this.ready; const key = scope ? await this.routeKey(scope) : null;
    const id = this.registry.bindings[key]?.id, revision = this.registry.revision;
    return this.view(id, false, revision);
  }
  async bind(scope, id) {
    await this.ready;
    return this.serial(async () => { if (id) this.require(id); const key = await this.routeKey(scope);
      if (!id) delete this.registry.bindings[key]; else this.registry.bindings[key] = { id, revision: this.registry.revision + 1 };
      await this.bump(); return this.view(id);
    });
  }
  async selectEditor(id) { await this.ready; return this.serial(async () => { this.require(id); this.registry.editorId = id; await this.persist(); return this.view(id, true); }); }
  async create({ name, copyFrom } = {}) {
    await this.ready;
    return this.serial(async () => {
      name = profileName(name);
      if (this.registry.items.length >= 50) fail('最多创建 50 个 Profile');
      if (this.registry.items.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('Profile 名称已存在');
      const copied = copyFrom ? { ...(await this.get(copyFrom)).settings } : { ...DEFAULTS };
      const id = crypto.randomUUID();
      // Keys and caches are deliberately excluded from the optional settings copy.
      await this.storage.local.set({ ['profile:' + id]: { settings: copied, rememberApiKey: false, revision: 1, providerRevision: 1 } });
      this.registry.items.push({ id, name }); this.registry.editorId = id; await this.bump();
      return this.view(id, true);
    });
  }
  async rename(id, name) {
    await this.ready;
    return this.serial(async () => { const item = this.require(id); name = profileName(name);
      if (this.registry.items.some(other => other.id !== id && other.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('Profile 名称已存在');
      item.name = name; await this.bump(); return this.view(id, true);
    });
  }
  async configure(id, payload, preferencesOnly = false) {
    await this.ready;
    return this.serial(async () => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('设置须为 JSON 对象');
      const shared = select(payload || {}, SHARED_FIELDS);
      if (!id && Object.keys(payload || {}).some(key => !SHARED_FIELDS.includes(key))) fail('请先为当前网页选择 Profile');
      const validated = validateSettings({ ...DEFAULTS, ...this.shared, ...shared });
      if (id) await (await this.get(id)).configure(payload, preferencesOnly);
      this.shared = select(validated, SHARED_FIELDS);
      await Promise.all([...this.engines.values()].map(engine => engine.applySharedPreferences(this.shared)));
      await this.bump(); return this.view(id, !preferencesOnly);
    });
  }
  async invalidate(id) { await this.ready; return this.serial(async () => { await (await this.get(id)).invalidateTranslations(); await this.bump(); }); }
}
