(() => {
  if (window.__abContentInstalled__) return;
  window.__abContentInstalled__ = true;

  const AGENT_IFRAME_ID = "__ab_agent_iframe__";
  const OVERLAY_CLASS = "__ab_overlay__";
  const Z_BASE = 2147483000;
  const EXT_ORIGIN = new URL(chrome.runtime.getURL(""))?.origin;

  // Listen for messages from background and agent iframe
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "AB_TOGGLE_AGENT") toggleAgent();
  });

  window.addEventListener("message", (e) => {
    // Only accept messages from our extension pages (agent/video iframes)
    if (e.origin !== EXT_ORIGIN) return;
    const data = e.data || {};
    if (data.type === "AB_OPEN") {
      if (data.module === "video") openVideoOverlay(data.payload || {});
    }
    if (data.type === "AB_CLOSE_TOP") closeTopOverlay();
    if (data.type === "SHORTS_OVERLAY_CLOSE") closeTopOverlay();
    if (data.type === "AB_AGENT_RESIZE") {
      const iframe = document.getElementById(AGENT_IFRAME_ID);
      if (iframe) {
        if (typeof data.width === "number") iframe.style.width = `${data.width}px`;
        if (typeof data.height === "number") iframe.style.height = `${data.height}px`;
      }
    }
    if (data.type === "AB_CLOSE_AGENT") {
      const existing = document.getElementById(AGENT_IFRAME_ID);
      existing?.remove();
      // remove any open overlays as well
      document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((el) => el.remove());
    }
  });

  // ----- Agent toggling -----
  function toggleAgent() {
    const existing = document.getElementById(AGENT_IFRAME_ID);
    if (existing) {
      existing.remove();
      // Also remove any open overlays when agent hides
      document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((el) => el.remove());
      return;
    }
    injectAgent();
  }

  function injectAgent() {
    const iframe = document.createElement("iframe");
    iframe.id = AGENT_IFRAME_ID;
    iframe.src = chrome.runtime.getURL("agent/agent.html");
    Object.assign(iframe.style, {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      width: "80px",
      height: "80px",
      border: "0",
      zIndex: String(Z_BASE + 100),
      borderRadius: "20px",
      background: "transparent"
    });
    document.documentElement.appendChild(iframe);
  }

  // ----- Overlay manager helpers -----
  function makeDraggable(container, handle) {
    let drag = false, sx = 0, sy = 0, sl = 0, st = 0;
    const down = (e) => {
      drag = true;
      sx = e.clientX; sy = e.clientY;
      const rect = container.getBoundingClientRect();
      sl = rect.left; st = rect.top;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      container.style.left = Math.max(0, sl + dx) + "px";
      container.style.top  = Math.max(0, st + dy) + "px";
    };
    const up = () => {
      drag = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    handle.addEventListener("mousedown", down);
  }

  function closeTopOverlay() {
    const overlays = [...document.querySelectorAll(`.${OVERLAY_CLASS}`)];
    if (!overlays.length) return;
    overlays.sort((a, b) => parseInt(a.style.zIndex||0)-parseInt(b.style.zIndex||0));
    overlays.at(-1)?.remove();
  }

  // ----- VIDEO MODULE (Phase 2) -----
  function openVideoOverlay(payload) {
    const wrap = document.createElement("div");
    wrap.className = OVERLAY_CLASS;
    Object.assign(wrap.style, {
      position: "fixed",
      left: "calc(100vw - 380px - 16px)",
      top: "calc(100vh - 680px - 16px)",
      width: "380px",
      height: "680px",
      zIndex: String(Z_BASE + 200 + document.querySelectorAll(`.${OVERLAY_CLASS}`).length),
      borderRadius: "14px",
      boxShadow: "0 12px 32px rgba(0,0,0,.35)",
      overflow: "hidden",
      background: "transparent"
    });

    // title/drag bar
    const bar = document.createElement("div");
    Object.assign(bar.style, {
      height: "40px",
      background: "rgba(18,18,18,.95)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      cursor: "move",
      userSelect: "none"
    });
    bar.innerHTML = `<strong>🎬 Agent Brainrot — Video</strong>
      <div style="display:flex; gap:8px; align-items:center">
        <button id="ab-min" style="all:unset;cursor:pointer">—</button>
        <button id="ab-close" style="all:unset;cursor:pointer">✕</button>
      </div>`;

    const frame = document.createElement("iframe");
    frame.src = chrome.runtime.getURL("features/video/video.html");
    Object.assign(frame.style, {
      width: "100%",
      height: "calc(100% - 40px)",
      border: "0",
      background: "black"
    });

    wrap.appendChild(bar);
    wrap.appendChild(frame);
    document.documentElement.appendChild(wrap);

    // drag
    makeDraggable(wrap, bar);

    // minimize
    bar.querySelector("#ab-min").addEventListener("click", () => {
      if (frame.style.display !== "none") {
        frame.style.display = "none";
        wrap.style.height = "40px";
      } else {
        frame.style.display = "";
        wrap.style.height = "680px";
      }
    });

    // close
    bar.querySelector("#ab-close").addEventListener("click", () => wrap.remove());

    // send initial payload (e.g., topic) after iframe loads
    frame.addEventListener("load", () => {
      frame.contentWindow.postMessage({ type: "AB_VIDEO_INIT", payload }, "*");
    });
  }

  // Auto-inject agent on first run of the tab
  // (Comment out if you prefer manual toggle)
  injectAgent();
})();
