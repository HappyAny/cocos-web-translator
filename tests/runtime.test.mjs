import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { gameHarness } from './fixtures/cocos.mjs';
import { area } from './fixtures/chrome.mjs';
import { TranslationEngine } from '../extension/engine.mjs';
const results = [];
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const prefetchCalls=[];
const bounded=gameHarness('standard',async(_url,options)=>{
  const items=JSON.parse(options.body).items;prefetchCalls.push(items);
  return {ok:true,json:async()=>({items:items.map(item=>({id:item.id,text:item.text.replace('大丈夫ですか','你没事吧')}))})};
});
bounded.context.__CocosWebTranslator.config.lookahead=2;
bounded.data.commandList=Array.from({length:10},()=>new (bounded.get('CommandMessage'))(7,'<size=30>「大丈夫ですか？」</size>'))
  .flatMap(message=>[message,{...bounded.stop}]);
bounded.manager.update(bounded.root,1/60);await tick();
for(let i=0;i<10;i++){bounded.manager.update(bounded.root,1/60);await tick()}
assert.equal(prefetchCalls.length,1);assert.equal(prefetchCalls[0].length,3);
bounded.context.__CocosWebTranslator.uninstall();
results.push({case:'idle frames keep lookahead at exactly two future texts',passed:true});
for (const game of ['standard', 'extended']) {
  let release;
  const h = gameHarness(game, () => new Promise(resolve => { release = resolve; }));
  assert(h.context.__CocosWebTranslator.stats.attached);
  h.manager.update(h.root || {
    enabledInHierarchy: true, getPlayState: () => 2, getDebugSearchMessage: () => '',
    setMessage(tag, text) { h.displayed.push({ tag, text }); },
  }, 1 / 60);
  assert.equal(h.displayed.length, 0);
  assert.equal(h.data.messageCommandList.length, 0);
  release({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=30>「你没事吧？」</size>' }] }) });
  await tick();
  const root = { enabledInHierarchy: true, getPlayState: () => 2, getDebugSearchMessage: () => '',
    setMessage(tag, text) { h.displayed.push({ tag, text }); } };
  h.manager.update(root, 1 / 60);
  assert.equal(h.displayed.length, 1);
  assert.equal(h.displayed[0].text, '<size=30>「你没事吧？」</size>');
  assert.equal(h.displayed[0].tag, 7);
  assert.equal(h.stop._arguments[0], 'UNCHANGED_CONTROL');
  assert.equal(h.data.messageCommandList.length, 1);
  h.context.__CocosWebTranslator.uninstall();
  assert.equal(h.manager.update, h.originalUpdate);
  assert.equal(h.message._arguments[1], '<size=30>「大丈夫ですか？」</size>');
  results.push({ game, case: 'compatible manager and message class gate, display, control preservation, uninstall', passed: true });
}

for (const game of ['standard', 'extended']) {
  const h = gameHarness(game, async (_url, options) => {
    const body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ items: body.items.map(item => ({
      id: item.id, text: ({ '黒騎士': '黑骑士', '進みます': '继续前进', 'ここで待ちます': '原地等候' })[item.text],
    })) }) };
  });
  h.data.commandList = [new (h.get('CommandName'))('黒騎士'), new (h.get('CommandSelect'))('進みます', 'ここで待ちます')];
  const names = [], choices = [], branchKeys = [];
  const root = { ...h.root, setName: text => names.push(text),
    setSelectThumbnails: args => choices.push(Array.from(args)),
    setKeyValue: (...args) => branchKeys.push(args) };
  h.manager.update(root, 1 / 60);
  assert.equal(choices.length, 0);
  await tick();
  h.manager.update(root, 1 / 60);
  assert.deepEqual(names, ['黑骑士']);
  assert.deepEqual(choices, [['继续前进', '原地等候']]);
  assert.equal(branchKeys.length, 1);
  assert.equal(branchKeys[0][1], '=');
  assert.equal(branchKeys[0][2], 0);
  h.context.__CocosWebTranslator.uninstall();
  results.push({ game, case: 'compatible name and select commands render Chinese, choice order and branch initialization retained', passed: true });
}

const delayedReplies = [];
const switched = gameHarness('standard', () => new Promise(resolve => delayedReplies.push(resolve)));
const firstList = switched.data.commandList;
switched.manager.update(switched.root, 1 / 60);
const nextMessage = new (switched.get('CommandMessage'))(8, '<size=30>「ここはどこですか？」</size>');
switched.data.commandList = [nextMessage, switched.stop];
switched.manager.update(switched.root, 1 / 60);
delayedReplies[0]({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=30>过期译文</size>' }] }) });
delayedReplies[1]({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=30>这里是哪里？</size>' }] }) });
await tick();
assert.equal(switched.message._arguments[1], '<size=30>「大丈夫ですか？」</size>');
assert.equal(nextMessage._arguments[1], '<size=30>这里是哪里？</size>');
switched.data.commandList = firstList;
switched.manager.update(switched.root, 1 / 60);
assert.equal(switched.displayed.length, 0);
assert.equal(delayedReplies.length, 3);
delayedReplies[2]({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=30>你没事吧？</size>' }] }) });
await tick();
switched.manager.update(switched.root, 1 / 60);
assert.equal(switched.displayed[0].text, '<size=30>你没事吧？</size>');
assert.equal(nextMessage._arguments[1], '<size=30>「ここはどこですか？」</size>');
switched.context.__CocosWebTranslator.uninstall();
results.push({ case: 'scene change ignores stale reply and revisiting an aborted scene starts a fresh request', passed: true });

for (const [label, fetchImpl] of [
  ['network failure', async () => { throw new Error('offline'); }],
  ['HTTP failure', async () => ({ ok: false, status: 503 })],
  ['invalid rich-text tags', async () => ({ ok: true, json: async () => ({ items: [{ id: '0', text: '<size=99>伪造格式</size>' }] }) })],
  ['provider item failure', async () => ({ ok: true, json: async () => ({ items: [{ id: '0', text: '原文', error: 'quota' }] }) })],
]) {
  const h = gameHarness('standard', fetchImpl);
  const root = { enabledInHierarchy: true, getPlayState: () => 2, getDebugSearchMessage: () => '',
    setMessage(tag, text) { h.displayed.push({ tag, text }); } };
  h.manager.update(root, 1 / 60);
  await tick();
  h.manager.update(root, 1 / 60);
  assert.equal(h.displayed[0].text, '<size=30>「大丈夫ですか？」</size>');
  assert.equal(h.context.__CocosWebTranslator.stats.failed, 1);
  h.context.__CocosWebTranslator.uninstall();
  results.push({ case: label + ' falls back without repeated initialization', passed: true });
}

const timed = gameHarness('standard', (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(new Error('aborted')));
}));
timed.context.__CocosWebTranslator.config.timeoutMs = 15;
const timedRoot = { enabledInHierarchy: true, getPlayState: () => 2, getDebugSearchMessage: () => '',
  setMessage(tag, text) { timed.displayed.push({ tag, text }); } };
timed.manager.update(timedRoot, 1 / 60);
await new Promise(resolve => setTimeout(resolve, 30));
timed.manager.update(timedRoot, 1 / 60);
assert.equal(timed.displayed.length, 1);
timed.context.__CocosWebTranslator.uninstall();
results.push({ case: 'timeout releases the playback gate', passed: true });

const rolePrefetchCalls = [], rolePrefetch = gameHarness('standard', async (_url, options) => {
  const items = JSON.parse(options.body).items; rolePrefetchCalls.push(...items);
  return { ok: true, json: async () => ({ items: items.map(item => ({ id: item.id, text: item.text.replace('セリフ', 'Line').replace('アリス', 'Alice') })) }) };
});
rolePrefetch.context.__CocosWebTranslator.config.lookahead = 2;
rolePrefetch.data.commandList = Array.from({ length: 10 }, (_, i) => [new (rolePrefetch.get('CommandName'))('アリス' + i), new (rolePrefetch.get('CommandMessage'))(7, 'セリフ' + i), { ...rolePrefetch.stop, _state: 0 }]).flat();
for (let i = 0; i < 10; i++) { rolePrefetch.manager.update(rolePrefetch.root, 1 / 60); await tick(); }
assert.equal(rolePrefetchCalls.filter(item => item.text.startsWith('セリフ')).length, 3);
assert.equal(rolePrefetchCalls.filter(item => item.text.startsWith('アリス')).length, 3);
rolePrefetch.context.__CocosWebTranslator.uninstall();
results.push({ case: 'lookahead counts two future dialogue lines, includes their names, and stays bounded on idle frames', passed: true });

for (const game of ['standard', 'extended']) {
  const calls = [], h = gameHarness(game, async (_url, options) => {
    const items = JSON.parse(options.body).items; calls.push(items);
    return { ok: true, json: async () => ({ items: items.map(item => ({ id: item.id, text: item.text.replace('セリフ', 'Line').replace('アリス', 'Alice').replace('ボブ', 'Bob') })) }) };
  });
  const api = h.context.__CocosWebTranslator; api.config.historyEnabled = true; api.config.historyMaxEntries = 1;
  let now = Date.now(); h.context.Date = class extends Date { static now() { return now; } };
  const Message = h.get(game === 'extended' ? 'ExtensionCommandMessage' : 'CommandMessage');
  h.data.commandList = ['アリス', 'ボブ', 'アリス'].flatMap((speaker, i) => [new (h.get('CommandName'))(speaker), new Message(7, 'セリフ' + i), { ...h.stop, _state: 0 }]);
  const originalSetter = h.root.setMessage;
  h.manager.update(h.root, 1 / 60); await tick(); h.manager.update(h.root, 1 / 60);
  assert.equal(api.inspect().historyEntries, 1); assert.equal(h.root.setMessage, originalSetter);
  assert(calls[0].every(item => item.history.length === 0));
  h.data.startCnt = 3; h.data.cnt = 3;
  h.manager.update(h.root, 1 / 60); await tick(); h.manager.update(h.root, 1 / 60);
  assert.equal(calls[1][0].history.length, 1); assert.equal(calls[1][0].history[0].speaker, 'アリス'); assert.equal(calls[1][0].history[0].text, 'セリフ0');
  assert(!calls[1][0].history.some(row => row.text === 'セリフ1')); assert.equal(api.inspect().historyEntries, 1);
  now += 24 * 60 * 60000; h.data.startCnt = 6; h.data.cnt = 6;
  h.manager.update(h.root, 1 / 60); await tick(); h.manager.update(h.root, 1 / 60);
  assert(calls[2].every(item => item.history.length === 1));
  assert.equal(calls[2][0].history[0].speaker, 'ボブ'); assert.equal(calls[2][0].history[0].text, 'セリフ1');
  assert(!Object.hasOwn(calls[2][0].history[0], 'at'));
  h.data.commandList = [new (h.get('CommandName'))('漢名'), new Message(7, 'セリフ新'), { ...h.stop, _state: 0 }]; h.data.startCnt = 0; h.data.cnt = 0; h.data.messageCommandList = [];
  h.manager.update(h.root, 1 / 60); await tick(); h.manager.update(h.root, 1 / 60);
  assert.equal(calls[3][0].speaker, '漢名'); assert(calls[3].every(item => item.history.length === 0)); assert.equal(h.root.setMessage, originalSetter);
  api.uninstall();
  results.push({ game, case: 'history records displayed dialogue with original speaker, excludes future lines, keeps the latest count after a day pause, resets per scene and restores the setter', passed: true });
}
const profileCalls = [], profileRuntime = gameHarness('standard', async (_url, options) => {
  const items = JSON.parse(options.body).items; profileCalls.push(items);
  return { ok: true, json: async () => ({ items: items.map(item => ({ id: item.id, text: item.text.replace('大丈夫ですか', '你没事吧') })) }) };
});
const profileApi = profileRuntime.context.__CocosWebTranslator;
profileApi.applyPreferences({ profileId: 'first', providerSignature: 'first:signature', revision: 1, storyEnabled: true, historyEnabled: true });
profileRuntime.manager.update(profileRuntime.root, 1 / 60); await tick(); profileRuntime.manager.update(profileRuntime.root, 1 / 60);
assert.equal(profileApi.inspect().historyEntries, 1); assert(profileRuntime.message._arguments[1].includes('你没事吧'));
profileApi.applyPreferences({ profileId: 'second', providerSignature: 'second:signature', revision: 2, storyEnabled: true });
assert.equal(profileApi.inspect().historyEntries, 0); assert(profileRuntime.message._arguments[1].includes('大丈夫ですか'));
profileApi.applyPreferences({ profileId: null, profileRequired: true, providerSignature: 'unbound', revision: 3 });
assert(!profileApi.config.storyEnabled && !profileApi.config.uiEnabled);
const beforeUnbound = profileCalls.length; profileRuntime.manager.update(profileRuntime.root, 1 / 60); await tick(); assert.equal(profileCalls.length, beforeUnbound);
profileApi.applyPreferences({ profileId: 'first', providerSignature: 'first:signature', revision: 2, storyEnabled: true }); assert.equal(profileApi.config.profileId, null);
profileApi.uninstall();
results.push({ case: 'profile switch clears dialogue history and translations; unbound profiles stop requests; stale preference reads cannot restore an old profile', passed: true });

for (const game of ['standard', 'extended']) {
  const values = new Map(), engine = new TranslationEngine({
    storage: { local: area(), session: area() }, cache: { get: async key => values.get(key), put: async (key, text) => values.set(key, text) },
    glossary: {}, permitted: async () => true,
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '第一行\\n第二行¥n第三行' } }] }) }),
  });
  await engine.configure({ provider: 'openai', apiBase: 'https://model.invalid/v1', model: 'TEST_MODEL' });
  const h = gameHarness(game, async (_url, options) => ({ ok: true, json: async () => engine.translate(JSON.parse(options.body).items) }));
  const original = h.message._arguments[1], api = h.context.__CocosWebTranslator;
  try {
    h.manager.update(h.root, 1 / 60);
    for (let i = 0; i < 100 && !api.stats.translated; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.stats.failed, 0); assert.equal(api.stats.translated, 1);
    h.manager.update(h.root, 1 / 60);
    assert.equal(h.displayed[0].text, '<size=30>第一行\n第二行\n第三行</size>');
  } finally { api.uninstall(); }
  assert.equal(h.message._arguments[1], original);
  results.push({ game, case: 'provider newline escapes pass through the engine and dialogue player as actual line breaks, with tags and original restoration intact', passed: true });
}

writeFileSync(new URL('../.test-output/runtime.json', import.meta.url), JSON.stringify({
  passed: results.length, total: results.length, results,
  sourceBoundary: 'Synthetic compatible Cocos command interfaces and views.',
}, null, 2) + '\n');
console.log(JSON.stringify({ passed: results.length, total: results.length }));
