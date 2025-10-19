(() => {
  if (window.__abContentInstalled__) return;
  window.__abContentInstalled__ = true;

  const AGENT_IFRAME_ID = "__ab_agent_iframe__";
  const OVERLAY_CLASS = "__ab_overlay__";
  const Z_BASE = 2147483000;
  let EXT_ORIGIN = "*";
  try { EXT_ORIGIN = new URL(chrome.runtime.getURL(""))?.origin || "*"; } catch {}

  function extUrl(path) {
    try {
      return chrome?.runtime?.getURL?.(String(path)) || "";
    } catch (e) {
      return "";
    }
  }

  // Background → content toggle
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "AB_TOGGLE_AGENT") toggleAgent();
  });

  // Messages from agent/video iframes
  window.addEventListener("message", (e) => {
    if (e.origin !== EXT_ORIGIN) return;
    const data = e.data || {};
    if (data.type === "AB_OPEN" && data.module === "video") openVideoOverlay(data.payload || {});
    if (data.type === "AB_OPEN" && data.module === "tictactoe") openTicTacToeOverlay(data.payload || {});
    if (data.type === "AB_OPEN" && data.module === "fidgit") openFidgitOverlay(data.payload || {});
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
    const url = extUrl("agent/agent.html");
    if (!url) return; // extension context invalidated; do nothing gracefully
    iframe.src = url;
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
      top: "calc(100vh - 680px - 16px - 96px)",
      width: "380px",
      height: "680px",
      zIndex: String(Z_BASE + 200 + document.querySelectorAll(`.${OVERLAY_CLASS}`).length),
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,.12)",
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
      height: "34px",
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
      width: "22px",
      height: "22px",
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
    const vidUrl = extUrl("features/video/video.html");
    if (vidUrl) frame.src = vidUrl; else frame.srcdoc = `<html><body style="margin:0;display:grid;place-items:center;background:#000;color:#fff;font-family:ui-sans-serif,system-ui">Extension reloaded. Reload page to continue.</body></html>`;
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

  function openTicTacToeOverlay(payload) {
    const wrap = document.createElement("div");
    wrap.className = OVERLAY_CLASS;
    Object.assign(wrap.style, {
      position: "fixed",
      left: "calc(100vw - 360px - 16px)",
      top: "calc(100vh - 480px - 16px - 96px)",
      width: "360px",
      height: "480px",
      zIndex: String(Z_BASE + 200 + document.querySelectorAll(`.${OVERLAY_CLASS}`).length),
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,.12)",
      boxShadow: "0 12px 32px rgba(0,0,0,.35)",
      overflow: "hidden",
      background: "#111"
    });

    const hdr = document.createElement("div");
    Object.assign(hdr.style, {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "34px",
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
    btnClose.textContent = "\u00D7";
    Object.assign(btnClose.style, {
      all: "unset",
      width: "22px",
      height: "22px",
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
    const gameUrl = extUrl("features/games/tictactoe/tictactoe.html");
    if (gameUrl) frame.src = gameUrl; else frame.srcdoc = `<html><body style="margin:0;display:grid;place-items:center;background:#111;color:#fff;font-family:ui-sans-serif,system-ui">Extension reloaded. Reload page to continue.</body></html>`;
    Object.assign(frame.style, {
      width: "100%",
      height: "100%",
      border: "0",
      background: "#111"
    });

    wrap.appendChild(hdr);
    wrap.appendChild(frame);
    document.documentElement.appendChild(wrap);

    makeDraggable(wrap, hdr);

    frame.addEventListener("load", () => {
      try { frame.contentWindow.postMessage({ type: "AB_TTT_INIT", payload }, "*"); } catch {}
    });
  }

  function openFidgitOverlay(payload) {
    const wrap = document.createElement("div");
    wrap.className = OVERLAY_CLASS;
    Object.assign(wrap.style, {
      position: "fixed",
      left: "calc(100vw - 360px - 16px)",
      top: "calc(100vh - 480px - 16px - 96px)",
      width: "360px",
      height: "480px",
      zIndex: String(Z_BASE + 200 + document.querySelectorAll(`.${OVERLAY_CLASS}`).length),
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,.12)",
      boxShadow: "0 12px 32px rgba(0,0,0,.35)",
      overflow: "hidden",
      background: "#111",
      color: "#fff"
    });

    const hdr = document.createElement("div");
    Object.assign(hdr.style, {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "34px",
      background: "rgba(18,18,18,.6)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "6px 8px",
      cursor: "move",
      userSelect: "none",
      zIndex: 2
    });
    const title = document.createElement("div");
    title.textContent = "Fidget(s)";
    Object.assign(title.style, { fontSize: "12px", opacity: ".9" });
    const btnClose = document.createElement("button");
    btnClose.textContent = "\u00D7";
    Object.assign(btnClose.style, {
      all: "unset",
      width: "22px",
      height: "22px",
      display: "grid",
      placeItems: "center",
      borderRadius: "6px",
      background: "rgba(255,255,255,.15)",
      cursor: "pointer"
    });
    btnClose.title = "Close";
    btnClose.addEventListener("click", () => wrap.remove());
    hdr.appendChild(title);
    hdr.appendChild(btnClose);

    // Inner app (no iframe to avoid host CSP + context invalidation)
    const inner = document.createElement("div");
    inner.id = "ab_fid_inner";
    Object.assign(inner.style, {
      position: "absolute",
      top: "34px",
      left: 0,
      right: 0,
      bottom: 0,
      display: "grid",
      gridTemplateRows: "auto 1fr",
      fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif"
    });

    const toolbar = document.createElement("div");
    toolbar.id = "ab_fid_toolbar";
    Object.assign(toolbar.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      borderBottom: "1px solid rgba(255,255,255,.12)"
    });
    const lab = document.createElement("label"); lab.textContent = "Fidget"; Object.assign(lab.style, { fontSize: "12px", opacity: ".8" });
    const sel = document.createElement("select");
    sel.id = "ab_fid_mode";
    Object.assign(sel.style, { background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", borderRadius: "8px", padding: "6px 8px" });
    sel.innerHTML = `<option value="bubbles" selected>Bubble Pop</option><option value="spinner">Spinner</option>`;
    const spacer = document.createElement("div"); Object.assign(spacer.style, { flex: 1 });
    const soundBtn = document.createElement("button"); soundBtn.textContent = "Sound: Off"; Object.assign(soundBtn.style, { cursor: "pointer", padding: "6px 8px", borderRadius: "8px", background: "rgba(255,255,255,.12)", color: "#fff", border: 0, fontWeight: 700 });
    toolbar.appendChild(lab); toolbar.appendChild(sel); toolbar.appendChild(spacer); toolbar.appendChild(soundBtn);

    const stage = document.createElement("div");
    stage.id = "ab_fid_stage";
    Object.assign(stage.style, { position: "relative", overflow: "hidden" });

    // Panels
    const bubblesPanel = document.createElement("div");
    bubblesPanel.id = "ab_fid_bubbles";
    Object.assign(bubblesPanel.style, { position: "absolute", inset: 0, display: "grid", gap: "10px", padding: "10px" });

    const spinnerPanel = document.createElement("div");
    spinnerPanel.id = "ab_fid_spinner";
    Object.assign(spinnerPanel.style, { position: "absolute", inset: 0, display: "none" });

    const wheelWrap = document.createElement("div");
    Object.assign(wheelWrap.style, { position: "absolute", inset: 0, display: "grid", placeItems: "center" });
    const wheel = document.createElement("div");
    Object.assign(wheel.style, { width: "min(280px, 70%)", aspectRatio: "1 / 1", borderRadius: "999px", background: "conic-gradient(from 0deg, #2a2a2a, #1b1b1b)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "inset 0 12px 36px rgba(0,0,0,.45)", transform: "translateZ(0)", willChange: "transform" });
    const knob = document.createElement("div");
    Object.assign(knob.style, { position: "absolute", left: "50%", top: "50%", width: "44px", height: "44px", borderRadius: "999px", background: "#fff", color: "#111", boxShadow: "0 6px 18px rgba(0,0,0,.35)", display: "grid", placeItems: "center", cursor: "grab", userSelect: "none", touchAction: "none", transform: "translate(-50%,-50%)" });
    knob.textContent = "⟲";
    Object.assign(knob.style, { fontWeight: 700, fontSize: "18px" });
    wheelWrap.appendChild(wheel); wheelWrap.appendChild(knob);
    spinnerPanel.appendChild(wheelWrap);

    stage.appendChild(bubblesPanel);
    stage.appendChild(spinnerPanel);

    inner.appendChild(toolbar);
    inner.appendChild(stage);

    wrap.appendChild(hdr);
    wrap.appendChild(inner);
    document.documentElement.appendChild(wrap);

    makeDraggable(wrap, hdr);

    // ---- Logic (no external dependencies) ----
    let soundOn = false; let ac = null;
    function ensureAudio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return ac; }
    function popSound() { if (!soundOn) return; const ctx = ensureAudio(); if (!ctx) return; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 220 + Math.random()*180; g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.06); }
    // Spinner whirr
    let spinOsc = null, spinGain = null;
    function spinnerStartSound() {
      if (!soundOn) return;
      const ctx = ensureAudio(); if (!ctx) return;
      if (spinOsc) return;
      spinOsc = ctx.createOscillator();
      spinGain = ctx.createGain();
      spinOsc.type = 'sawtooth';
      spinOsc.frequency.value = 140; // base
      spinGain.gain.value = 0.0;
      spinOsc.connect(spinGain); spinGain.connect(ctx.destination);
      spinOsc.start();
    }
    function spinnerUpdateSound(speedAbs) {
      if (!spinOsc || !spinGain) { spinnerStartSound(); }
      if (!spinOsc || !spinGain) return;
      // Map speed to frequency/gain
      const f = 100 + Math.min(600, speedAbs * 5000);
      const g = Math.min(0.06, 0.01 + speedAbs * 0.15);
      try { spinOsc.frequency.setTargetAtTime(f, ac.currentTime || 0, 0.03); } catch {}
      try { spinGain.gain.setTargetAtTime(soundOn ? g : 0, ac.currentTime || 0, 0.05); } catch {}
    }
    function spinnerStopSound() {
      if (spinGain) { try { spinGain.gain.setTargetAtTime(0, ac?.currentTime || 0, 0.08); } catch {} }
      if (spinOsc) { const ctx = ac; const osc = spinOsc; spinOsc = null; setTimeout(() => { try { osc.stop(); } catch {} }, 120); }
    }

    // Bubble grid
    let gridCols = 8, gridRows = 10;
    function styleBubble(el) {
      Object.assign(el.style, { width: "100%", aspectRatio: "1 / 1", borderRadius: "999px", background: "radial-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.08))", border: "1px solid rgba(255,255,255,.16)", boxShadow: "inset 0 6px 18px rgba(0,0,0,.35)", transform: "translateZ(0)", transition: "transform .08s ease, opacity .12s ease, background .12s ease" });
    }
    function buildBubbles() {
      bubblesPanel.innerHTML = "";
      const total = gridCols * gridRows;
      for (let i=0;i<total;i++) {
        const d = document.createElement('button'); d.type = 'button'; styleBubble(d);
        d.addEventListener('pointerdown', () => { d.style.opacity = ".35"; d.style.transform = "scale(.85)"; d.style.background = "radial-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02))"; popSound(); setTimeout(() => { d.style.opacity = ""; d.style.transform = ""; d.style.background = ""; }, 900 + Math.random()*800); });
        bubblesPanel.appendChild(d);
      }
    }
    function resizeBubbles() {
      const w = stage.clientWidth || 360;
      gridCols = Math.max(6, Math.min(10, Math.floor(w / 44)));
      gridRows = 10;
      bubblesPanel.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
      bubblesPanel.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
      buildBubbles();
    }
    // Drag across
    let popping = false; stage.addEventListener('pointerdown', () => { popping = true; }); stage.addEventListener('pointerup', () => { popping = false; }); stage.addEventListener('pointerleave', () => { popping = false; });
    stage.addEventListener('pointermove', (e) => { if (!popping) return; const el = document.elementFromPoint(e.clientX, e.clientY); if (el && el.parentElement === bubblesPanel) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }});

    // Spinner
    let dragging = false; let prevA = 0, angle = 0, vel = 0; let lastT = 0; const FRICTION = 0.995;
    function setAngle(a) { angle = a; wheel.style.transform = `translateZ(0) rotate(${angle}deg)`; }
    function getAngleTo(x,y) { const rect = wheel.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2; return Math.atan2(y-cy, x-cx) * 180 / Math.PI; }
    function shortestDelta(from,to){ let d = to-from; while(d>180) d-=360; while(d<-180) d+=360; return d; }
    let wheelRadius = 100; function recalcSpinnerGeometry(){ const rect = wheel.getBoundingClientRect(); wheelRadius = Math.max(0, rect.width/2 - 24); }
    function layoutKnob(){ const rad = angle*Math.PI/180; const x = wheelRadius*Math.cos(rad); const y = wheelRadius*Math.sin(rad); knob.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`; }
    function onDown(e){ dragging = true; try { knob.setPointerCapture(e.pointerId); } catch {} lastT = performance.now(); prevA = getAngleTo(e.clientX, e.clientY); knob.style.cursor = 'grabbing'; spinnerStartSound(); }
    function onMove(e){ if(!dragging) return; const now = performance.now(); const a = getAngleTo(e.clientX, e.clientY); const da = shortestDelta(prevA, a); setAngle(angle + da); vel = (da)/Math.max(1,(now-lastT)); lastT = now; prevA = a; spinnerUpdateSound(Math.abs(vel)); }
    function onUp(e){ dragging = false; try { knob.releasePointerCapture(e.pointerId); } catch {} knob.style.cursor = 'grab'; requestAnimationFrame(inertiaStep); }
    function inertiaStep(){ if(dragging) return; vel *= FRICTION; const av = Math.abs(vel); if (av < 0.0001) { spinnerStopSound(); return; } setAngle(angle + vel * 16 * 18); spinnerUpdateSound(av); requestAnimationFrame(inertiaStep); }
    knob.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);

    // Mode + sound
    function showMode(m){ if(m==='bubbles'){ bubblesPanel.style.display='grid'; spinnerPanel.style.display='none'; } else { spinnerPanel.style.display='block'; bubblesPanel.style.display='none'; }}
    sel.addEventListener('change', ()=> showMode(sel.value));
    soundBtn.addEventListener('click', ()=> { soundOn = !soundOn; soundBtn.textContent = `Sound: ${soundOn? 'On':'Off'}`; if (!soundOn) spinnerStopSound(); });

    // init
    showMode('bubbles'); resizeBubbles(); recalcSpinnerGeometry();
    (function tick(){ layoutKnob(); requestAnimationFrame(tick); })();
    window.addEventListener('resize', () => { resizeBubbles(); recalcSpinnerGeometry(); });
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
