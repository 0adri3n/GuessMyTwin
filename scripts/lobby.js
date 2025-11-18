const { ipcRenderer } = require('electron');

const playerName = localStorage.getItem('playerName');
const playerAvatar = localStorage.getItem('playerAvatar');
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
const savedModsSelect = document.getElementById('savedModsSelect');
const loadSavedModBtn = document.getElementById('loadSavedModBtn');

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
  ipcRenderer.send('get-saved-mods');
}

ipcRenderer.on('saved-mods-loaded', (event, data) => {
  console.log('[v0] Saved mods loaded:', data.mods.length);
  savedModsSelect.innerHTML = '<option value="">-- Select a saved mod --</option>';
  data.mods.forEach((mod, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = mod.name;
    savedModsSelect.appendChild(option);
  });
  
  // Store mods data for later use
  savedModsSelect.dataset.mods = JSON.stringify(data.mods);
});

loadSavedModBtn.addEventListener('click', () => {
  const selectedIndex = savedModsSelect.value;
  if (selectedIndex === '') {
    alert('Please select a mod to load');
    return;
  }
  
  const mods = JSON.parse(savedModsSelect.dataset.mods || '[]');
  const selectedMod = mods[selectedIndex];
  
  if (selectedMod) {
    console.log('[v0] Loading saved mod:', selectedMod.name);
    customMod = {
      modName: selectedMod.name,
      characters: selectedMod.characters
    };
    customModInfo.style.display = 'flex';
    customModName.textContent = selectedMod.name;
  }
});

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
  ipcRenderer.send('get-saved-mods');
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
      const avatarHtml = players[i].avatar 
      ? `<div class="player-avatar"><img src="${players[i].avatar}" alt="Avatar"></div>`
      : `<div class="player-avatar"><div class="player-icon">🎮</div></div>`;
      
      playerCard.innerHTML = `
        ${avatarHtml}
        <div class="player-name">${players[i].name}</div>
      `;
    } else {
      playerCard.className = 'player-card empty';
      playerCard.innerHTML = `
        <div class="player-avatar"><div class="player-icon">👤</div></div>
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
  localStorage.setItem('opponentData', JSON.stringify(data.opponent || {}));
  window.location.href = 'game.html';
});

// If the socket to the host/server is disconnected unexpectedly,
// redirect the remaining player back to the home screen.
ipcRenderer.on('socket-disconnected', (event, data) => {
  console.log('[v0] Socket disconnected event received in lobby:', data);
  if (!isHost) {
    alert('Connection to the host/server was lost. Returning to home.');
    // clear session values and go to home
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerAvatar');
    localStorage.removeItem('serverUrl');
    localStorage.removeItem('isHost');
    window.location.href = 'home.html';
  }
});
