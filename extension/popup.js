import { t, setLanguage, getLanguage, localizeError, applyLanguage } from './i18n.mjs';
import { TARGET_LANGUAGES } from './core.mjs';
import { sitePattern } from './site-access.mjs';
const $ = id => document.getElementById(id);
let page;
async function request(action, payload) { const reply = await chrome.runtime.sendMessage({ action, payload }); if (!reply?.ok) throw new Error(reply?.error || '扩展后台无响应'); return reply.data; }
function fill(data) {
  setLanguage(data.interfaceLanguage);
  for (const key of ['storyEnabled', 'uiEnabled']) $(key).checked = data[key];
  $('provider').textContent = (data.provider === 'mymemory' ? 'MyMemory' : 'OpenAI API') + ' → ' + (TARGET_LANGUAGES[data.targetLanguage]?.[getLanguage() === 'en' ? 'english' : 'native'] || 'Simplified Chinese');
}
function selected() { return [...$('origins').querySelectorAll('input:checked')].map(input => input.value); }
function selectionEnabled() { const values = selected(); return values.length > 0 && values.every(origin => page.origins.find(row => row.origin === origin)?.enabled); }
function renderToggle() { $('siteToggle').disabled = !selected().length; $('siteToggle').textContent = t(selectionEnabled() ? 'disablePage' : 'enablePage'); }
async function readPage() {
  page = await request('getPageContext'); $('origins').replaceChildren();
  for (const row of page.origins) {
    const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
    input.type = 'checkbox'; input.value = row.origin; input.checked = true; text.textContent = row.origin;
    input.addEventListener('change', renderToggle); label.className = 'origin'; label.append(input, text); $('origins').append(label);
  }
  renderToggle(); if (!page.origins.length) $('status').textContent = t('noWebPage');
}
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
$('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
applyLanguage();
request('getPreferences').then(async data => { fill(data); await readPage(); }).catch(error => { $('status').textContent = localizeError(error.message); });
