(function () {
  const modeEl = document.getElementById('mode');
  const soundBtn = document.getElementById('sound');
  const soundIcon = document.getElementById('soundIcon');
  const stage = document.getElementById('stage');
  const bubblesPanel = document.getElementById('bubbles');
  const spinnerPanel = document.getElementById('spinner');
  const wheel = document.getElementById('wheel');
  const knob = document.getElementById('knob');
  const statusEl = document.getElementById('status');

  let soundOn = false; // muted by default
  let ac = null;

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }

  function ensureAudio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return ac;
  }

  function popSound() {
    if (!soundOn) return;
    const ctx = ensureAudio(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 220 + Math.random()*180;
    g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.06);
  }

  // ---- Bubble Pop ----
  let gridCols = 8, gridRows = 10;
  function buildBubbles() {
    bubblesPanel.innerHTML = '';
    const total = gridCols * gridRows;
    const frag = document.createDocumentFragment();
    for (let i=0;i<total;i++) {
      const d = document.createElement('button');
      d.className = 'bubble';
      d.type = 'button';
      d.addEventListener('pointerdown', (e) => {
        d.classList.add('popped');
        popSound();
        // Auto-regen after short delay
        setTimeout(() => d.classList.remove('popped'), 900 + Math.random()*800);
      });
      frag.appendChild(d);
    }
    bubblesPanel.appendChild(frag);
  }

  function resizeBubbles() {
    const w = stage.clientWidth || 360;
    gridCols = Math.max(6, Math.min(10, Math.floor(w / 44)));
    gridRows = 10;
    bubblesPanel.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
    bubblesPanel.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
    buildBubbles();
  }

  // Drag across to pop many
  let popping = false;
  stage.addEventListener('pointerdown', (e) => { popping = true; });
  stage.addEventListener('pointerup', () => { popping = false; });
  stage.addEventListener('pointerleave', () => { popping = false; });
  stage.addEventListener('pointermove', (e) => {
    if (!popping) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.classList && el.classList.contains('bubble')) {
      if (!el.classList.contains('popped')) {
        el.classList.add('popped');
        popSound();
        setTimeout(() => el.classList.remove('popped'), 900 + Math.random()*800);
      }
    }
  });

  // ---- Spinner ----
  let dragging = false;
  let prevA = 0, angle = 0, vel = 0;
  let lastT = 0;
  const FRICTION = 0.995; // gentle inertia

  function setAngle(a) {
    angle = a;
    wheel.style.transform = `translateZ(0) rotate(${angle}deg)`;
  }

  function onPointerDown(e) {
    dragging = true; knob.setPointerCapture(e.pointerId);
    lastT = performance.now();
    prevA = getAngleToCenter(e.clientX, e.clientY);
    knob.classList.add('dragging');
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const now = performance.now();
    const a = getAngleToCenter(e.clientX, e.clientY);
    const da = shortestDelta(prevA, a);
    setAngle(angle + da);
    vel = (da) / Math.max(1, (now - lastT));
    lastT = now; prevA = a;
  }
  function onPointerUp(e) {
    dragging = false; knob.releasePointerCapture(e.pointerId);
    knob.classList.remove('dragging');
    requestAnimationFrame(inertiaStep);
  }

  function inertiaStep(now) {
    if (dragging) return;
    // decay velocity and apply
    vel *= FRICTION;
    if (Math.abs(vel) < 0.0001) return;
    setAngle(angle + vel * 16 /* ~ms frame */ * 18 /* speed scale */);
    requestAnimationFrame(inertiaStep);
  }

  function getAngleToCenter(x, y) {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = x - cx;
    const dy = y - cy;
    let deg = Math.atan2(dy, dx) * 180 / Math.PI;
    return deg;
  }
  function shortestDelta(from, to) {
    let d = to - from;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  let wheelRadius = 100;
  function recalcSpinnerGeometry() {
    const rect = wheel.getBoundingClientRect();
    wheelRadius = Math.max(0, rect.width/2 - 24);
  }
  function layoutKnob() {
    const rad = angle * Math.PI / 180;
    const x = wheelRadius * Math.cos(rad);
    const y = wheelRadius * Math.sin(rad);
    knob.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`;
  }

  function tick() {
    layoutKnob();
    requestAnimationFrame(tick);
  }

  // ---- Mode switching ----
  function showMode(m) {
    bubblesPanel.hidden = m !== 'bubbles';
    spinnerPanel.hidden = m !== 'spinner';
    setStatus(m === 'bubbles' ? 'Bubble Pop' : 'Spinner');
  }

  modeEl.addEventListener('change', () => showMode(modeEl.value));
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundIcon.textContent = soundOn ? 'On' : 'Off';
  });

  knob.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  window.addEventListener('resize', () => { resizeBubbles(); recalcSpinnerGeometry(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { try { window.parent.postMessage({ type: 'AB_CLOSE_TOP' }, '*'); } catch {} } });

  // init
  (function init() {
    showMode('bubbles');
    resizeBubbles();
    soundIcon.textContent = soundOn ? 'On' : 'Off';
    recalcSpinnerGeometry();
    requestAnimationFrame(tick);
  })();
})();


