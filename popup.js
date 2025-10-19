(() => {
  const geminiKeyEl = document.getElementById('geminiKey');
  const keywordsEl = document.getElementById('keywords');
  const shortsOnlyEl = document.getElementById('shortsOnly');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('save');
  const clearBtn = document.getElementById('clear');
  const toggleSwitch = document.getElementById('toggleSwitch');
  const elevenKeyEl = document.getElementById('elevenKey');
  const elevenVoiceEl = document.getElementById('elevenVoice');

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
      chrome.storage.local.get(['ab_gemini_api_key','ab_feed_keywords','ab_shorts_only','ab_eleven_api_key','ab_eleven_voice_id'], (res) => {
        geminiKeyEl.value = res?.ab_gemini_api_key || '';
        keywordsEl.value = joinKeywords(res?.ab_feed_keywords || []);
        shortsOnlyEl.checked = res?.ab_shorts_only !== false; // default true
        elevenKeyEl.value = res?.ab_eleven_api_key || '';
        elevenVoiceEl.value = res?.ab_eleven_voice_id || '';
      });
    } catch {}
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = (geminiKeyEl.value || '').trim();
    const kw = parseKeywords(keywordsEl.value);
    const so = !!shortsOnlyEl.checked;
    try {
      chrome.storage.local.set({ ab_gemini_api_key: apiKey, ab_feed_keywords: kw, ab_shorts_only: so, ab_eleven_api_key: (elevenKeyEl.value||'').trim(), ab_eleven_voice_id: (elevenVoiceEl.value||'').trim() }, () => {
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
      chrome.storage.local.remove(['ab_gemini_api_key','ab_feed_keywords','ab_shorts_only','ab_eleven_api_key','ab_eleven_voice_id'], () => show('Cleared'));
    } catch (e) {
      show('Failed to clear', false);
    }
  });

    // Toggle agent from popup with label sync
  async function getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch { return null; }
  }

  function setToggleChecked(open) {
    if (toggleSwitch) toggleSwitch.checked = !!open;
  }

  async function refreshToggleLabel() {
    const tab = await getActiveTab();
    if (!tab?.id) { setToggleChecked(false); return; }
    try {
      const state = await chrome.tabs.sendMessage(tab.id, { type: 'AB_GET_AGENT_STATE' });
      setToggleChecked(!!state?.open);
    } catch {
      setToggleChecked(false);
    }
  }

  toggleSwitch?.addEventListener('change', async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'AB_TOGGLE_AGENT' });
      // If switching on, speak immediately (user gesture ensures autoplay)
      if (toggleSwitch.checked) {
        try { window.ABTTS?.speak('Howdy!', { volume: 0.9 }); } catch {}
      }
      setTimeout(refreshToggleLabel, 150);
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { type: 'AB_TOGGLE_AGENT' });
        if (toggleSwitch.checked) {
          try { window.ABTTS?.speak('Howdy!', { volume: 0.9 }); } catch {}
        }
        setTimeout(refreshToggleLabel, 200);
      } catch {}
    }
  });

  load();
  refreshToggleLabel();
})();
