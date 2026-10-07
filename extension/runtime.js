(function (global) {
  'use strict';
  const KEY = '__CocosWebTranslator';
  if (global[KEY]) global[KEY].uninstall();
  const config = Object.assign({
    endpoint: '', lookahead: 2, timeoutMs: 32000,
    translateNames: true, storyEnabled: true, uiEnabled: false, paused: false,
    systemFont: true, syncSettings: true, uiScanMs: 1000, transport: 'extension',
    historyEnabled: false, historyMaxEntries: 10, targetLanguage: 'zh-CN',
  }, global.COCOS_TRANSLATOR_CONFIG || {});
  const activeSessions = new Set();
  const stats = { translated: 0, failed: 0, waiting: 0, attached: false, paused: !!config.paused,
    uiTranslated: 0, uiFailed: 0, uiDetected: 0, uiScanned: 0 };
  const uiBindings = new Map();
  const uiKanji = new Set(['開始','終了','設定','確認','決定','選択','変更','保存','取消','削除','購入','売却','編成','強化','進化','覚醒','装備','所持','詳細','報酬','受取','交換','挑戦','出撃','戦闘','勝利','敗北','撤退','履歴','表示','非表示','音量','再生','停止','倍速','既読','未読','選択肢','会話','全選択','未選択','日付','名前','一括受取']);
  const defaultUiKanji = [...uiKanji], personalTextKeys = new Set();
  let dialogueHistory = [];
  let manager, constants, nameType, originalUpdate, timer, currentSession, stopped = false;
  let settingsTimer, uiTimer, uiController, uiBusy = false, statusMessage = '等待 Cocos 剧情模块…';
  let providerLabel = 'MyMemory', remainingBudget = null, providerSignature, preferenceRevision = 0;
  const serviceRoot = config.endpoint.replace(/\/translate\/?$/, '');
  const api = { version: '0.8.0', stats, config, uninstall, pause, resume, setEnabled, scanUi, applyPreferences,
    inspect: () => ({ ...stats, status: statusMessage, provider: providerLabel, remainingBudget, historyEntries: dialogueHistory.length }) };
  const pendingExtension = new Map();
  let rpcCounter = 0;
  global[KEY] = api;

  function extensionRequest(action, payload, signal) {
    return new Promise((resolve, reject) => {
      const id = String(Date.now()) + '-' + (++rpcCounter) + '-' + Math.random().toString(36).slice(2);
      const channel = 'cocos-web-translator-v1';
      let timeout;
      function finish(error, data) {
        global.clearTimeout(timeout); global.removeEventListener('message', receive);
        if (signal) signal.removeEventListener('abort', aborted);
        pendingExtension.delete(id); error ? reject(error) : resolve(data);
      }
      function aborted() { const error = new Error('Aborted'); error.name = 'AbortError'; finish(error); }
      function receive(event) {
        const message = event.data;
        if (event.source !== global || event.origin !== global.location.origin || message?.channel !== channel || message.direction !== 'response' || message.id !== id) return;
        finish(message.ok ? null : new Error(message.error || 'Extension unavailable'), message.data);
      }
      if (signal?.aborted || stopped) { aborted(); return; }
      pendingExtension.set(id, aborted);
      global.addEventListener('message', receive); signal?.addEventListener('abort', aborted, { once: true });
      timeout = global.setTimeout(aborted, config.timeoutMs);
      global.postMessage({ channel, direction: 'request', id, action, payload }, global.location.origin);
    });
  }

  function serviceFetch(url, options = {}) {
    if (config.transport !== 'extension') return global.fetch(url, options);
    const preferences = url.endsWith('/preferences');
    const action = preferences ? (options.method === 'POST' ? 'setPreferences' : 'getPreferences') : 'translate';
    return extensionRequest(action, options.body ? JSON.parse(options.body) : undefined, options.signal)
      .then(data => ({ ok: true, status: 200, json: async () => data }));
  }

  function updateStatus(message) {
    if (message) statusMessage = message;
  }

  function applyPreferences(prefs) {
    if (Number.isInteger(prefs.revision) && prefs.revision < preferenceRevision) return;
    if (Number.isInteger(prefs.revision)) preferenceRevision = prefs.revision;
    if (Object.prototype.hasOwnProperty.call(prefs, 'profileId') && prefs.profileId !== config.profileId) { dialogueHistory = []; config.profileId = prefs.profileId; }
    const priorStory = config.storyEnabled;
    if (prefs.providerSignature && providerSignature && prefs.providerSignature !== providerSignature) {
      restoreArguments();
      restoreUi();
      uiBindings.clear();
      if (uiController) uiController.abort();
      for (const s of activeSessions) {
        s.generation++;
        if (s.controller) s.controller.abort();
        s.busy = false; s.controller = null;
        for (const item of s.items) item.status = 'new';
      }
    }
    if (prefs.providerSignature) providerSignature = prefs.providerSignature;
    if (prefs.targetLanguage && prefs.targetLanguage !== config.targetLanguage) dialogueHistory = [];
    if (Number.isInteger(prefs.lookahead) && prefs.lookahead >= 0 && prefs.lookahead <= 20) config.lookahead = prefs.lookahead;
    if (Number.isInteger(prefs.historyMaxEntries) && prefs.historyMaxEntries >= 1 && prefs.historyMaxEntries <= 20) config.historyMaxEntries = prefs.historyMaxEntries;
    if (typeof prefs.historyEnabled === 'boolean') config.historyEnabled = prefs.historyEnabled;
    if (prefs.targetLanguage) config.targetLanguage = prefs.targetLanguage;
    if (!config.historyEnabled) dialogueHistory = [];
    if (Number.isInteger(prefs.requestTimeoutSeconds) && prefs.requestTimeoutSeconds >= 5 && prefs.requestTimeoutSeconds <= 90) config.timeoutMs = prefs.requestTimeoutSeconds * 1000 + 2000;
    for (const key of ['storyEnabled', 'uiEnabled', 'systemFont']) {
      if (typeof prefs[key] === 'boolean') config[key] = prefs[key];
    }
    if (prefs.profileRequired) { config.storyEnabled = false; config.uiEnabled = false; }
    if (!config.storyEnabled) {
      restoreArguments();
      if (priorStory) for (const s of activeSessions) {
        s.generation++;
        if (s.controller) s.controller.abort();
        s.busy = false; s.controller = null;
        for (const item of s.items) if (item.status === 'pending') item.status = 'new';
      }
    } else if (!priorStory) {
      for (const s of activeSessions) for (const item of s.items) if (item.status === 'failed') item.status = 'new';
    }
    if (!config.uiEnabled) restoreUi();
    if (typeof prefs.paused === 'boolean' && prefs.paused !== stats.paused) { prefs.paused ? pause() : resume(); }
    if (Array.isArray(prefs.uiGlossaryKeys)) { uiKanji.clear(); for (const key of [...defaultUiKanji, ...prefs.uiGlossaryKeys]) uiKanji.add(key); }
    if (Array.isArray(prefs.personalTextKeys)) { personalTextKeys.clear(); for (const key of prefs.personalTextKeys) personalTextKeys.add(key); }
    if (prefs.provider) providerLabel = prefs.provider === 'mymemory' ? 'MyMemory' : '模型 API';
    if (typeof prefs.maxFreeCharacters === 'number' && typeof prefs.usedFreeCharacters === 'number') {
      remainingBudget = Math.max(0, prefs.maxFreeCharacters - prefs.usedFreeCharacters);
    }
    updateStatus();
  }

  async function syncPreferences() {
    if (stopped || !config.syncSettings) return;
    const controller = new global.AbortController();
    const timeout = global.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await serviceFetch(serviceRoot + '/preferences', { signal: controller.signal, credentials: 'omit' });
      if (response.ok && !stopped) applyPreferences(await response.json());
    } catch (_) { /* translation requests handle a backend outage separately */ }
    finally { global.clearTimeout(timeout); }
  }

  async function setEnabled(key, enabled) {
    if (!['storyEnabled', 'uiEnabled'].includes(key)) return;
    applyPreferences({ [key]: !!enabled });
    if (config.syncSettings) {
      try {
        const response = await serviceFetch(serviceRoot + '/preferences', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: !!enabled }), credentials: 'omit',
        });
        if (!response.ok) throw new Error('settings unavailable');
        applyPreferences(await response.json());
      } catch (_) { updateStatus(config.transport === 'extension' ? '开关已临时应用；请检查扩展连接以保存设置' : '开关已临时应用；请检查本机服务以保存设置'); }
    }
    if (enabled && key === 'uiEnabled') await scanUi();
  }

  function safeModule(name) {
    try { return global.__require(name); } catch (_) { return null; }
  }

  function pause() {
    stats.paused = true;
    config.paused = true;
    if (uiController) uiController.abort();
    for (const s of activeSessions) {
      s.generation++;
      if (s.controller) s.controller.abort();
      s.busy = false; s.controller = null;
      for (const item of s.items) if (item.status === 'pending') item.status = 'new';
    }
    stats.waiting = 0;
    restoreArguments();
    restoreUi();
    updateStatus('翻译已暂停，显示原文');
  }

  function resume() {
    stats.paused = false;
    config.paused = false;
    for (const s of activeSessions) {
      for (const item of s.items) {
        if (config.storyEnabled && item.status === 'done') item.command._arguments[item.index] = item.translated;
      }
    }
    updateStatus('翻译已恢复');
  }

  function restoreArguments() {
    for (const s of activeSessions) {
      for (const item of s.items) item.command._arguments[item.index] = item.original;
    }
  }

  function uninstall() {
    stopped = true;
    if (timer) global.clearInterval(timer);
    if (settingsTimer) global.clearInterval(settingsTimer);
    if (uiTimer) global.clearInterval(uiTimer);
    if (uiController) uiController.abort();
    if (manager && manager.update === wrappedUpdate) manager.update = originalUpdate;
    for (const s of activeSessions) if (s.controller) s.controller.abort();
    for (const cancel of pendingExtension.values()) cancel();
    restoreArguments();
    restoreUi();
    uiBindings.clear();
    dialogueHistory = [];
    if (global[KEY] === api) delete global[KEY];
  }

  function fields(command) {
    if (!command || !command._arguments) return [];
    let name = '';
    try { name = command.getCommandName(); } catch (_) { /* unsupported command */ }
    if (name === constants.ADV_COMMAND_NAME.MESSAGE) return [1];
    if (name === constants.ADV_COMMAND_NAME.SELECT) return Array.from(command._arguments, (_, i) => i);
    if (config.translateNames && typeof nameType === 'function' && command instanceof nameType) return [0];
    return [];
  }

  function newSession(list) {
    // A scene may reuse its command array later. Restore it before releasing it,
    // and create a fresh session on return so aborted pending items cannot hang.
    for (const old of activeSessions) if (old.controller) old.controller.abort();
    restoreArguments();
    activeSessions.clear();
    dialogueHistory = [];
    const s = { list, items: [], byIndex: new Map(), busy: false, controller: null, currentNeeded: [], generation: 0, shown: new Set() };
    let speaker = '';
    list.forEach((command, commandIndex) => {
      const isName = typeof nameType === 'function' && command instanceof nameType;
      if (isName && typeof command._arguments?.[0] === 'string') speaker = command._arguments[0];
      for (const index of fields(command)) {
        const text = command._arguments[index];
        if (typeof text !== 'string' || !text.trim() ||
            (!/[\u3040-\u30ff]/.test(text) && !isName && !personalTextKeys.has(text.replace(/<[^>]*>/g, '').trim()))) continue;
        const item = { id: String(s.items.length), command, commandIndex, index, original: text, status: 'new', translated: text,
          speaker, kind: isName ? 'name' : command.getCommandName() === constants.ADV_COMMAND_NAME.MESSAGE ? 'dialogue' : 'choice' };
        s.items.push(item);
        if (!s.byIndex.has(commandIndex)) s.byIndex.set(commandIndex, []);
        s.byIndex.get(commandIndex).push(item);
      }
    });
    activeSessions.add(s);
    currentSession = s;
    return s;
  }

  function required(s, start) {
    const result = [];
    for (let i = Math.max(0, start || 0); i < s.list.length; i++) {
      result.push(...(s.byIndex.get(i) || []));
      let stop = false;
      try { stop = s.list[i].getIsCntStop(); } catch (_) { /* conservative */ }
      if (stop) break;
    }
    return result;
  }

  function enqueue(s, needed, start) {
    s.currentNeeded = needed;
    if (s.busy || stopped || stats.paused) return;
    const candidates = needed.filter(i => i.status === 'new');
    // Count already-prefetched entries in the lookahead window. Otherwise each
    // idle frame walks farther ahead and eventually translates the whole chapter.
    const aheadStart = needed.length ? s.items.indexOf(needed[needed.length - 1]) + 1 :
      s.items.findIndex(item => item.commandIndex >= Math.max(0, start || 0));
    if (aheadStart >= 0 && config.lookahead > 0) {
      let count = 0, names = [];
      for (const item of s.items.slice(aheadStart)) {
        if (item.kind === 'name') { names.push(item); continue; }
        if (count++ >= config.lookahead) break;
        candidates.push(...[...names, item].filter(i => i.status === 'new')); names = [];
      }
    }
    const batch = candidates.slice(0, 4);
    if (!batch.length) return;
    s.busy = true;
    const generation = s.generation;
    batch.forEach(i => { i.status = 'pending'; });
    const controller = new global.AbortController();
    s.controller = controller;
    const timeout = global.setTimeout(() => controller.abort(), config.timeoutMs);
    serviceFetch(config.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientVersion: '0.8.0', items: batch.map(i => ({ id: i.id, text: i.original, kind: 'story',
        ...(config.historyEnabled ? { speaker: i.speaker, history: recentHistory() } : {}) })) }),
      signal: controller.signal, credentials: 'omit',
    }).then(response => {
      if (!response.ok) throw new Error('translation HTTP ' + response.status);
      return response.json();
    }).then(body => {
      if (!Array.isArray(body.items)) throw new Error('invalid translation response');
      if (stopped || !activeSessions.has(s) || s.generation !== generation) return;
      for (const item of batch) {
        const reply = body.items.find(r => r.id === item.id);
        const originalTags = item.original.match(/<[^>]*>/g) || [];
        const tags = typeof reply?.text === 'string' ? (reply.text.match(/<[^>]*>/g) || []) : [];
        if (!reply || reply.error || typeof reply.text !== 'string' ||
            !reply.text.trim() || reply.text.length > item.original.length * 5 + 300 ||
            JSON.stringify(tags) !== JSON.stringify(originalTags)) {
          item.status = 'failed'; stats.failed++;
        } else {
          item.translated = reply.text;
          item.status = 'done';
          if (!stats.paused && config.storyEnabled) item.command._arguments[item.index] = reply.text;
          stats.translated++;
        }
      }
    }).catch(() => {
      if (stopped || !activeSessions.has(s) || s.generation !== generation) return;
      for (const item of batch) { item.status = 'failed'; stats.failed++; }
    }).finally(() => {
      global.clearTimeout(timeout);
      if (s.generation === generation) { s.controller = null; s.busy = false; }
    });
  }

  function recentHistory() {
    dialogueHistory = dialogueHistory.slice(-config.historyMaxEntries);
    return dialogueHistory;
  }

  function playWithHistory(root, args, s, needed) {
    const originalMessage = root?.setMessage;
    if (!config.historyEnabled || typeof originalMessage !== 'function') return originalUpdate.apply(this, args);
    const owned = Object.prototype.hasOwnProperty.call(root, 'setMessage');
    const wrappedMessage = function (...messageArgs) {
      const result = originalMessage.apply(this, messageArgs);
      const text = messageArgs[1];
      const item = needed.find(row => row.kind === 'dialogue' && (row.original === text || row.translated === text) && !s.shown.has(row.id));
      if (item) {
        s.shown.add(item.id);
        dialogueHistory.push({ speaker: item.speaker.replace(/<[^>]*>/g, '').slice(0, 150),
          text: item.original.replace(/<[^>]*>/g, '').slice(0, 2000), translation: String(text).replace(/<[^>]*>/g, '').slice(0, 2500) });
        recentHistory();
      }
      return result;
    };
    try { root.setMessage = wrappedMessage; } catch (_) { return originalUpdate.apply(this, args); }
    if (root.setMessage !== wrappedMessage) return originalUpdate.apply(this, args);
    try { return originalUpdate.apply(this, args); }
    finally { if (root.setMessage === wrappedMessage) { if (owned) root.setMessage = originalMessage; else delete root.setMessage; } }
  }

  function wrappedUpdate(root, delta) {
    if (stopped || stats.paused || !config.storyEnabled) return originalUpdate.apply(this, arguments);
    const data = manager.getAdvData();
    if (!data || !Array.isArray(data.commandList) || !data.commandList.length || !data.initialized) {
      return originalUpdate.apply(this, arguments);
    }
    const list = data.commandList;
    const s = currentSession?.list === list ? currentSession : newSession(list);
    const needed = required(s, data.startCnt);
    for (const item of needed) if (item.status === 'done') item.command._arguments[item.index] = item.translated;
    enqueue(s, needed, data.startCnt);
    const waiting = needed.filter(i => i.status === 'new' || i.status === 'pending').length;
    stats.waiting = waiting;
    if (waiting) {
      updateStatus('正在翻译对白… 已完成 ' + stats.translated + ' 条');
      return; // Async gate before the original manager initializes any commands.
    }
    updateStatus(stats.failed ? '译文 ' + stats.translated + ' 条 · ' + stats.failed + ' 条回退原文' : 'Cocos Web 翻译已启用 · ' + stats.translated + ' 条');
    return playWithHistory.call(this, root, arguments, s, needed);
  }

  function validUiComponent(component) {
    if (!component?.node || component.node.activeInHierarchy === false || component.enabledInHierarchy === false) return false;
    try { if (global.cc?.isValid && !global.cc.isValid(component)) return false; } catch (_) { return false; }
    return true;
  }

  function excludedUi(component) {
    const cc = global.cc;
    for (let node = component.node; node; node = node.parent) {
      let components = [];
      try { components = node.getComponents(cc.Component); } catch (_) { /* unavailable node */ }
      for (const c of components) {
        let className = '';
        try { className = cc.js.getClassName(c); } catch (_) { className = c.constructor?.name || ''; }
        if (/AdvRichText|MessageView|NameView|ChatView|ChatMessage|PlayerName|UserName|NickName/.test(className) ||
            (cc.EditBox && c instanceof cc.EditBox)) return true;
      }
      // RichText owns generated Label segments; translate its full string once.
      if (node !== component.node && cc.RichText && components.some(c => c instanceof cc.RichText)) return true;
    }
    return false;
  }

  function restoreUi() {
    for (const [component, binding] of uiBindings) {
      restoreUiBinding(component, binding);
      if (binding.status === 'failed') uiBindings.delete(component);
    }
  }

  function ownsUiFont(component, binding) {
    return binding?.fontChanged && component.useSystemFont === true &&
      component.fontFamily === 'Microsoft YaHei' && component.font == null;
  }

  function restoreUiBinding(component, binding) {
    try {
      if (component?.node && (!global.cc?.isValid || global.cc.isValid(component))) {
        if (component.string === binding.translated) component.string = binding.original;
        if (ownsUiFont(component, binding)) Object.assign(component, binding.fontOriginal);
      }
      binding.fontChanged = false;
      binding.applied = false;
    } catch (_) { /* destroyed scene */ }
  }

  function applyUi(component, binding) {
    if (!validUiComponent(component) || component.string !== binding.original || stopped || stats.paused || !config.uiEnabled) return;
    if (config.systemFont && 'useSystemFont' in component && !binding.fontChanged) {
      binding.fontOriginal = { useSystemFont: component.useSystemFont, font: component.font, fontFamily: component.fontFamily };
      component.font = null;
      component.useSystemFont = true;
      component.fontFamily = 'Microsoft YaHei';
      binding.fontChanged = true;
    }
    component.string = binding.translated;
    binding.applied = true;
  }

  async function scanUi() {
    const cc = global.cc;
    if (stopped || stats.paused || !config.uiEnabled || uiBusy || !cc?.director?.getScene || !cc.Label) return;
    let scene, components;
    try {
      scene = cc.director.getScene();
      if (!scene) return;
      components = [...scene.getComponentsInChildren(cc.Label), ...(cc.RichText ? scene.getComponentsInChildren(cc.RichText) : [])];
    } catch (_) { return; }
    const live = new Set(components);
    for (const component of uiBindings.keys()) {
      if (!live.has(component) || (cc.isValid && !cc.isValid(component))) {
        const binding = uiBindings.get(component);
        restoreUiBinding(component, binding);
        uiBindings.delete(component);
      }
    }
    const pending = [];
    stats.uiScanned = components.filter(validUiComponent).length;
    stats.uiDetected = 0;
    for (const component of components) {
      if (!validUiComponent(component) || excludedUi(component)) continue;
      const text = component.string;
      if (typeof text !== 'string' || !text.trim() || text.length > 1500) continue;
      const old = uiBindings.get(component);
      if (old && (text === old.original || text === old.translated)) {
        stats.uiDetected++;
        if (old.status === 'done' && text === old.original) applyUi(component, old);
        continue;
      }
      const bare = text.replace(/<[^>]*>/g, '').trim();
      if (!/[\u3040-\u30ff]/.test(bare) && !uiKanji.has(bare)) continue;
      stats.uiDetected++;
      if (pending.length < 4) {
        const binding = { original: text, translated: text, status: 'pending', applied: false,
          fontChanged: ownsUiFont(component, old), fontOriginal: old?.fontOriginal };
        uiBindings.set(component, binding);
        pending.push({ id: String(pending.length), component, binding });
      }
    }
    updateStatus();
    if (!pending.length) return;
    uiBusy = true;
    const controller = new global.AbortController();
    uiController = controller;
    const timeout = global.setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await serviceFetch(config.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', signal: controller.signal,
        body: JSON.stringify({ clientVersion: '0.8.0', items: pending.map(item => ({ id: item.id, text: item.binding.original, kind: 'ui' })) }),
      });
      if (!response.ok) throw new Error('UI translation unavailable');
      const body = await response.json();
      for (const item of pending) {
        if (stopped || uiBindings.get(item.component) !== item.binding) continue;
        const reply = body.items?.find(r => r.id === item.id);
        const tags = text => text.match(/<[^>]*>/g) || [];
        if (!reply || reply.error || typeof reply.text !== 'string' || !reply.text.trim() ||
            reply.text.length > item.binding.original.length * 5 + 300 ||
            JSON.stringify(tags(reply.text)) !== JSON.stringify(tags(item.binding.original))) {
          item.binding.status = 'failed'; stats.uiFailed++;
        } else {
          item.binding.translated = reply.text; item.binding.status = 'done';
          applyUi(item.component, item.binding); stats.uiTranslated++;
        }
      }
    } catch (_) {
      for (const item of pending) { item.binding.status = 'failed'; stats.uiFailed++; }
    } finally {
      global.clearTimeout(timeout);
      uiBusy = false;
      uiController = null;
      updateStatus();
    }
  }

  function attach() {
    if (stopped || typeof global.__require !== 'function') return false;
    const candidate = safeModule('AdvManager');
    const c = safeModule('AdvConstants');
    if (!candidate || typeof candidate.update !== 'function' || typeof candidate.getAdvData !== 'function' || !c?.ADV_COMMAND_NAME) return false;
    manager = candidate;
    constants = c;
    nameType = safeModule('CommandName');
    originalUpdate = manager.update;
    manager.update = wrappedUpdate;
    stats.attached = true;
    updateStatus('Cocos Web 翻译已连接，下一句开始生效');
    return true;
  }

  if (!attach()) {
    updateStatus('等待 Cocos 剧情模块…');
    timer = global.setInterval(() => { if (attach()) { global.clearInterval(timer); timer = null; } }, 500);
  }
  if (config.syncSettings) {
    syncPreferences();
    settingsTimer = global.setInterval(syncPreferences, 3000);
  }
  uiTimer = global.setInterval(scanUi, config.uiScanMs);
})(typeof window !== 'undefined' ? window : globalThis);
