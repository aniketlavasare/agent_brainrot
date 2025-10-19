(() => {
  if (window.__abContentInstalled__) return;
  window.__abContentInstalled__ = true;

  const AGENT_IFRAME_ID = "__ab_agent_iframe__";
  const OVERLAY_CLASS = "__ab_overlay__";
  const Z_BASE = 2147483000;
  const EXT_ORIGIN = new URL(chrome.runtime.getURL(""))?.origin;

  // Background → content toggle
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "AB_TOGGLE_AGENT") toggleAgent();
  });

  // Messages from agent/video iframes
  window.addEventListener("message", (e) => {
    if (e.origin !== EXT_ORIGIN) return;
    const data = e.data || {};
    if (data.type === "AB_OPEN" && data.module === "video") openVideoOverlay(data.payload || {});
    if (data.type === "AB_CLOSE_TOP" || data.type === "SHORTS_OVERLAY_CLOSE") closeTopOverlay();
    if (data.type === "AB_AGENT_RESIZE") resizeAgent(data.width, data.height);
    if (data.type === "AB_CLOSE_AGENT") closeAgent();
    if (data.type === "AB_GET_PAGE_TEXT") sendPageTextToAgent();
  });

  function resizeAgent(w, h) {
    const iframe = document.getElementById(AGENT_IFRAME_ID);
    if (!iframe) return;
    if (typeof w === "number") iframe.style.width = `${w}px`;
    if (typeof h === "number") iframe.style.height = `${h}px`;
  }

  function closeAgent() {
    document.getElementById(AGENT_IFRAME_ID)?.remove();
    document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((el) => el.remove());
  }

  function toggleAgent() {
    const existing = document.getElementById(AGENT_IFRAME_ID);
    if (existing) {
      closeAgent();
    } else {
      injectAgent();
    }
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

  function closeTopOverlay() {
    const overlays = [...document.querySelectorAll(`.${OVERLAY_CLASS}`)];
    if (!overlays.length) return;
    overlays.sort((a, b) => parseInt(a.style.zIndex||0) - parseInt(b.style.zIndex||0));
    overlays.at(-1)?.remove();
  }

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
      background: "#000"
    });

    // lightweight chrome: drag handle + close
    const hdr = document.createElement("div");
    Object.assign(hdr.style, {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "36px",
      background: "rgba(18,18,18,.6)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "8px",
      padding: "6px 8px",
      cursor: "move",
      userSelect: "none",
      zIndex: 2
    });
    const btnClose = document.createElement("button");
    btnClose.textContent = "×";
    Object.assign(btnClose.style, {
      all: "unset",
      width: "24px",
      height: "24px",
      display: "grid",
      placeItems: "center",
      borderRadius: "6px",
      background: "rgba(255,255,255,.15)",
      cursor: "pointer"
    });
    btnClose.title = "Close";
    btnClose.addEventListener("click", () => wrap.remove());
    hdr.appendChild(btnClose);

    const frame = document.createElement("iframe");
    frame.src = chrome.runtime.getURL("features/video/video.html");
    Object.assign(frame.style, {
      width: "100%",
      height: "100%",
      border: "0",
      background: "#000"
    });

    wrap.appendChild(hdr);
    wrap.appendChild(frame);
    document.documentElement.appendChild(wrap);

    // enable dragging from header
    makeDraggable(wrap, hdr);

    frame.addEventListener("load", () => {
      frame.contentWindow.postMessage({ type: "AB_VIDEO_INIT", payload }, "*");
    });
  }

  function sendPageTextToAgent() {
    try {
      const title = document.title || "";
      const desc = document.querySelector('meta[name="description"]')?.content || "";
      let bodyText = "";
      try { bodyText = (document.body?.innerText || "").replace(/\s+/g, ' ').trim(); } catch {}
      const combined = [title, desc, bodyText].filter(Boolean).join("\n\n");
      const maxLen = 3000;
      const snippet = combined.slice(0, maxLen);
      const iframe = document.getElementById(AGENT_IFRAME_ID);
      iframe?.contentWindow?.postMessage({ type: 'AB_PAGE_TEXT', text: snippet }, EXT_ORIGIN);
    } catch {}
  }

  // Simple draggable helper for fixed-position containers
  function makeDraggable(container, handle) {
    let dragging = false;
    let sx = 0, sy = 0, sl = 0, st = 0;
    const onDown = (e) => {
      if (e.button !== 0) return; // left click only
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const rect = container.getBoundingClientRect();
      sl = rect.left; st = rect.top;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      container.style.left = Math.max(0, sl + dx) + "px";
      container.style.top  = Math.max(0, st + dy) + "px";
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    handle.addEventListener("mousedown", onDown);
  }

  // Auto-inject agent on first run of the tab
  injectAgent();
})();
