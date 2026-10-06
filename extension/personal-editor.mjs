import { t, localizeError, onLanguageChange } from './i18n.mjs';

export function initializePersonalEditor(request, enabled = true) {
const $ = id => document.getElementById(id);
let cacheInfo, lastStatus;
function personalMessage(key, values = {}, error = false) { lastStatus = { key, values, error }; $('personalStatus').textContent = t(key, values); $('personalStatus').className = 'status' + (error ? ' error' : ''); }
function personalError(error) { lastStatus = undefined; $('personalStatus').textContent = localizeError(error.message); $('personalStatus').className = 'status error'; }
function renderCacheInfo() { if (cacheInfo) $('cacheInfo').textContent = t('cacheCounts', cacheInfo) + (cacheInfo.legacy ? t('legacyCounts', cacheInfo) : ''); }
onLanguageChange(() => { renderCacheInfo(); if (lastStatus) personalMessage(lastStatus.key, lastStatus.values, lastStatus.error); });
async function refreshCacheInfo() {
  if (!enabled) return;
  cacheInfo = await request('getCacheStats'); renderCacheInfo();
}
$('exportTranslations').addEventListener('click', async () => {
  $('exportTranslations').disabled = true;
  try {
    const data = await request('exportTranslations'), url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cocos-translations-' + data.targetLanguage + '.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    personalMessage('exported', { count: Object.keys(data.translations).length });
  } catch (error) { personalError(error); } finally { $('exportTranslations').disabled = false; }
});
$('importTranslations').addEventListener('click', () => $('translationFile').click());
$('translationFile').addEventListener('change', async () => {
  const file = $('translationFile').files[0]; if (!file) return; $('importTranslations').disabled = true;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('译文文件最多 10 MB');
    let data; try { data = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch { throw new Error('译文 JSON 格式错误，请检查引号、逗号和括号'); }
    const result = await request('importTranslations', data); await refreshCacheInfo();
    personalMessage('imported', { count: result.imported });
  } catch (error) { personalError(error); } finally { $('translationFile').value = ''; $('importTranslations').disabled = false; }
});
for (const [id, action] of [['readPersonal', 'getPersonalTranslation'], ['savePersonal', 'setPersonalTranslation'], ['removePersonal', 'removePersonalTranslation']]) {
  $(id).addEventListener('click', async () => {
    $(id).disabled = true;
    try {
      const result = await request(action, { original: $('personalOriginal').value, translation: $('personalTranslation').value });
      if (action === 'getPersonalTranslation') { $('personalTranslation').value = result.translation; personalMessage(result.translation ? 'editRead' : 'editMissing'); }
      else { await refreshCacheInfo(); personalMessage(action === 'setPersonalTranslation' ? 'editSaved' : 'editRemoved'); }
    } catch (error) { personalError(error); } finally { $(id).disabled = false; }
  });
}
$('personalCard').hidden = !enabled;
return refreshCacheInfo;
}
