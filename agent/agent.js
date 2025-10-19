const bubble = document.querySelector(".ab-bubble");
const face = document.querySelector(".ab-face");
const menu = document.querySelector(".ab-menu");
const closeBtn = document.querySelector(".ab-close");
const speech = document.getElementById("ab_speech");
const speechText = document.getElementById("ab_speech_text");

let menuOpen = false;
function requestResize(width, height) {
  try {
    window.top?.postMessage({ type: "AB_AGENT_RESIZE", width, height }, "*");
  } catch {}
}

function updateFrameSize() {
  // If menu is open, use the menu size. Otherwise, expand to fit speech bubble if visible.
  const speechVisible = !speech?.hidden;
  if (menuOpen) {
    requestResize(220, 260);
  } else if (speechVisible) {
    // Enough room for bubble above the avatar
    requestResize(260, 200);
  } else {
    requestResize(80, 80);
  }
}

function openMenu() {
  menuOpen = true;
  menu.classList.add("open");
  updateFrameSize();
}
function closeMenu() {
  menuOpen = false;
  menu.classList.remove("open");
  updateFrameSize();
}

// open modules
menu.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-module]");
  if (!btn) return;
  const module = btn.dataset.module;
  if (module === "video") {
    // optionally read a stored topic preference
    chrome.storage?.local.get(["ab_default_topic"], (res) => {
      const topic = res?.ab_default_topic || "funny";
      window.top?.postMessage({ type: "AB_OPEN", module: "video", payload: { topic } }, "*");
    });
  }
  if (module === "jokes") {
    runJokeFlow();
  }
  if (module === "tictactoe") {
    window.top?.postMessage({ type: "AB_OPEN", module: "tictactoe", payload: {} }, "*");
  }
  if (module === "fidgit") {
    window.top?.postMessage({ type: "AB_OPEN", module: "fidgit", payload: {} }, "*");
  }
  // close the menu after selection
  closeMenu();
});

// simple click animation
bubble.addEventListener("click", () => {
  bubble.animate([{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 120 });
  if (menuOpen) closeMenu(); else openMenu();
});

// Close button
closeBtn?.addEventListener("click", () => {
  try { window.top?.postMessage({ type: "AB_CLOSE_AGENT" }, "*"); } catch {}
});

// (eyes removed)

// ---- Jokes flow ----
let jokeTimer = null;
function setFace(src) {
  if (!face) return;
  if (src) face.src = src;
}
function showSpeech(text) {
  if (!speech || !speechText) return;
  speech.hidden = false;
  speechText.textContent = text;
  updateFrameSize();
}
function hideSpeech() {
  if (!speech || !speechText) return;
  speech.hidden = true;
  speechText.textContent = "";
  updateFrameSize();
}

function requestPageText() {
  try { window.top?.postMessage({ type: "AB_GET_PAGE_TEXT" }, "*"); } catch {}
}

window.addEventListener("message", async (e) => {
  const data = e.data || {};
  if (data.type !== "AB_PAGE_TEXT") return;
  // Allow only messages from our parent/top page
  try {
    if (e.source !== window.top && e.source !== window.parent) return;
  } catch {}
  await handlePageText(String(data.text || ""));
});

// Respond to taunt requests from overlays
window.addEventListener("message", async (e) => {
  try {
    if (e.source !== window.top && e.source !== window.parent) return;
  } catch {}
  const data = e?.data || {};
  if (data.type === 'AB_TAUNT_REQUEST') {
    const rid = data?.id;
    let text = '';
    try {
      const prompt = 'Tic-Tac-Toe loss taunt: 1 witty, short (<= 100 chars), no quotes, SFW.';
      text = await (window.ABJokes?.jokeForContext(prompt) || Promise.reject(new Error('no ABJokes')));
    } catch {}
    try { window.top?.postMessage({ type: 'AB_TAUNT_REPLY', id: rid, text: String(text || '') }, '*'); } catch {}
  }
});

async function runJokeFlow() {
  // Visuals: grin + loading speech
  clearTimeout(jokeTimer);
  setFace("../assets/agent_grin.svg");
  showSpeech("Thinking…");
  requestPageText();
}

async function handlePageText(pageText) {
  try {
    const joke = await (window.ABJokes?.jokeForContext(pageText) || Promise.reject(new Error('ABJokes missing')));
    showSpeech(joke);
  } catch (err) {
    console.error('[Agent] Joke error:', err);
    showSpeech("Couldn't fetch a joke. Check API key.");
  } finally {
    clearTimeout(jokeTimer);
    jokeTimer = setTimeout(() => {
      hideSpeech();
      setFace("../assets/agent_idle.svg");
    }, 6000);
  }
}
