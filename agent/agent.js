const bubble = document.querySelector(".ab-bubble");
const face = document.querySelector(".ab-face");
const menu = document.querySelector(".ab-menu");
const closeBtn = document.querySelector(".ab-close");
const speech = document.getElementById("ab_speech");
const speechText = document.getElementById("ab_speech_text");

let menuOpen = false;
let faceLockedUntil = 0; // Timestamp when face is locked (e.g., during jokes)
let personalityTimer = null;
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
    requestResize(100, 100);
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
    try { window.ABTTS?.unlock?.(); } catch {}
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
  clearTimeout(personalityTimer); // Stop personality changes
  faceLockedUntil = Date.now() + 5000; // Lock face for goodbye
  try { setFace("../assets/agent_sad.svg"); } catch {}
  try { window.ABTTS?.speak('So long!', { volume: 0.9 }); } catch {}
  setTimeout(() => {
    try { window.top?.postMessage({ type: "AB_CLOSE_AGENT" }, "*"); } catch {}
  }, 2400);
});

// (eyes removed)

// ---- Personality System: Random face changes with sound effects ----
const FACE_ASSETS = {
  idle: { src: "../assets/agent_idle.svg", sound: null },
  smile: { src: "../assets/agent_smile.svg", sound: "twinkle" },
  grin: { src: "../assets/agent_grin.svg", sound: "chirp" },
  pout: { src: "../assets/agent_pout.svg", sound: "sigh" },
  sad: { src: "../assets/agent_sad.svg", sound: "aww" }
};

// Simple sound effects using Web Audio API
function playSound(type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0.15; // Subtle volume

    switch (type) {
      case "twinkle": {
        // Happy sparkle sound
        [0, 0.08, 0.16].forEach((time, i) => {
          const osc = audioCtx.createOscillator();
          osc.connect(gainNode);
          osc.frequency.value = [523.25, 659.25, 783.99][i]; // C5, E5, G5
          osc.start(audioCtx.currentTime + time);
          osc.stop(audioCtx.currentTime + time + 0.1);
        });
        break;
      }
      case "chirp": {
        // Excited chirp
        const osc = audioCtx.createOscillator();
        osc.connect(gainNode);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
        break;
      }
      case "sigh": {
        // Pouty sigh sound
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.connect(gainNode);
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
        break;
      }
      case "aww": {
        // Sad aww sound
        const osc = audioCtx.createOscillator();
        osc.type = "triangle";
        osc.connect(gainNode);
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
        break;
      }
    }
    
    // Cleanup after sound finishes
    setTimeout(() => {
      try { audioCtx.close(); } catch {}
    }, 1000);
  } catch (e) {
    // Silently fail if audio context is not available
  }
}

function scheduleNextPersonalityChange() {
  clearTimeout(personalityTimer);
  // Random interval between 10-15 seconds
  const delayMs = 10000 + Math.random() * 5000;
  personalityTimer = setTimeout(changePersonalityFace, delayMs);
}

function changePersonalityFace() {
  // Don't change if face is locked (during jokes, etc.)
  if (Date.now() < faceLockedUntil) {
    scheduleNextPersonalityChange();
    return;
  }

  // Don't change if menu is open or speech is visible
  if (menuOpen || !speech?.hidden) {
    scheduleNextPersonalityChange();
    return;
  }

  // Pick a random face (weighted towards positive emotions)
  const faceKeys = ["idle", "smile", "smile", "grin", "pout", "sad"]; // smile weighted 2x
  const randomFace = faceKeys[Math.floor(Math.random() * faceKeys.length)];
  const faceData = FACE_ASSETS[randomFace];

  if (faceData) {
    setFace(faceData.src);
    if (faceData.sound) {
      playSound(faceData.sound);
    }

    // Revert to idle after 2-3 seconds (unless it's already idle)
    if (randomFace !== "idle") {
      setTimeout(() => {
        if (Date.now() >= faceLockedUntil && !menuOpen && speech?.hidden) {
          setFace(FACE_ASSETS.idle.src);
        }
      }, 2000 + Math.random() * 1000);
    }
  }

  scheduleNextPersonalityChange();
}

// Start the personality system after a short delay
setTimeout(() => {
  scheduleNextPersonalityChange();
}, 5000); // Start after 5 seconds

// ---- Jokes flow ----
let jokeTimer = null;
let jokeReqId = 0;
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

// (Howdy handled from popup toggle to guarantee a user-gesture autoplay)

function requestPageText(id) {
  try { window.top?.postMessage({ type: "AB_GET_PAGE_TEXT", id }, "*"); } catch {}
}

window.addEventListener("message", async (e) => {
  const data = e.data || {};
  if (data.type !== "AB_PAGE_TEXT") return;
  // Allow only messages from our parent/top page
  try {
    if (e.source !== window.top && e.source !== window.parent) return;
  } catch {}
  await handlePageText(String(data.text || ""), data.id);
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
  if (data.type === 'AB_FACE') {
    const faceMap = {
      smile: "../assets/agent_smile.svg",
      idle: "../assets/agent_idle.svg",
      grin: "../assets/agent_grin.svg",
      sad: "../assets/agent_sad.svg",
      pout: "../assets/agent_pout.svg"
    };
    const target = faceMap[(data.face || 'smile')] || faceMap.smile;
    const ms = Math.max(200, Number(data.revertMs || 1200));
    faceLockedUntil = Date.now() + ms + 500; // Lock face during external change + buffer
    setFace(target);
    if (ms > 0) {
      setTimeout(() => {
        setFace(faceMap.idle);
        faceLockedUntil = 0; // Release lock after revert
      }, ms);
    }
  }
});

async function runJokeFlow() {
  // Visuals: grin + loading speech
  clearTimeout(jokeTimer);
  setFace("../assets/agent_grin.svg");
  showSpeech("Thinking...");
  const myId = ++jokeReqId;
  faceLockedUntil = Date.now() + 10000; // Lock face for 10 seconds during joke flow
  requestPageText(myId);
}

async function handlePageText(pageText, id) {
  if (typeof id !== 'undefined' && id !== jokeReqId) return;
  try {
    const joke = await (window.ABJokes?.jokeForContext(pageText) || Promise.reject(new Error('ABJokes missing')));
    setFace("../assets/agent_smile.svg"); // Smile when joke is ready
    showSpeech(joke);
    // Speak the joke out loud via ElevenLabs TTS (if configured)
    try { window.ABTTS?.speak(String(joke || ''), { volume: 0.9 }); } catch {}
  } catch (err) {
    console.error('[Agent] Joke error:', err);
    setFace("../assets/agent_pout.svg"); // Pout on error
    showSpeech("Couldn't fetch a joke. Check API key.");
  } finally {
    clearTimeout(jokeTimer);
    jokeTimer = setTimeout(() => {
      hideSpeech();
      setFace("../assets/agent_idle.svg");
      faceLockedUntil = 0; // Release face lock
    }, 6000);
  }
}

