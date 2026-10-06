import { TranslationEngine } from './engine.mjs';
import { createCache } from './cache.mjs';
import { apiPermissionPattern } from './core.mjs';
import { createSiteAccess } from './site-access.mjs';
import glossary from './glossary.mjs';
const secureStorage = Promise.all(['local', 'session'].map(area => chrome.storage[area].setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })));
const sites = createSiteAccess(chrome), cache = createCache(indexedDB);
const engine = new TranslationEngine({ storage: chrome.storage, cache, glossary,
  permitted: base => chrome.permissions.contains({ origins: [apiPermissionPattern(base)] }) });
export function senderKind(sender, extensionId, enabledOrigins = []) {
  if (sender.id !== extensionId) return null;
  try {
    const url = new URL(sender.url || '');
    if (url.protocol === 'chrome-extension:' && url.hostname === extensionId && ['/options.html', '/popup.html'].includes(url.pathname)) return 'settings';
    if (['https:', 'http:'].includes(url.protocol) && enabledOrigins.includes(url.origin) && sender.tab) return 'page';
  } catch { /* Invalid URLs have no authority. */ }
  return null;
}
async function handle(message, sender) {
  await secureStorage; await sites.ready;
  const kind = senderKind(sender, chrome.runtime.id, await sites.active());
  if (!kind || !message || typeof message !== 'object') throw new Error('消息来源不合法');
  const { action, payload } = message;
  if (action === 'getPreferences') return engine.publicSettings();
  if (action === 'setPreferences' && kind === 'settings') return engine.configure(payload, true);
  if (action === 'translate' && kind === 'page') {
    const response = await engine.translate(payload?.items);
    return { ...response, items: response.items.map(({ errorMessage, ...item }) => item) };
  }
  if (action === 'openOptions' && kind === 'page') { await chrome.runtime.openOptionsPage(); return {}; }
  if (kind !== 'settings') throw new Error('此操作只能在扩展设置中执行');
  if (action === 'getPageContext') return sites.context();
  if (action === 'enableSites') return sites.enable(payload?.origins, payload?.tabId);
  if (action === 'disableSites') return sites.disable(payload?.origins, payload?.tabId);
  if (action === 'getSettings') return engine.publicSettings(true);
  if (action === 'setSettings') return engine.configure(payload);
  if (action === 'test') return engine.translate([{ id: 'test', text: '「お父さん、大丈夫ですか？」' }], { fresh: true });
  if (action === 'probe') return engine.probe();
  await engine.ready;
  const language = engine.settings.targetLanguage;
  if (action === 'getCacheStats') return cache.stats(language);
  if (action === 'exportTranslations') return cache.exportFile(language);
  if (action === 'importTranslations') { if ((payload?.targetLanguage || 'zh-CN') !== language) throw new Error('译文文件的语言与当前目标语言不同，请切换目标语言后再导入'); const imported = await cache.importFile(payload); await engine.invalidateTranslations(); return { imported }; }
  if (action === 'getPersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); return { translation: await cache.getOverride(payload.original, language) || '' }; }
  if (action === 'setPersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); await cache.importFile({ format: 'cocos-translations', version: 1, targetLanguage: language, translations: { [payload.original]: payload.translation } }); await engine.invalidateTranslations(); return {}; }
  if (action === 'removePersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); await cache.removeOverride(payload.original, language); await engine.invalidateTranslations(); return {}; }
  if (action === 'clearCache') { await cache.clear(); await engine.invalidateTranslations(); return {}; }
  throw new Error('不支持的扩展操作');
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handle(message, sender).then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});
chrome.permissions.onRemoved.addListener(() => { sites.synchronize().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => { sites.synchronize().catch(() => {}); });
