(() => {
  const geminiKeyEl = document.getElementById('geminiKey');
  const keywordsEl = document.getElementById('keywords');
  const shortsOnlyEl = document.getElementById('shortsOnly');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('save');
  const clearBtn = document.getElementById('clear');
  const toggleBtn = document.getElementById('toggle');

  function show(msg, ok=true) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#0a7' : '#c00';
    setTimeout(() => (statusEl.textContent = ''), 1500);
  }

  function parseKeywords(text) {
    return (text || '')
      .split(/[,\n]/g)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function joinKeywords(arr) {
    return Array.isArray(arr) ? arr.join(', ') : '';
  }

  function load() {
    try {
      chrome.storage.local.get(['ab_gemini_api_key','ab_feed_keywords','ab_shorts_only'], (res) => {
        geminiKeyEl.value = res?.ab_gemini_api_key || '';
        keywordsEl.value = joinKeywords(res?.ab_feed_keywords || []);
        shortsOnlyEl.checked = res?.ab_shorts_only !== false; // default true
      });
    } catch {}
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = (geminiKeyEl.value || '').trim();
    const kw = parseKeywords(keywordsEl.value);
    const so = !!shortsOnlyEl.checked;
    try {
      chrome.storage.local.set({ ab_gemini_api_key: apiKey, ab_feed_keywords: kw, ab_shorts_only: so }, () => {
        show('Saved');
      });
    } catch (e) {
      show('Failed to save', false);
    }
  });

  clearBtn.addEventListener('click', () => {
    geminiKeyEl.value = '';
    keywordsEl.value = '';
    shortsOnlyEl.checked = true;
    try {
      chrome.storage.local.remove(['ab_gemini_api_key','ab_feed_keywords','ab_shorts_only'], () => show('Cleared'));
    } catch (e) {
      show('Failed to clear', false);
    }
  });

  // Toggle agent from popup
  toggleBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'AB_TOGGLE_AGENT' }).catch(async () => {
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          chrome.tabs.sendMessage(tab.id, { type: 'AB_TOGGLE_AGENT' }).catch(() => {});
        } catch {}
      });
    } catch {}
  });

  load();
})();
