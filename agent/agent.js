const bubble = document.querySelector(".ab-bubble");
const menu = document.querySelector(".ab-menu");
const closeBtn = document.querySelector(".ab-close");

let menuOpen = false;
function requestResize(width, height) {
  try {
    window.top?.postMessage({ type: "AB_AGENT_RESIZE", width, height }, "*");
  } catch {}
}

function openMenu() {
  menuOpen = true;
  menu.classList.add("open");
  requestResize(220, 260);
}
function closeMenu() {
  menuOpen = false;
  menu.classList.remove("open");
  requestResize(80, 80);
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
