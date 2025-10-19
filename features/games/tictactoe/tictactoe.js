(function () {
  const boardEl = document.getElementById('board');
  const modeEl = document.getElementById('mode');
  const newBtn = document.getElementById('new');
  const resetStatsBtn = document.getElementById('resetStats');
  const turnEl = document.getElementById('turn');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');

  const W_KEY = 'ab_ttt_wins';
  const L_KEY = 'ab_ttt_losses';
  const D_KEY = 'ab_ttt_draws';

  const WINS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  let board = Array(9).fill(null);
  let current = 'X';
  let finished = false;
  let thinking = false;
  let stats = { w: 0, l: 0, d: 0 };

  function $(sel) { return document.querySelector(sel); }
  function cells() { return Array.from(boardEl.querySelectorAll('.cell')); }

  function renderBoard() {
    cells().forEach((btn, i) => {
      const v = board[i];
      btn.textContent = v ? v : '';
      btn.disabled = !!v || finished || thinking;
      btn.classList.remove('win');
    });
  }

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }
  function setTurn() { if (turnEl) turnEl.textContent = finished ? 'Game Over' : `Turn: ${current}`; }
  function updateScore() { if (scoreEl) scoreEl.textContent = `W ${stats.w} · L ${stats.l} · D ${stats.d}`; }

  function readStats() {
    return new Promise((resolve) => {
      try {
        chrome.storage?.local.get([W_KEY, L_KEY, D_KEY], (res) => {
          stats.w = Number(res?.[W_KEY] || 0);
          stats.l = Number(res?.[L_KEY] || 0);
          stats.d = Number(res?.[D_KEY] || 0);
          updateScore();
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  function saveStats() {
    try {
      chrome.storage?.local.set({ [W_KEY]: stats.w, [L_KEY]: stats.l, [D_KEY]: stats.d });
    } catch {}
  }

  function resetBoard() {
    board = Array(9).fill(null);
    current = 'X';
    finished = false;
    thinking = false;
    setStatus('');
    setTurn();
    renderBoard();
  }

  function resetStats() {
    stats = { w: 0, l: 0, d: 0 };
    updateScore();
    saveStats();
  }

  function winner(b) {
    for (const [a,b2,c] of WINS) {
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) return { p: b[a], line: [a,b2,c] };
    }
    return null;
  }

  function empties(b) { const e = []; for (let i=0;i<9;i++) if (!b[i]) e.push(i); return e; }

  function isDraw(b) { return empties(b).length === 0 && !winner(b); }

  function pickRandom(b) {
    const e = empties(b);
    if (!e.length) return -1;
    return e[Math.floor(Math.random()*e.length)];
  }

  function pickSmart(b, me='O', them='X') {
    // 1) Win if possible
    for (const i of empties(b)) { const tmp = b.slice(); tmp[i] = me; if (winner(tmp)?.p === me) return i; }
    // 2) Block opponent
    for (const i of empties(b)) { const tmp = b.slice(); tmp[i] = them; if (winner(tmp)?.p === them) return i; }
    // 3) Center
    if (!b[4]) return 4;
    // 4) Corners
    const corners = [0,2,6,8].filter(i => !b[i]);
    if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
    // 5) Any
    return pickRandom(b);
  }

  function applyWinHighlight(line) {
    if (!Array.isArray(line)) return;
    for (const idx of line) {
      const btn = boardEl.querySelector(`.cell[data-idx="${idx}"]`);
      if (btn) btn.classList.add('win');
    }
  }

  function conclude(result) {
    finished = true;
    renderBoard();
    setTurn();
    if (result?.p) {
      setStatus(`${result.p} wins!`);
      applyWinHighlight(result.line);
      if (result.p === 'X') stats.w++; else stats.l++;
      updateScore();
      saveStats();
    } else {
      setStatus(`Draw.`);
      stats.d++;
      updateScore();
      saveStats();
    }
  }

  function checkEnd() {
    const r = winner(board);
    if (r) { conclude(r); return true; }
    if (isDraw(board)) { conclude({}); return true; }
    return false;
  }

  function moveAt(i) {
    if (finished || thinking) return false;
    if (board[i]) return false; // cannot click finished squares
    board[i] = current;
    renderBoard();
    if (checkEnd()) return true;
    current = current === 'X' ? 'O' : 'X';
    setTurn();
    return true;
  }

  async function aiTurnIfNeeded() {
    if (finished) return;
    const mode = modeEl.value;
    if (mode === 'self') return;
    if (current !== 'O') return; // player is X
    thinking = true; renderBoard();
    await new Promise(r => setTimeout(r, 250));
    let idx = -1;
    if (mode === 'ai_random') idx = pickRandom(board);
    else idx = pickSmart(board, 'O', 'X');
    if (idx >= 0) moveAt(idx);
    thinking = false; renderBoard();
    // After AI move, check if game ends; otherwise it's player's turn
    checkEnd();
  }

  function onCellClick(e) {
    const btn = e.target.closest('.cell');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (!Number.isInteger(idx)) return;
    const ok = moveAt(idx);
    if (ok) aiTurnIfNeeded();
  }

  boardEl.addEventListener('click', onCellClick);
  newBtn.addEventListener('click', () => resetBoard());
  resetStatsBtn.addEventListener('click', () => resetStats());
  modeEl.addEventListener('change', () => resetBoard());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      try { window.parent.postMessage({ type: 'AB_CLOSE_TOP' }, '*'); } catch {}
    }
  });

  window.addEventListener('message', (e) => {
    const data = e?.data || {};
    if (data.type === 'AB_TTT_INIT') {
      // reserved for future payload
    }
  });

  // init
  (async () => {
    await readStats();
    resetBoard();
  })();
})();
