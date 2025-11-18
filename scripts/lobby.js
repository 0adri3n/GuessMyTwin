const { ipcRenderer } = require('electron');

const playerName = localStorage.getItem('playerName');
const isHost = localStorage.getItem('isHost') === 'true';

const playersList = document.getElementById('playersList');
const settingsSection = document.getElementById('settingsSection');
const guestWaiting = document.getElementById('guestWaiting');
const startGameBtn = document.getElementById('startGameBtn');
const waitingMessage = document.getElementById('waitingMessage');
const themeToggle = document.getElementById('themeToggle');
const importModBtn = document.getElementById('importModBtn');
const customModInfo = document.getElementById('customModInfo');
const customModName = document.getElementById('customModName');

let players = [];
let customMod = null;


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

function syncRoomInfo() {
  ipcRenderer.send('get-room-info');
}

ipcRenderer.on('room-info', (event, data) => {
  console.log('[v0] Room info received:', data);
  players = data.players || [];
  updatePlayersList();

  if (isHost) {
    if (players.length === 2) {
      startGameBtn.disabled = false;
      waitingMessage.style.display = 'none';
    } else {
      startGameBtn.disabled = true;
      waitingMessage.style.display = 'block';
    }
  } else {
    guestWaiting.style.display = players.length < 2 ? 'block' : 'none';
  }
});

syncRoomInfo();

console.log(`[v0] Lobby: Loaded as ${isHost ? 'HOST' : 'GUEST'}`);

if (!isHost) {
  settingsSection.style.display = 'none';
  guestWaiting.style.display = 'block';
  console.log('[v0] Guest: Waiting for host to start game...');
} else {
  console.log('[v0] Host: Waiting for guest to join...');
}

importModBtn.addEventListener('click', () => {
  if (!isHost) return;
  console.log('[v0] Importing mod...');
  ipcRenderer.send('import-mod');
});

ipcRenderer.on('mod-imported', (event, data) => {
  console.log('[v0] Mod imported successfully:', data.modName);
  customMod = data;
  customModInfo.style.display = 'flex';
  customModName.textContent = data.modName;
});

ipcRenderer.on('mod-import-error', (event, data) => {
  console.log('[v0] Mod import error:', data.message);
  alert(data.message);
});

ipcRenderer.on('player-joined', (event, data) => {
  console.log('[v0] Player joined, current players:', data.players.length);
  players = data.players;
  updatePlayersList();
  
  if (isHost && players.length === 2) {
    startGameBtn.disabled = false;
    waitingMessage.style.display = 'none';
    console.log('[v0] Host: Ready to start game');
  }
});

ipcRenderer.on('player-left', (event, data) => {
  console.log('[v0] Player left, current players:', data.players.length);
  players = data.players;
  updatePlayersList();
  
  if (isHost && players.length < 2) {
    startGameBtn.disabled = true;
    waitingMessage.style.display = 'block';
  }
});

function updatePlayersList() {
  playersList.innerHTML = '';
  
  for (let i = 0; i < 2; i++) {
    const playerCard = document.createElement('div');
    
    if (players[i]) {
      playerCard.className = 'player-card';
      playerCard.innerHTML = `
        <div class="player-icon">🎮</div>
        <div class="player-name">${players[i].name}</div>
      `;
    } else {
      playerCard.className = 'player-card empty';
      playerCard.innerHTML = `
        <div class="player-icon">👤</div>
        <div class="player-name">Waiting...</div>
      `;
    }
    
    playersList.appendChild(playerCard);
  }
}

startGameBtn.addEventListener('click', () => {
  if (!isHost) return;
  
  let selectedMode;
  let characters;
  
  if (customMod) {
    selectedMode = 'custom';
    characters = customMod.characters;
    console.log('[v0] Host: Starting game with custom mod:', customMod.modName);
    ipcRenderer.send('start-game', { mode: selectedMode, customCharacters: characters });
  } else {
    selectedMode = document.querySelector('input[name="mode"]:checked').value;
    console.log('[v0] Host: Starting game with mode:', selectedMode);
    ipcRenderer.send('start-game', { mode: selectedMode });
  }

});

ipcRenderer.on('game-started', (event, data) => {
  console.log('[v0] Game started, redirecting to game page...');
  localStorage.setItem('gameData', JSON.stringify(data));
  window.location.href = 'game.html';
});
