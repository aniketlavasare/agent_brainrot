const reel     = document.getElementById("reel");
const navUp    = document.getElementById("navUp");
const navDown  = document.getElementById("navDown");

const FEED_COUNT = 10;
let currentIndex = 0;
let feedItems = [];
let scrollTimer;
const FALLBACK_IDS = [
  'dQw4w9WgXcQ',
  'kJQP7kiw5Fk',
  '3JZ_D3ELwOQ'
];

async function getPrefs() {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(["ab_feed_keywords","ab_shorts_only"], (res) => {
        resolve({
          keywords: Array.isArray(res?.ab_feed_keywords) ? res.ab_feed_keywords : [],
          shortsOnly: res?.ab_shorts_only !== false
        });
      });
    } catch { resolve({ keywords: [], shortsOnly: true }); }
  });
}

function embedUrl(videoId, autoplay = true) {
  const origin = encodeURIComponent(window.location.origin || '');
  const ts = Date.now();
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay?1:0}&mute=1&playsinline=1&modestbranding=1&rel=0&controls=1&origin=${origin}&ts=${ts}`;
}

function clearReel() {
  if (!reel) return;
  reel.innerHTML = "";
}

function slideEl(item) {
  const el = document.createElement("div");
  el.className = "slide";
  el.dataset.id = item.id;
  // Use a thumbnail as a placeholder to avoid visible blanks while scrolling
  if (item && item.thumb) {
    el.style.backgroundImage = `url(${item.thumb})`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
  }
  const iframe = document.createElement("iframe");
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");
  try { iframe.loading = 'lazy'; } catch {}
  iframe.src = "about:blank";
  el.appendChild(iframe);
  return el;
}

function buildReel(items) {
  clearReel();
  (items || []).slice(0, FEED_COUNT).forEach((it) => reel.appendChild(slideEl(it)));
}

function activate(index) {
  if (!reel) return;
  const slides = [...reel.querySelectorAll(".slide")];
  if (!slides.length) return;
  index = Math.max(0, Math.min(index, slides.length - 1));
  currentIndex = index;
  slides.forEach((s, i) => {
    const iframe = s.querySelector("iframe");
    const id = s.dataset.id;
    if (!iframe || !id) return;
    const dist = Math.abs(i - index);
    if (dist === 0) {
      const url = embedUrl(id, true);
      if (iframe.src !== url) iframe.src = url;
    } else if (dist === 1) {
      const url = embedUrl(id, false);
      if (iframe.src !== url) iframe.src = url;
    } else {
      if (iframe.src !== "about:blank") iframe.src = "about:blank";
    }
  });
}

// If autoplay is blocked by Permissions Policy, retry activation on first user gesture
let kickstarted = false;
function kickstartAutoplayOnce() {
  if (kickstarted) return;
  kickstarted = true;
  // Re-activate current index to refresh the active iframe with a fresh autoplay URL
  try { activate(currentIndex); } catch {}
}

function onScrollEnd() {
  if (!reel) return;
  const h = reel.clientHeight || 1;
  const idx = Math.round(reel.scrollTop / h);
  activate(idx);
}

reel?.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(onScrollEnd, 120);
});

document.addEventListener("keydown", (e) => {
  if (!reel) return;
  if (e.key === "ArrowDown" || e.key === "PageDown") {
    e.preventDefault();
    reel.scrollTo({ top: (currentIndex + 1) * reel.clientHeight, behavior: "smooth" });
    kickstartAutoplayOnce();
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    reel.scrollTo({ top: (currentIndex - 1) * reel.clientHeight, behavior: "smooth" });
    kickstartAutoplayOnce();
  }
});

function move(delta) {
  if (!reel) return;
  const target = Math.max(0, currentIndex + delta);
  reel.scrollTo({ top: target * reel.clientHeight, behavior: "smooth" });
}

navUp?.addEventListener('click', () => move(-1));
navDown?.addEventListener('click', () => move(1));

// Any click/tap inside the player tries to kickstart autoplay once
document.getElementById('playerWrap')?.addEventListener('pointerdown', kickstartAutoplayOnce, { once: true });

async function loadFeedFromPrefs(overrideTopic) {
  if (!window.ABYoutube) {
    console.error('[Video] ABYoutube not available');
    return;
  }
  
  const { keywords, shortsOnly } = await getPrefs();
  const topic = (keywords.length ? keywords.join(" ") : "science");
  console.log('[Video] Loading feed with topic:', topic, 'keywords:', keywords);
  
  try {
    // Check if API key is available
    const apiKey = await window.ABYoutube.getApiKey();
    if (!apiKey) {
      console.warn('[Video] No YouTube API key found. Using fallback videos.');
      feedItems = FALLBACK_IDS.map(id => ({ 
        id, 
        url: `https://www.youtube.com/watch?v=${id}`, 
        thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` 
      }));
      buildReel(feedItems);
      activate(0);
      return;
    }
    
    if (Array.isArray(keywords) && keywords.length > 1) {
      const per = Math.max(2, Math.ceil(FEED_COUNT / keywords.length));
      const calls = keywords.map(k => window.ABYoutube.searchYouTube(`${k} #shorts`, { shortsOnly: shortsOnly !== false, maxResults: per, order: 'relevance', safeSearch: 'moderate' }));
      const lists = await Promise.allSettled(calls);
      const flat = [];
      for (const r of lists) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          console.log('[Video] Got', r.value.length, 'videos for keyword');
          flat.push(...r.value);
        } else if (r.status === 'rejected') {
          console.error('[Video] Search failed:', r.reason);
        }
      }
      // Deduplicate by id, keep order
      const seen = new Set();
      const merged = [];
      for (const it of flat) {
        if (it && it.id && !seen.has(it.id)) { seen.add(it.id); merged.push(it); }
        if (merged.length >= FEED_COUNT) break;
      }
      feedItems = merged.length ? merged : flat.slice(0, FEED_COUNT);
      if (feedItems.length < FEED_COUNT) {
        const fallback = await window.ABYoutube.searchYouTube(`${topic} #shorts`, { shortsOnly: shortsOnly !== false, maxResults: FEED_COUNT, order: 'relevance', safeSearch: 'moderate' });
        feedItems = feedItems.concat((fallback || []).filter(x => !seen.has(x.id))).slice(0, FEED_COUNT);
      }
    } else {
      feedItems = await window.ABYoutube.searchYouTube(`${topic} #shorts`, { shortsOnly: shortsOnly !== false, maxResults: FEED_COUNT, order: 'relevance', safeSearch: 'moderate' });
    }
    
    console.log('[Video] Loaded', feedItems.length, 'videos');
    
    if (!Array.isArray(feedItems) || feedItems.length === 0) {
      console.warn('[Video] No videos found, using fallback');
      feedItems = FALLBACK_IDS.map(id => ({ 
        id, 
        url: `https://www.youtube.com/watch?v=${id}`, 
        thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` 
      }));
    }
    buildReel(feedItems);
    activate(0);
  } catch (e) {
    console.error('[Video] Feed load failed:', e);
    try {
      feedItems = FALLBACK_IDS.map(id => ({ 
        id, 
        url: `https://www.youtube.com/watch?v=${id}`, 
        thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` 
      }));
      buildReel(feedItems);
      activate(0);
    } catch {}
  }
}

// Optional: allow Esc to close the overlay
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    try { window.parent.postMessage({ type: "AB_CLOSE_TOP" }, "*"); } catch {}
  }
});

// Initial feed on load
loadFeedFromPrefs();

// Respond to agent init with topic; refresh feed based on that topic
window.addEventListener("message", async (e) => {
  const data = e?.data || {};
  if (data.type === "AB_VIDEO_INIT") {
    const topic = data?.payload?.topic;
    if (topic) {
      await loadFeedFromPrefs(topic);
    }
  }
});
