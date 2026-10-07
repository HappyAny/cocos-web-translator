import { t, setLanguage, getLanguage, localizeError, applyLanguage } from './i18n.mjs';
import { TARGET_LANGUAGES } from './core.mjs';
import { sitePattern } from './site-access.mjs';
const $ = id => document.getElementById(id);
$('popupVersion').textContent = 'v' + chrome.runtime.getManifest().version;
let page, preferences, profileList = [];
async function request(action, payload) { const reply = await chrome.runtime.sendMessage({ action, payload }); if (!reply?.ok) throw new Error(reply?.error || '扩展后台无响应'); return reply.data; }
function fill(data) {
  preferences = data;
  setLanguage(data.interfaceLanguage);
  $('pauseToggle').disabled = false;
  $('pauseToggle').textContent = t(data.paused ? 'resumeTranslation' : 'pauseTranslation');
  $('pauseToggle').setAttribute('aria-pressed', String(!!data.paused));
  for (const key of ['storyEnabled', 'uiEnabled']) { $(key).checked = data[key]; $(key).disabled = !data.profileId; }
  $('provider').textContent = !data.profileId ? t('noProfileProvider') : (data.provider === 'mymemory' ? 'MyMemory' : 'OpenAI API') + ' → ' + (TARGET_LANGUAGES[data.targetLanguage]?.[getLanguage() === 'en' ? 'english' : 'native'] || 'Simplified Chinese');
  renderProfiles();
}
function profileLabel(item) { return item.isDefault && item.name === 'Default' ? t('defaultProfile') : item.name; }
function renderProfiles() {
  const choose = document.createElement('option'); choose.value = ''; choose.textContent = t('chooseProfile');
  $('profileSelect').replaceChildren(choose, ...profileList.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = profileLabel(item); return option; }));
  $('profileSelect').value = preferences?.profileId || ''; $('profileSelect').disabled = !page?.scope;
  $('profileHint').textContent = t(preferences?.profileId ? 'profileBindingHint' : 'profileRequired');
}
$('pauseToggle').addEventListener('click', async () => {
  $('pauseToggle').disabled = true;
  try {
    fill(await request('setPreferences', { paused: !preferences.paused }));
    $('status').textContent = t(preferences.paused ? 'translationPaused' : 'translationResumed');
  } catch (error) { $('status').textContent = localizeError(error.message); $('pauseToggle').disabled = false; }
});
function selected() { return [...$('origins').querySelectorAll('input:checked')].map(input => input.value); }
function selectionEnabled() { const values = selected(); return values.length > 0 && values.every(origin => page.origins.find(row => row.origin === origin)?.enabled); }
function renderToggle() { $('siteToggle').disabled = !selected().length; $('siteToggle').textContent = t(selectionEnabled() ? 'disablePage' : 'enablePage'); }
async function readPage() {
  page = await request('getPageContext'); $('pageScope').textContent = page.scope || ''; profileList = (await request('getProfiles')).profiles; renderProfiles(); $('origins').replaceChildren();
  for (const row of page.origins) {
    const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
    input.type = 'checkbox'; input.value = row.origin; input.checked = true; text.textContent = row.origin;
    input.addEventListener('change', renderToggle); label.className = 'origin'; label.append(input, text); $('origins').append(label);
  }
  renderToggle(); if (!page.origins.length) $('status').textContent = t('noWebPage');
  else if (!page.profileId) $('status').textContent = t('profileRequired');
}
$('profileSelect').addEventListener('change', async () => {
  const id = $('profileSelect').value; $('profileSelect').disabled = true;
  try {
    fill(await request('bindPageProfile', { id, tabId: page.tabId, scope: page.scope })); await readPage();
    $('status').textContent = id ? t('profileBound', { name: profileLabel(profileList.find(item => item.id === id)) }) : t('profileUnbound');
  } catch (error) { $('status').textContent = localizeError(error.message); renderProfiles(); }
});
for (const key of ['storyEnabled', 'uiEnabled']) $(key).addEventListener('change', async () => { try { fill(await request('setPreferences', { [key]: $(key).checked })); $('status').textContent = t('saved'); } catch (error) { $('status').textContent = localizeError(error.message); } });
$('siteToggle').addEventListener('click', async () => {
  $('siteToggle').disabled = true;
  try {
    const origins = selected();
    if (selectionEnabled()) { await request('disableSites', { origins, tabId: page.tabId }); $('status').textContent = t('pageDisabled'); }
    else {
      if (!await chrome.permissions.request({ origins: origins.map(sitePattern) })) throw new Error('需要允许扩展访问所选网页');
      const result = await request('enableSites', { origins, tabId: page.tabId }); $('status').textContent = t(result.needsRefresh ? 'pageRefresh' : 'pageEnabled');
    }
    await readPage();
  } catch (error) { $('status').textContent = localizeError(error.message); renderToggle(); }
});
function openSettings(create = false) {
  const url = new URL(chrome.runtime.getURL('options.html'));
  if (preferences?.profileId) url.searchParams.set('profile', preferences.profileId);
  if (create) url.searchParams.set('new', '1');
  return chrome.tabs.create({ url: url.href });
}
$('settings').addEventListener('click', () => openSettings());
$('createProfile').addEventListener('click', () => openSettings(true));
$('update').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('update.html') }));
applyLanguage();
request('getPreferences').then(async data => { fill(data); await readPage(); }).catch(error => { $('status').textContent = localizeError(error.message); });
