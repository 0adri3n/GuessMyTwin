// Back to Menu button handler
const backToMenuBtn = document.getElementById('backToMenuBtn');
if (backToMenuBtn) {
  backToMenuBtn.addEventListener('click', () => {
    // Clean up sockets and go back to home
    ipcRenderer.send('disconnect-socket');
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerAvatar');
    localStorage.removeItem('serverUrl');
    localStorage.removeItem('isHost');
    window.location.href = 'home.html';
  });
}
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
const roomLabelEl = document.querySelector('.room-info .room-label');

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
  console.log('[gmt] Room info received:', data);
  players = data.players || [];
  updatePlayersList();

  // Update header label and waiting states depending on players count
  if (players.length < 2) {
    if (isHost) {
      // Host: waiting for guest
      startGameBtn.disabled = true;
      waitingMessage.style.display = 'block';
      guestWaiting.style.display = 'none';
      if (roomLabelEl) roomLabelEl.textContent = 'Waiting for players...';
    } else {
      // Guest: waiting for host to start (or waiting for host/other player)
      guestWaiting.style.display = 'block';
      waitingMessage.style.display = 'block';
      if (roomLabelEl) roomLabelEl.textContent = 'Waiting for host...';
    }
  } else {
    // Two players connected
    startGameBtn.disabled = !isHost; // only host can start
    waitingMessage.style.display = isHost ? 'none' : 'block';
    guestWaiting.style.display = 'block';
    if (roomLabelEl) {
      if (isHost) roomLabelEl.textContent = 'Players connected — ready to start';
      else roomLabelEl.textContent = 'All players connected — waiting for host to start';
    }
  }
});

syncRoomInfo();

console.log(`[gmt] Lobby: Loaded as ${isHost ? 'HOST' : 'GUEST'}`);

if (!isHost) {
  settingsSection.style.display = 'none';
  guestWaiting.style.display = 'block';
  console.log('[gmt] Guest: Waiting for host to start game...');
} else {
  console.log('[gmt] Host: Waiting for guest to join...');
  ipcRenderer.send('get-saved-mods');
}

ipcRenderer.on('saved-mods-loaded', (event, data) => {
  console.log('[gmt] Saved mods loaded:', data.mods.length);
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
    console.log('[gmt] Loading saved mod:', selectedMod.name);
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
  console.log('[gmt] Importing mod...');
  ipcRenderer.send('import-mod');
});

ipcRenderer.on('mod-imported', (event, data) => {
  console.log('[gmt] Mod imported successfully:', data.modName);
  customMod = data;
  customModInfo.style.display = 'flex';
  customModName.textContent = data.modName;
  ipcRenderer.send('get-saved-mods');
});

ipcRenderer.on('mod-import-error', (event, data) => {
  console.log('[gmt] Mod import error:', data.message);
  alert(data.message);
});

ipcRenderer.on('player-joined', (event, data) => {
  console.log('[gmt] Player joined, current players:', data.players.length);
  players = data.players;
  updatePlayersList();
  // Update header and waiting UI when player joins
  if (players.length < 2) {
    if (isHost) {
      startGameBtn.disabled = true;
      waitingMessage.style.display = 'block';
      if (roomLabelEl) roomLabelEl.textContent = 'Waiting for players...';
    } else {
      guestWaiting.style.display = 'block';
      if (roomLabelEl) roomLabelEl.textContent = 'Waiting for host...';
    }
  } else {
    // two players
    startGameBtn.disabled = !isHost;
    waitingMessage.style.display = 'none';
    if (roomLabelEl) {
      if (isHost) roomLabelEl.textContent = 'Players connected — ready to start';
      else {
        roomLabelEl.textContent = 'All players connected — waiting for host to start';
        guestWaiting.style.display = 'block';
        document.getElementById('guestWaiting').style.display = 'block';
      } 
    }
    if (isHost) console.log('[v0] Host: Ready to start game');
  }
});

ipcRenderer.on('player-left', (event, data) => {
  console.log('[gmt] Player left, current players:', data.players.length);
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
      console.log('[gmt] Displaying player in lobby:', players[i]);
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
    console.log('[gmt] Host: Starting game with custom mod:', customMod.modName);
    ipcRenderer.send('start-game', { mode: selectedMode, customCharacters: characters });
  } else {
    selectedMode = document.querySelector('input[name="mode"]:checked').value;
    console.log('[gmt] Host: Starting game with mode:', selectedMode);
    ipcRenderer.send('start-game', { mode: selectedMode });
  }

});

ipcRenderer.on('game-started', (event, data) => {
  console.log('[gmt] Game started, redirecting to game page...');
  localStorage.setItem('gameData', JSON.stringify(data));
  localStorage.setItem('opponentData', JSON.stringify(data.opponent || {}));
  window.location.href = 'game.html';
});

// If the socket to the host/server is disconnected unexpectedly,
// redirect the remaining player back to the home screen.
ipcRenderer.on('socket-disconnected', (event, data) => {
  console.log('[gmt] Socket disconnected event received in lobby:', data);
  if (!isHost) {
    // clear session values and go to home
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerAvatar');
    localStorage.removeItem('serverUrl');
    localStorage.removeItem('isHost');
    window.location.href = 'home.html';
  }
});
