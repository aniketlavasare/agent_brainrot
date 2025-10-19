;(function () {
  const MODEL = 'gemini-2.5-flash-lite'; // valid model id per docs
  const BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';
  let __envKey = null;
  let __envAttempted = false;

  async function getApiKey() {
    if (!__envAttempted) {
      __envAttempted = true;
      try {
        const url = chrome?.runtime?.getURL?.('.env');
        if (url) {
          const res = await fetch(url);
          if (res.ok) {
            const text = await res.text();
            const m = text.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/m);
            if (m && m[1]) __envKey = (m[1] || '').trim();
          }
        }
      } catch {}
    }
    if (__envKey) return __envKey;
    return new Promise((resolve) => {
      try {
        chrome.storage?.local.get(['geminiKey', 'ab_gemini_api_key'], (res) => {
          resolve(res?.geminiKey || res?.ab_gemini_api_key || '');
        });
      } catch {
        resolve('');
      }
    });
  }

  async function jokeForContext(ctx = '', opts = {}) {
    const key = opts.key || (await getApiKey());
    if (!key) throw new Error('Missing Gemini API key');

    const endpoint = `${BASE}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const brief = (ctx || '').replace(/\s+/g, ' ').trim().slice(0, opts.maxContext || 2000);

    const prompt = [
      'You are a witty, cheeky assistant inside a tiny page agent. Your name is Agent Brainrot',
      'Given this page context, reply with ONE short, safe-for-work, playful one-liner joke (<= 100 characters).',
      'No preface, no hashtags, no quotes — only the joke.',
      '',
      'Page context:',
      brief
    ].join('\n');

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.9, maxOutputTokens: 128 }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    try { console.log('[ABJokes] Gemini response', { status: res.status, ok: res.ok, data }); } catch {}

    if (!res.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      throw new Error(`Gemini ${res.status}: ${msg}`);
    }

    const extractText = (d) => {
      try {
        const parts = d?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          const t = parts.map(p => (p && typeof p.text === 'string') ? p.text : '').join('');
          if (t && t.trim()) return t.trim();
        }
        const alt = d?.candidates?.[0]?.content?.text || d?.candidates?.[0]?.text || d?.text || '';
        if (typeof alt === 'string' && alt.trim()) return alt.trim();
      } catch {}
      return '';
    };

    const raw = extractText(data);
    if (!raw) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      const blockReason = data?.promptFeedback?.blockReason;
      
      // If it's MAX_TOKENS but we have some content, use what we have
      if (finishReason === 'MAX_TOKENS' && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const partialText = data.candidates[0].content.parts[0].text.trim();
        if (partialText) {
          return partialText.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 140);
        }
      }
      
      const fb = blockReason || finishReason || 'No output';
      throw new Error(String(fb));
    }

    return raw.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 140);
  }

  (globalThis || window).ABJokes = { getApiKey, jokeForContext };
})();
