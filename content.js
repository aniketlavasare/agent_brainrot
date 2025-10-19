(() => {
  if (window.__abContentInstalled__) return;
  window.__abContentInstalled__ = true;

  const AGENT_IFRAME_ID = "__ab_agent_iframe__";
  const OVERLAY_CLASS = "__ab_overlay__";
  const Z_BASE = 2147483000;
  const UI_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
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
      background: "#000",
      fontFamily: UI_FONT
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
      background: "#111",
      color: "#fff",
      fontFamily: UI_FONT
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
    const title = document.createElement("div"); title.textContent = "Tic-Tac-Toe"; Object.assign(title.style, { fontSize: "12px", opacity: ".9" });
    const btnClose = document.createElement("button"); btnClose.textContent = "\u00D7"; Object.assign(btnClose.style, { all: "unset", width: "22px", height: "22px", display: "grid", placeItems: "center", borderRadius: "6px", background: "rgba(255,255,255,.15)", cursor: "pointer" }); btnClose.title = "Close"; btnClose.addEventListener("click", () => { wrap.remove(); });
    hdr.appendChild(title); hdr.appendChild(btnClose);

    const inner = document.createElement("div"); Object.assign(inner.style, { position: "absolute", inset: "34px 0 0 0", display: "grid", gridTemplateRows: "auto 1fr auto", gap: "8px", fontFamily: UI_FONT });
    const toolbar = document.createElement("div"); Object.assign(toolbar.style, { display: "flex", alignItems: "center", gap: "8px", padding: "8px", borderBottom: "1px solid rgba(255,255,255,.12)" });
    const lab = document.createElement("label"); lab.textContent = "Mode"; Object.assign(lab.style, { fontSize: "12px", opacity: ".8" });
    const sel = document.createElement("select"); Object.assign(sel.style, { background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", borderRadius: "8px", padding: "6px 8px" }); sel.innerHTML = `<option value="ai_block" selected>vs AI - Smart</option><option value="ai_random">vs AI - Random</option><option value="self">vs Self</option>`;
    const newBtn = document.createElement("button"); newBtn.textContent = "New"; Object.assign(newBtn.style, { cursor: "pointer", padding: "6px 8px", borderRadius: "8px", background: "#fff", color: "#111", border: 0, fontWeight: 700 });
    const spacer = document.createElement("div"); Object.assign(spacer.style, { flex: 1 });
    const scoreEl = document.createElement("div"); scoreEl.textContent = "W 0 | L 0 | D 0"; Object.assign(scoreEl.style, { fontSize: "12px", opacity: ".9" });
    const resetBtn = document.createElement("button"); resetBtn.textContent = "Reset Stats"; Object.assign(resetBtn.style, { cursor: "pointer", padding: "6px 8px", borderRadius: "8px", background: "rgba(255,255,255,.12)", color: "#fff", border: 0, fontWeight: 700 });
    toolbar.appendChild(lab); toolbar.appendChild(sel); toolbar.appendChild(newBtn); toolbar.appendChild(spacer); toolbar.appendChild(scoreEl); toolbar.appendChild(resetBtn);

    const board = document.createElement("div"); Object.assign(board.style, { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: "10px", padding: "10px" });
    const status = document.createElement("div"); Object.assign(status.style, { fontSize: "13px", opacity: ".95", padding: "0 10px 10px" });

    inner.appendChild(toolbar); inner.appendChild(board); inner.appendChild(status);
    wrap.appendChild(hdr); wrap.appendChild(inner); document.documentElement.appendChild(wrap);
    makeDraggable(wrap, hdr);

    // Game logic
    const W_KEY = 'ab_ttt_wins', L_KEY = 'ab_ttt_losses', D_KEY = 'ab_ttt_draws';
    const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let b = Array(9).fill(null); let cur = 'X'; let over = false; let thinking = false; let stats = { w:0,l:0,d:0 };
    function setStatus(msg){ status.textContent = msg || ''; }
    function updateScore(){ scoreEl.textContent = `W ${stats.w} | L ${stats.l} | D ${stats.d}`; }
    function readStats(){ return new Promise((res)=>{ try { chrome.storage?.local.get([W_KEY,L_KEY,D_KEY], (r)=>{ stats.w=Number(r?.[W_KEY]||0); stats.l=Number(r?.[L_KEY]||0); stats.d=Number(r?.[D_KEY]||0); updateScore(); res(); }); } catch { try { const w=localStorage.getItem(W_KEY)||0,l=localStorage.getItem(L_KEY)||0,d=localStorage.getItem(D_KEY)||0; stats={w:Number(w),l:Number(l),d:Number(d)}; updateScore(); } catch {} res(); }}); }
    function saveStats(){ try { chrome.storage?.local.set({[W_KEY]:stats.w,[L_KEY]:stats.l,[D_KEY]:stats.d}); } catch { try { localStorage.setItem(W_KEY,String(stats.w)); localStorage.setItem(L_KEY,String(stats.l)); localStorage.setItem(D_KEY,String(stats.d)); } catch {} } }
    function render(){ board.innerHTML=''; for(let i=0;i<9;i++){ const btn=document.createElement('button'); Object.assign(btn.style,{display:'grid',placeItems:'center',fontSize:'38px',lineHeight:'1',width:'100%',aspectRatio:'1/1',background:'rgba(255,255,255,.06)',color:'#fff',border:'1px solid rgba(255,255,255,.15)',borderRadius:'12px',cursor:(b[i]||over||thinking)?'not-allowed':'pointer'}); btn.textContent=b[i]||''; btn.dataset.idx=String(i); btn.disabled=!!b[i]||over||thinking; btn.addEventListener('click', onCell); board.appendChild(btn);} }
    function winObj(bb){ for(const [a,c,d] of WINS){ if(bb[a]&&bb[a]===bb[c]&&bb[a]===bb[d]) return {p:bb[a],line:[a,c,d]}; } return null; }
    function empties(bb){ const e=[]; for(let i=0;i<9;i++) if(!bb[i]) e.push(i); return e; }
    function isDraw(bb){ return empties(bb).length===0 && !winObj(bb); }
    function pickRandom(bb){ const e=empties(bb); return e.length? e[Math.floor(Math.random()*e.length)] : -1; }
    function pickSmart(bb, me='O', them='X'){ for(const i of empties(bb)){ const t=bb.slice(); t[i]=me; if(winObj(t)?.p===me) return i; } for(const i of empties(bb)){ const t=bb.slice(); t[i]=them; if(winObj(t)?.p===them) return i; } if(!bb[4]) return 4; const corners=[0,2,6,8].filter(i=>!bb[i]); if(corners.length) return corners[Math.floor(Math.random()*corners.length)]; return pickRandom(bb); }
    function highlight(line){ const cs=[...board.children]; if(Array.isArray(line)) for(const i of line){ if (cs[i]) { cs[i].style.background='rgba(0,200,120,.25)'; cs[i].style.borderColor='rgba(0,200,120,.65)'; } } }

    function requestTaunt(cb){ const rid = Math.random().toString(36).slice(2); function onMsg(e){ const d=e?.data||{}; if(d.type==='AB_TAUNT_REPLY' && d.id===rid){ try{ window.removeEventListener('message', onMsg); }catch{} cb(String(d.text||'')); } } window.addEventListener('message', onMsg); try { window.top?.postMessage({ type:'AB_TAUNT_REQUEST', id: rid }, '*'); } catch { cb(''); } setTimeout(()=>{ try{ window.removeEventListener('message', onMsg);}catch{} cb(''); }, 1500); }

    function conclude(resu){ over=true; render(); if(resu?.p){ setStatus(`${resu.p} wins!`); highlight(resu.line); if(resu.p==='X') stats.w++; else { stats.l++; requestTaunt((line)=>{ if(!line) line=['Ouch. The O was on point!','GG! The O-bot strikes again.','Next time, center first.','Calculated. Cold. Victorious.','That was a textbook trap.'][Math.floor(Math.random()*5)]; setStatus(`${resu.p} wins!\n${line}`); }); } } else { setStatus('Draw.'); stats.d++; } updateScore(); saveStats(); }
    function checkEnd(){ const r=winObj(b); if(r){ conclude(r); return true;} if(isDraw(b)){ conclude({}); return true;} return false; }
    function moveAt(i){ if(over||thinking||b[i]) return false; b[i]=cur; render(); if(checkEnd()) return true; cur = (cur==='X'?'O':'X'); return true; }
    async function aiTurn(){ if(over||sel.value==='self'||cur!=='O') return; thinking=true; render(); await new Promise(r=>setTimeout(r,200)); let idx = (sel.value==='ai_random')? pickRandom(b) : pickSmart(b,'O','X'); if(idx>=0) moveAt(idx); thinking=false; render(); checkEnd(); }
    function onCell(e){ const idx=Number(e.currentTarget?.dataset?.idx); if(!Number.isInteger(idx)) return; const ok = moveAt(idx); if(ok) aiTurn(); }
    function reset(){ b=Array(9).fill(null); cur='X'; over=false; thinking=false; setStatus(''); render(); }

    newBtn.addEventListener('click', reset); resetBtn.addEventListener('click', ()=>{ stats={w:0,l:0,d:0}; saveStats(); updateScore(); }); sel.addEventListener('change', reset);
    (async ()=>{ await readStats(); reset(); })();
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
      color: "#fff",
      fontFamily: UI_FONT
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
      fontFamily: UI_FONT
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
