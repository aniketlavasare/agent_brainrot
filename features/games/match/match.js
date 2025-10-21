const board = document.getElementById('board');
const difficultySelect = document.getElementById('difficulty');
const newBtn = document.getElementById('new');
const movesEl = document.getElementById('moves');
const matchesEl = document.getElementById('matches');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');

// Emoji sets for different themes
const EMOJI_SETS = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸'],
  nature: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🍀', '🌵'],
  faces: ['😀', '😎', '🤩', '😍', '🤗', '😜', '🤪', '😇'],
  space: ['🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '☁️']
};

const THEME_NAMES = Object.keys(EMOJI_SETS);

let gameState = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  moves: 0,
  totalPairs: 0,
  isProcessing: false,
  startTime: null,
  timerInterval: null,
  theme: THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)]
};

function getDifficulty() {
  const diff = difficultySelect.value;
  switch (diff) {
    case 'easy': return { pairs: 4, name: 'Easy' }; // 4x2 = 8 cards
    case 'medium': return { pairs: 6, name: 'Medium' }; // 4x3 = 12 cards
    case 'hard': return { pairs: 8, name: 'Hard' }; // 4x4 = 16 cards
    default: return { pairs: 4, name: 'Easy' };
  }
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createCard(emoji, index) {
  const card = document.createElement('button');
  card.className = 'card';
  card.dataset.emoji = emoji;
  card.dataset.index = index;
  card.setAttribute('aria-label', `Card ${index + 1}`);
  
  const back = document.createElement('div');
  back.className = 'card-back';
  
  const face = document.createElement('div');
  face.className = 'card-face';
  face.textContent = emoji;
  
  card.appendChild(back);
  card.appendChild(face);
  
  card.addEventListener('click', () => handleCardClick(card));
  
  return card;
}

function initGame() {
  // Reset state
  clearInterval(gameState.timerInterval);
  gameState = {
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    totalPairs: 0,
    isProcessing: false,
    startTime: null,
    timerInterval: null,
    theme: THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)]
  };
  
  const { pairs } = getDifficulty();
  gameState.totalPairs = pairs;
  
  // Get emojis for this game
  const emojiSet = EMOJI_SETS[gameState.theme];
  const selectedEmojis = emojiSet.slice(0, pairs);
  
  // Create pairs and shuffle
  const cardEmojis = shuffleArray([...selectedEmojis, ...selectedEmojis]);
  
  // Clear and rebuild board
  board.innerHTML = '';
  board.className = difficultySelect.value;
  
  cardEmojis.forEach((emoji, index) => {
    const card = createCard(emoji, index);
    gameState.cards.push(card);
    board.appendChild(card);
  });
  
  updateUI();
  statusEl.textContent = 'Find all matching pairs!';
  setTimeout(() => statusEl.textContent = '', 3000);
}

function handleCardClick(card) {
  if (gameState.isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  
  // Start timer on first move
  if (!gameState.startTime) {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(updateTimer, 1000);
  }
  
  // Flip the card
  card.classList.add('flipped');
  gameState.flippedCards.push(card);
  
  if (gameState.flippedCards.length === 2) {
    gameState.moves++;
    updateUI();
    checkForMatch();
  }
}

function checkForMatch() {
  gameState.isProcessing = true;
  const [card1, card2] = gameState.flippedCards;
  const emoji1 = card1.dataset.emoji;
  const emoji2 = card2.dataset.emoji;
  
  if (emoji1 === emoji2) {
    // Match found!
    setTimeout(() => {
      card1.classList.add('matched', 'just-matched');
      card2.classList.add('matched', 'just-matched');
      gameState.matchedPairs++;
      updateUI();
      gameState.flippedCards = [];
      gameState.isProcessing = false;
      
      // Remove animation class after animation completes
      setTimeout(() => {
        card1.classList.remove('just-matched');
        card2.classList.remove('just-matched');
      }, 500);
      
      // Check for win
      if (gameState.matchedPairs === gameState.totalPairs) {
        setTimeout(handleWin, 300);
      }
    }, 400);
  } else {
    // No match
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      gameState.flippedCards = [];
      gameState.isProcessing = false;
    }, 1000);
  }
}

function handleWin() {
  clearInterval(gameState.timerInterval);
  const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
  statusEl.textContent = `🎉 You won in ${gameState.moves} moves and ${timeTaken}s!`;
  statusEl.classList.add('celebrating');
  setTimeout(() => statusEl.classList.remove('celebrating'), 2000);
}

function updateUI() {
  movesEl.textContent = `Moves: ${gameState.moves}`;
  matchesEl.textContent = `Matches: ${gameState.matchedPairs}/${gameState.totalPairs}`;
}

function updateTimer() {
  if (!gameState.startTime) return;
  const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
  timerEl.textContent = `Time: ${elapsed}s`;
}

// Event listeners
newBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', initGame);

// Initialize on load
initGame();

