const urlInput = document.getElementById("url");
const playBtn  = document.getElementById("play");
const closeBtn = document.getElementById("close");
const player   = document.getElementById("player");

// restore last URL
const KEY = "shorts_overlay_last_url";
chrome.storage?.local.get([KEY], (res) => {
  if (res?.[KEY]) {
    urlInput.value = res[KEY];
    loadVideoFrom(urlInput.value);
  }
});

// Make it easy to paste immediately after opening
try { setTimeout(() => urlInput?.focus({ preventScroll: true }), 0); } catch {}

function extractVideoIdAnyYouTube(url) {
  try {
    const u = new URL(url.trim());
    // shorts: /shorts/VIDEO_ID
    const shortsMatch = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{6,})/);
    if (shortsMatch) return shortsMatch[1];

    // watch?v=VIDEO_ID
    const v = u.searchParams.get("v");
    if (v) return v;

    // youtu.be/VIDEO_ID
    const yb = u.hostname.endsWith("youtu.be") ? u.pathname.slice(1) : null;
    if (yb) return yb;

    return null;
  } catch {
    return null;
  }
}

function embedUrl(videoId) {
  // Same embed works for Shorts and normal videos
  // Add modest UI and autoplay
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=1`;
}

function loadVideoFrom(link) {
  const id = extractVideoIdAnyYouTube(link);
  if (!id) {
    alert("Couldn't find a video ID in that URL.");
    return;
  }
  player.src = embedUrl(id);
  try {
    chrome.storage?.local.set({ [KEY]: link });
  } catch {}
}

playBtn.addEventListener("click", () => loadVideoFrom(urlInput.value));
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadVideoFrom(urlInput.value);
});
closeBtn.addEventListener("click", () => {
  // Ask the content script (parent page) to remove the iframe via postMessage.
  // The content script validates the origin before acting.
  try {
    window.parent.postMessage({ type: "SHORTS_OVERLAY_CLOSE" }, "*");
  } catch {}
});
