const modeSelect = document.getElementById('mode');
const tictactoeFrame = document.getElementById('tictactoe');
const matchFrame = document.getElementById('match');

function showGame(gameName) {
  // Hide all games
  tictactoeFrame.hidden = true;
  matchFrame.hidden = true;
  
  // Show selected game
  switch (gameName) {
    case 'tictactoe':
      tictactoeFrame.hidden = false;
      break;
    case 'match':
      matchFrame.hidden = false;
      break;
  }
  
  // Save preference
  try {
    chrome.storage?.local.set({ ab_last_game: gameName });
  } catch {}
}

// Load saved game preference
function loadPreference() {
  try {
    chrome.storage?.local.get(['ab_last_game'], (res) => {
      const lastGame = res?.ab_last_game || 'tictactoe';
      modeSelect.value = lastGame;
      showGame(lastGame);
    });
  } catch {
    showGame('tictactoe');
  }
}

modeSelect.addEventListener('change', (e) => {
  showGame(e.target.value);
});

// Initialize
loadPreference();

