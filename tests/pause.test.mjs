import assert from 'node:assert/strict';
import { TranslationEngine } from '../extension/engine.mjs';
import { DEFAULTS } from '../extension/core.mjs';
import { area } from './fixtures/chrome.mjs';
import { gameHarness } from './fixtures/cocos.mjs';
const storage = { local: area(), session: area() }, values = new Map(), calls = [];
const cache = { get: async key => values.get(key), put: async (key, text) => values.set(key, text) };
let hold = true;
const deps = { storage, cache, glossary: { 'メニュー': '菜单' }, permitted: async () => true,
  fetchImpl: (_url, options) => {
    calls.push(options);
    if (!hold) return Promise.resolve({ ok: true, json: async () => ({ choices: [{ message: { content: '测试译文' } }] }) });
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), { once: true }));
  } };
const engine = new TranslationEngine(deps);
await engine.configure({ provider: 'openai', apiBase: 'https://model.invalid/v1', model: 'test-model', storyEnabled: true, uiEnabled: false });
const pending = engine.translate(Array.from({ length: 6 }, (_, index) => ({ id: String(index), text: 'これは' + index + 'です。' })));
for (let index = 0; calls.length < 2 && index < 50; index++) await new Promise(resolve => setImmediate(resolve));
assert.equal(calls.length, 2);
await engine.configure({ paused: true }, true);
const stopped = await pending;
assert.equal(calls.length, 2); assert(stopped.items.every(item => item.error === 'TranslationPaused')); assert.equal(engine.pageRequests.size, 0);
const retained = await engine.publicSettings(); assert(retained.paused && retained.storyEnabled); assert.equal(retained.uiEnabled, false);
const pausedResponse = await engine.translate([{ id: 'menu', text: 'メニュー' }]);
assert(pausedResponse.paused); assert.equal(pausedResponse.items[0].text, 'メニュー'); assert.equal(calls.length, 2);
assert((await new TranslationEngine(deps).publicSettings()).paused);
await engine.configure({ lookahead: 5 }); assert(engine.settings.paused, 'Saving other settings must keep pause');
hold = false;
assert.equal((await engine.translate([{ id: 'test', text: 'これはテストです。' }], { fresh: true })).items[0].text, '测试译文');
await engine.configure({ paused: false }, true);
assert.equal((await engine.translate([{ id: 'resume', text: '続きです。' }])).items[0].text, '测试译文');
assert(engine.settings.storyEnabled && !engine.settings.uiEnabled);

let reply, gameCalls = 0;
const h = gameHarness('standard', () => { gameCalls++; return new Promise(resolve => { reply = resolve; }); });
const runtime = h.context.__CocosWebTranslator;
h.manager.update(h.root, 1 / 60); assert.equal(gameCalls, 1);
runtime.applyPreferences({ paused: true, revision: 2 });
h.manager.update(h.root, 1 / 60); assert.equal(h.displayed[0].text, '<size=30>「大丈夫ですか？」</size>');
reply({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=30>过期译文</size>' }] }) });
await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(h.message._arguments[1], '<size=30>「大丈夫ですか？」</size>');
runtime.applyPreferences({ paused: false, revision: 1 }); assert(runtime.stats.paused);
runtime.applyPreferences({ paused: false, revision: 3 }); assert(!runtime.stats.paused && runtime.config.storyEnabled);
runtime.uninstall();

class Element {
  constructor() { this.listeners = {}; this.children = []; this.attributes = {}; this.textContent = ''; this.checked = false; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  querySelectorAll() { return this.children.flatMap(label => label.children.filter(child => child.type === 'checkbox' && child.checked)); }
}
const elements = new Map(['pauseToggle', 'provider', 'origins', 'siteToggle', 'storyEnabled', 'uiEnabled', 'settings', 'status', 'update', 'profileSelect', 'profileHint', 'createProfile', 'pageScope', 'popupVersion'].map(id => [id, new Element()]));
globalThis.document = { documentElement: {}, getElementById: id => elements.get(id), querySelectorAll: () => [], createElement: () => new Element() };
let popupPrefs = { ...DEFAULTS, profileId: 'default', storyEnabled: true, uiEnabled: false, interfaceLanguage: 'en' }, opened;
globalThis.chrome = { runtime: { getManifest: () => ({ version: '0.9.0' }), getURL: path => 'chrome-extension://test-extension/' + path, openOptionsPage: async () => {}, sendMessage: async ({ action, payload }) => {
  if (action === 'getPageContext') return { ok: true, data: { tabId: 1, scope: 'https://canvas.example.test/view', profileId: popupPrefs.profileId, origins: [{ origin: 'https://canvas.example.test', enabled: true }] } };
  if (action === 'getProfiles') return { ok: true, data: { profiles: [{ id: 'default', name: 'Default', isDefault: true }, { id: 'second', name: 'Strategy' }], editorId: 'default' } };
  if (action === 'setPreferences') popupPrefs = { ...popupPrefs, ...payload };
  if (action === 'bindPageProfile') { assert.equal(payload.scope, 'https://canvas.example.test/view'); popupPrefs = { ...popupPrefs, profileId: payload.id || null, profileRequired: !payload.id }; }
  return { ok: true, data: { ...popupPrefs } };
} }, tabs: { create: async value => { opened = value; } } };
await import('../extension/popup.js'); await new Promise(resolve => setImmediate(resolve));
assert.equal(elements.get('pauseToggle').textContent, 'Pause translation');
assert.equal(elements.get('popupVersion').textContent, 'v0.9.0');
await elements.get('pauseToggle').listeners.click();
assert(popupPrefs.paused && popupPrefs.storyEnabled && !popupPrefs.uiEnabled); assert.equal(elements.get('pauseToggle').textContent, 'Resume translation');
assert.equal(elements.get('pauseToggle').attributes['aria-pressed'], 'true');
await elements.get('pauseToggle').listeners.click(); assert(!popupPrefs.paused); assert.equal(elements.get('pauseToggle').textContent, 'Pause translation');
await elements.get('update').listeners.click(); assert.equal(opened.url, 'chrome-extension://test-extension/update.html');
elements.get('profileSelect').value = 'second'; await elements.get('profileSelect').listeners.change();
assert.equal(popupPrefs.profileId, 'second'); assert(elements.get('status').textContent.includes('Profile saved for this page: Strategy')); assert(elements.get('status').textContent.includes('Page enabled'));
await elements.get('settings').listeners.click(); assert.equal(opened.url, 'chrome-extension://test-extension/options.html?profile=second');
elements.get('profileSelect').value = ''; await elements.get('profileSelect').listeners.change();
assert.equal(popupPrefs.profileId, null); assert(elements.get('storyEnabled').disabled && elements.get('uiEnabled').disabled);
assert(elements.get('profileHint').textContent.includes('Choose a profile to enable this page'));
await elements.get('createProfile').listeners.click(); assert.equal(opened.url, 'chrome-extension://test-extension/options.html?new=1');
console.log('Pause: popup controls, persisted state, preserved switches, cancelled active/queued requests, stale dialogue safety, and resume checks passed.');
