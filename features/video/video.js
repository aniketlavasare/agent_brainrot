const reel     = document.getElementById("reel");
const navUp    = document.getElementById("navUp");
const navDown  = document.getElementById("navDown");

const FEED_COUNT = 10;
let currentIndex = 0;
let feedItems = [];
let scrollTimer;

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
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay?1:0}&mute=1&playsinline=1&modestbranding=1&rel=0&controls=1`;
}

function clearReel() {
  if (!reel) return;
  reel.innerHTML = "";
}

function slideEl(item) {
  const el = document.createElement("div");
  el.className = "slide";
  el.dataset.id = item.id;
  const iframe = document.createElement("iframe");
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");
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
    if (!iframe) return;
    if (i === index) {
      const url = embedUrl(id, true);
      if (iframe.src !== url) iframe.src = url;
    } else {
      if (iframe.src !== "about:blank") iframe.src = "about:blank";
    }
  });
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
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    reel.scrollTo({ top: (currentIndex - 1) * reel.clientHeight, behavior: "smooth" });
  }
});

function move(delta) {
  if (!reel) return;
  const target = Math.max(0, currentIndex + delta);
  reel.scrollTo({ top: target * reel.clientHeight, behavior: "smooth" });
}

navUp?.addEventListener('click', () => move(-1));
navDown?.addEventListener('click', () => move(1));

async function loadFeedFromPrefs(overrideTopic) {
  if (!window.ABYoutube) return;
  const { keywords, shortsOnly } = await getPrefs();
  const topic = (keywords.length ? keywords.join(" ") : "subway surfer brainrot");
  try {
    if (Array.isArray(keywords) && keywords.length > 1) {
      const per = Math.max(2, Math.ceil(FEED_COUNT / keywords.length));
      const calls = keywords.map(k => window.ABYoutube.searchYouTube(`${k} #shorts`, { shortsOnly: shortsOnly !== false, maxResults: per, order: 'relevance', safeSearch: 'moderate' }));
      const lists = await Promise.allSettled(calls);
      const flat = [];
      for (const r of lists) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) flat.push(...r.value);
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
    buildReel(feedItems);
    activate(0);
  } catch (e) {
    console.warn('Feed load failed', e);
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
