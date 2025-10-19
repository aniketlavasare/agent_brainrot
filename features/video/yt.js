// Browser-friendly YouTube Data API helper for extension pages
// Exposes window.ABYoutube = { getApiKey, searchYouTube }
(function () {
  const API_BASE = "https://www.googleapis.com/youtube/v3/search";
  let __abEnvKey = null;
  let __abEnvAttempted = false;

  async function getApiKey() {
    // Try to read from packaged .env once
    if (!__abEnvAttempted) {
      __abEnvAttempted = true;
      try {
        const res = await fetch(chrome.runtime.getURL('.env'));
        if (res.ok) {
          const text = await res.text();
          const m = text.match(/^\s*YOUTUBE_API_KEY\s*=\s*(.+)\s*$/m);
          if (m && m[1]) {
            __abEnvKey = m[1].trim();
          }
        }
      } catch {}
    }
    if (__abEnvKey) return __abEnvKey;
    // Fallback to storage if present (no UI prompt)
    return new Promise((resolve) => {
      try {
        chrome.storage?.local.get(["ab_yt_api_key"], (res) => {
          resolve(res?.ab_yt_api_key || "");
        });
      } catch {
        resolve("");
      }
    });
  }

  async function searchYouTube(topic, opts = {}) {
    const key = opts.key || (await getApiKey());
    if (!key || !topic) return [];
    const params = new URLSearchParams({
      part: "snippet",
      q: String(topic),
      maxResults: String(opts.maxResults || 5),
      type: "video",
      key
    });
    if (opts.shortsOnly) params.set('videoDuration', 'short');
    params.set('videoEmbeddable', 'true');
    if (opts.safeSearch) params.set('safeSearch', String(opts.safeSearch));
    if (opts.order) params.set('order', String(opts.order));
    if (opts.regionCode) params.set('regionCode', String(opts.regionCode));
    try {
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error(`YT API ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      return items.map((item) => ({
        id: item?.id?.videoId,
        title: item?.snippet?.title,
        url: item?.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "",
        thumb: item?.snippet?.thumbnails?.medium?.url || ""
      })).filter(v => v.id && v.url);
    } catch (err) {
      console.error("Error fetching YouTube videos:", err);
      return [];
    }
  }

  window.ABYoutube = { getApiKey, searchYouTube };
})();
