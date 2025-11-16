var port = null;
(async () => {
  port = await window.serverInfo.getPort();
  console.log("Port dispo :", port);
})();

const socket = io(`http://localhost:${port}`);
const roomId = localStorage.getItem('roomId');
const playerName = localStorage.getItem('playerName');
const isHost = localStorage.getItem('isHost') === 'true';

const roomIdDisplay = document.getElementById('roomIdDisplay');
const playersList = document.getElementById('playersList');
const settingsSection = document.getElementById('settingsSection');
const guestWaiting = document.getElementById('guestWaiting');
const startGameBtn = document.getElementById('startGameBtn');
const waitingMessage = document.getElementById('waitingMessage');

let players = [];

// Afficher les informations de la room
roomIdDisplay.textContent = roomId;

// Afficher/masquer les sections selon le rôle
if (!isHost) {
  settingsSection.style.display = 'none';
  guestWaiting.style.display = 'block';
}

// Rejoindre automatiquement la room au chargement
socket.emit('join-room', { playerName, roomId });

// Mise à jour des joueurs
socket.on('player-joined', (data) => {
  players = data.players;
  updatePlayersList();
  
  if (isHost && players.length === 2) {
    startGameBtn.disabled = false;
    waitingMessage.style.display = 'none';
  }
});

socket.on('player-left', (data) => {
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
        <div class="player-name">En attente...</div>
      `;
    }
    
    playersList.appendChild(playerCard);
  }
}

// Lancer la partie
startGameBtn.addEventListener('click', () => {
  const selectedMode = document.querySelector('input[name="mode"]:checked').value;
  socket.emit('start-game', { roomId, mode: selectedMode });
});

// Redirection vers le jeu
socket.on('game-started', (data) => {
  localStorage.setItem('gameData', JSON.stringify(data));
  window.location.href = 'game.html';
});
