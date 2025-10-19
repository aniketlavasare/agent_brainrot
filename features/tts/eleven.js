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

  async function speak(text, opts = {}) {
    try {
      const t = (text || '').toString();
      if (!t) return;
      const { key, voice } = await getKeyAndVoice();
      if (!key || !voice) return; // missing creds
      const endpoint = `${API_BASE}/text-to-speech/${encodeURIComponent(voice)}`;
      const body = {
        text: t,
        model_id: opts.model_id || 'eleven_turbo_v2',
        voice_settings: opts.voice_settings || { stability: 0.5, similarity_boost: 0.8 }
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`EL ${res.status}`);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.src = url;
      audio.volume = typeof opts.volume === 'number' ? opts.volume : 1.0;
      audio.onended = () => { try { URL.revokeObjectURL(url); } catch {} };
      try { await audio.play(); } catch (e) { /* autoplay may be blocked */ }
    } catch (e) {
      try { console.warn('[ABTTS] speak failed', e); } catch {}
    }
  }

  (globalThis || window).ABTTS = { speak, getKeyAndVoice };
})();

