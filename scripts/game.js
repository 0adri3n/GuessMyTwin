const { ipcRenderer } = require('electron');

const isHost = localStorage.getItem('isHost') === 'true';
const gameData = JSON.parse(localStorage.getItem('gameData'));
const opponentData = JSON.parse(localStorage.getItem('opponentData') || '{}');

console.log('[gmt] Loaded game data:', gameData);
const yourCharacter = gameData.yourCharacter;
const characters = gameData.characters;

const yourCharacterDisplay = document.getElementById('yourCharacter');
const yourCharacterImage = document.getElementById('yourCharacterImage');
const yourCharacterName = document.getElementById('yourCharacterName');
const charactersGrid = document.getElementById('charactersGrid');
const guessBtn = document.getElementById('guessBtn');
const guessModal = document.getElementById('guessModal');
const guessGrid = document.getElementById('guessGrid');
const cancelGuessBtn = document.getElementById('cancelGuessBtn');
const gameOverModal = document.getElementById('gameOverModal');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const themeToggle = document.getElementById('themeToggle');

let eliminatedCharacters = new Set();
let mySocketId = gameData.yourId; // Placeholder, will be set properly
console.log('[gmt] My socket ID:', mySocketId);

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector('.theme-icon');
  icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

initTheme();

console.log(`[gmt] Game: Loaded as ${isHost ? 'HOST' : 'GUEST'}`);
console.log(`[gmt] Your character:`, yourCharacter.name);


yourCharacterDisplay.textContent = yourCharacter.name;
yourCharacterImage.src = yourCharacter.image;
yourCharacterName.textContent = yourCharacter.name;


function setVsName(id, name) {
  const el = document.getElementById(id);
  if (!el) return;
  // Truncate to 20 chars, add ellipsis if needed
  let displayName = name || '';
  if (displayName.length > 20) displayName = displayName.slice(0, 20) + '…';
  el.textContent = displayName;
  // Use .small class if name is long (12+ chars)
  if (displayName.length > 12) {
    el.classList.add('small');
  } else {
    el.classList.remove('small');
  }
}

const yourName = localStorage.getItem('playerName');
const yourAvatar = localStorage.getItem('playerAvatar');
const opponentName = opponentData.name || 'Opponent';
const opponentAvatar = opponentData.avatar || null;

setVsName('yourName', yourName || 'You');
if (yourAvatar) {
  const yourAvatarEl = document.getElementById('yourAvatar');
  const img = document.createElement('img');
  img.src = yourAvatar;
  img.alt = 'Your avatar';
  img.className = 'avatar-img';
  yourAvatarEl.innerHTML = '';
  yourAvatarEl.appendChild(img);
}

setVsName('opponentName', opponentName);
if (opponentAvatar) {
  const opponentAvatarEl = document.getElementById('opponentAvatar');
  const img = document.createElement('img');
  img.src = opponentAvatar;
  img.alt = 'Opponent avatar';
  img.className = 'avatar-img';
  opponentAvatarEl.innerHTML = '';
  opponentAvatarEl.appendChild(img);
}

// Load persistent profile (if any) and update UI
ipcRenderer.send('load-profile');
ipcRenderer.on('profile-loaded', (event, data) => {
  if (!data) return;
  // const name = data.name || localStorage.getItem('playerName') || 'You';
  // const avatar = data.avatar || localStorage.getItem('playerAvatar') || null;
  // document.getElementById('yourName').textContent = name || 'You';
  // if (avatar) {
  //   const yourAvatarEl = document.getElementById('yourAvatar');
  //   const img = document.createElement('img');
  //   img.src = avatar;
  //   img.alt = 'Your avatar';
  //   yourAvatarEl.innerHTML = '';
  //   yourAvatarEl.appendChild(img);
  // }
});

characters.forEach(character => {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.dataset.id = character.id;
  card.innerHTML = `
    <img src="${character.image}" alt="${character.name}">
    <p>${character.name}</p>
  `;
  
  card.addEventListener('click', () => {
    if (!eliminatedCharacters.has(character.id)) {
      eliminatedCharacters.add(character.id);
      card.classList.add('eliminated');
    } else {
      eliminatedCharacters.delete(character.id);
      card.classList.remove('eliminated');
    }
  });
  
  charactersGrid.appendChild(card);
});

guessBtn.addEventListener('click', () => {
  guessModal.classList.add('show');
  
  guessGrid.innerHTML = '';
  characters.forEach(character => {
    if (!eliminatedCharacters.has(character.id) && character.id !== yourCharacter.id) {
      const card = document.createElement('div');
      card.className = 'guess-card';
      card.innerHTML = `
        <img src="${character.image}" alt="${character.name}">
        <p>${character.name}</p>
      `;
      
      card.addEventListener('click', () => {
        console.log('[gmt] Guessing character:', character.name);
        ipcRenderer.send('guess-character', { 
          characterId: character.id,
          socketId: mySocketId 
        });
        guessModal.classList.remove('show');
      });
      
      guessGrid.appendChild(card);
    }
  });
});

cancelGuessBtn.addEventListener('click', () => {
  guessModal.classList.remove('show');
});

ipcRenderer.on('guess-wrong', (event, data) => {
  console.log('[gmt] Wrong guess!');
  alert(data.message);
});

ipcRenderer.on('game-over', (event, data) => {
  const isWinner = data.winner === mySocketId;
  var opponent_character = isWinner ? data.opponent_character : data.guesser_character;
  var opponent_name = isWinner ? data.opponent_name : data.guesser_name;

  console.log(`[gmt] Game over! ${isWinner ? 'You won!' : 'You lost!'}`);
  
  document.getElementById('gameOverTitle').textContent = 
    isWinner ? '🎉 You Won!' : '😢 You Lost!';
  
  document.getElementById('winnerCharacterImage').src = opponent_character.image;
  document.getElementById('winnerCharacterName').textContent = 
    `${opponent_name} character was: ${opponent_character.name}`;
  
  gameOverModal.classList.add('show');
});
backToHomeBtn.addEventListener('click', () => {
  console.log('[gmt] Going back to home, cleaning up...');
  ipcRenderer.send('disconnect-socket');
  localStorage.clear();
});

ipcRenderer.on('socket-disconnected', () => {
  console.log('[gmt] Socket disconnected, redirecting to home...');
  window.location.href = 'home.html';
});