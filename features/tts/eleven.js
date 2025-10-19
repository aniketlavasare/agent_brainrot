;(function(){
  const API_BASE = 'https://api.elevenlabs.io/v1';
  let __envTried = false;
  let __envKey = '';
  let __envVoice = '';

  async function loadEnv() {
    if (__envTried) return;
    __envTried = true;
    try {
      const url = chrome?.runtime?.getURL?.('.env');
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) return;
      const text = await res.text();
      const mk = text.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m);
      const mv = text.match(/^\s*ELEVENLABS_VOICE_ID\s*=\s*(.+)\s*$/m);
      __envKey = (mk && mk[1] ? mk[1].trim() : '') || __envKey;
      __envVoice = (mv && mv[1] ? mv[1].trim() : '') || __envVoice;
    } catch {}
  }

  async function getKeyAndVoice() {
    await loadEnv();
    if (__envKey && __envVoice) return { key: __envKey, voice: __envVoice };
    return new Promise((resolve) => {
      try {
        chrome.storage?.local.get(['ab_eleven_api_key','ab_eleven_voice_id'], (res) => {
          const key = __envKey || (res?.ab_eleven_api_key || '');
          const voice = __envVoice || (res?.ab_eleven_voice_id || '');
          resolve({ key, voice });
        });
      } catch {
        resolve({ key: __envKey, voice: __envVoice });
      }
    });
  }

  let __currentAudio = null;
  let __currentUrl = null;
  let __ctrl = null;\nlet __lastRequestAt = 0;\nconst MIN_INTERVAL_MS = 1000;

  function stop() {
    try { if (__ctrl) { try { __ctrl.abort(); } catch {} __ctrl = null; } } catch {}
    try { if (__currentAudio) { try { __currentAudio.pause(); } catch {} __currentAudio.src = ''; } } catch {}
    try { if (__currentUrl) { URL.revokeObjectURL(__currentUrl); } } catch {}
    __currentAudio = null; __currentUrl = null;
  }

  async function unlock() {
    try {
      if (!__currentAudio) __currentAudio = new Audio();
      // Tiny silent WAV to prime autoplay in some browsers
      const silent = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
      __currentAudio.src = silent;
      __currentAudio.volume = 0.0;
      await __currentAudio.play().catch(() => {});
      try { __currentAudio.pause(); } catch {}
      __currentAudio.src = '';
    } catch {}
  }

  async function speak(text, opts = {}) {
    try {
      const t = (text || '').toString();
      if (!t) return;
      if (!opts.allowOverlap) stop();
      const { key, voice } = await getKeyAndVoice();
      if (!key || !voice) return; // missing creds
      const endpoint = `${API_BASE}/text-to-speech/${encodeURIComponent(voice)}`;
      const body = {
        text: t,
        model_id: opts.model_id || 'eleven_turbo_v2',
        voice_settings: opts.voice_settings || { stability: 0.5, similarity_boost: 0.8 }
      };
      __ctrl = new AbortController();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(body),
        signal: __ctrl.signal
      });
      if (!res.ok) throw new Error(`EL ${res.status}`);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (!__currentAudio) __currentAudio = new Audio();
      __currentAudio.src = url;
      __currentAudio.volume = typeof opts.volume === 'number' ? opts.volume : 1.0;
      __currentAudio.onended = () => { try { URL.revokeObjectURL(url); } catch {} __currentUrl = null; };
      __currentUrl = url; __ctrl = null;
      try { await __currentAudio.play(); } catch (e) { /* autoplay may be blocked */ }
    } catch (e) {
      try { console.warn('[ABTTS] speak failed', (e && e.message) ? e.message : String(e)); } catch {}
    }
  }

  (globalThis || window).ABTTS = { speak, getKeyAndVoice, stop, unlock };
})();

