;(function(){
  'use strict';
  const API_BASE = 'https://api.elevenlabs.io/v1';
  let __envTried = false;
  let __envKey = '';
  let __envVoice = '';

  function getRuntimeUrl(path) {
    try { return (chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(path) : ''; } catch (e) { return ''; }
  }

  async function loadEnv() {
    if (__envTried) return;
    __envTried = true;
    try {
      const url = getRuntimeUrl('.env');
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) return;
      const text = await res.text();
      const mk = text.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m);
      const mv = text.match(/^\s*ELEVENLABS_VOICE_ID\s*=\s*(.+)\s*$/m);
      __envKey = (mk && mk[1] ? mk[1].trim() : '') || __envKey;
      __envVoice = (mv && mv[1] ? mv[1].trim() : '') || __envVoice;
    } catch (e) {}
  }

  async function getKeyAndVoice() {
    await loadEnv();
    if (__envKey && __envVoice) return { key: __envKey, voice: __envVoice };
    return new Promise(function(resolve){
      try {
        if (chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
          chrome.storage.local.get(['ab_eleven_api_key','ab_eleven_voice_id'], function(res){
            var key = __envKey || (res && res.ab_eleven_api_key) || '';
            var voice = __envVoice || (res && res.ab_eleven_voice_id) || '';
            resolve({ key: key, voice: voice });
          });
        } else {
          resolve({ key: __envKey, voice: __envVoice });
        }
      } catch (e) {
        resolve({ key: __envKey, voice: __envVoice });
      }
    });
  }

  var __currentAudio = null;
  var __currentUrl = null;
  var __ctrl = null;
  var __lastRequestAt = 0;
  var MIN_INTERVAL_MS = 1000;

  function stop() {
    try { if (__ctrl) { try { __ctrl.abort(); } catch (e) {} __ctrl = null; } } catch (e) {}
    try { if (__currentAudio) { try { __currentAudio.pause(); } catch (e) {} __currentAudio.src = ''; } } catch (e) {}
    try { if (__currentUrl) { URL.revokeObjectURL(__currentUrl); } } catch (e) {}
    __currentAudio = null; __currentUrl = null;
  }

  async function unlock() {
    try {
      if (!__currentAudio) __currentAudio = new Audio();
      var silent = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
      __currentAudio.src = silent;
      __currentAudio.volume = 0.0;
      try { await __currentAudio.play(); } catch (e) {}
      try { __currentAudio.pause(); } catch (e) {}
      __currentAudio.src = '';
    } catch (e) {}
  }

  async function speak(text, opts) {
    opts = opts || {};
    try {
      var t = (text == null ? '' : String(text));
      if (!t) return;
      if (!opts.allowOverlap) stop();
      var kv = await getKeyAndVoice();
      var key = kv.key, voice = kv.voice;
      if (!key || !voice) return;
      var endpoint = API_BASE + '/text-to-speech/' + encodeURIComponent(voice);
      var modelId = opts.model_id || 'eleven_turbo_v2';
      var body = { text: t, model_id: modelId, voice_settings: (opts.voice_settings || { stability: 0.5, similarity_boost: 0.8 }) };

      __ctrl = new AbortController();
      var now = Date.now();
      var delta = now - __lastRequestAt;
      if (delta < MIN_INTERVAL_MS) { await new Promise(function(r){ setTimeout(r, MIN_INTERVAL_MS - delta); }); }

      var res;
      for (var attempt = 0; attempt < 2; attempt++) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify(body),
          signal: __ctrl.signal
        });
        __lastRequestAt = Date.now();
        if (res.status === 429 && attempt === 0) {
          var ra = Number(res.headers.get('Retry-After'));
          var wait = (isFinite(ra) && ra > 0) ? (ra * 1000) : 1500;
          await new Promise(function(r){ setTimeout(r, wait); });
          continue;
        }
        break;
      }
      if (!res.ok) throw new Error('EL ' + res.status);

      var buf = await res.arrayBuffer();
      var blob = new Blob([buf], { type: 'audio/mpeg' });
      var url = URL.createObjectURL(blob);
      if (!__currentAudio) __currentAudio = new Audio();
      __currentAudio.src = url;
      __currentAudio.volume = (typeof opts.volume === 'number') ? opts.volume : 1.0;
      __currentAudio.onended = function(){ try { URL.revokeObjectURL(url); } catch (e) {} __currentUrl = null; };
      __currentUrl = url; __ctrl = null;
      try { await __currentAudio.play(); } catch (e) {}
    } catch (e) {
      var msg = (e && e.message) ? e.message : String(e);
      try { console.warn('[ABTTS] speak failed', msg); } catch (ex) {}
    }
  }

  (globalThis || window).ABTTS = { speak: speak, getKeyAndVoice: getKeyAndVoice, stop: stop, unlock: unlock };
})();

