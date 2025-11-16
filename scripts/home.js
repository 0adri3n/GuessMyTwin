var port = null;
(async () => {
  port = await window.serverInfo.getPort();
  console.log("Port dispo :", port);
})();

const socket = io(`http://localhost:${port}`);
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const errorMessage = document.getElementById('errorMessage');

// Créer une room
createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    showError('Veuillez entrer votre nom');
    return;
  }
  
  socket.emit('create-room', { playerName });
});

// Rejoindre une room
joinRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const roomId = roomIdInput.value.trim().toUpperCase();
  
  if (!playerName) {
    showError('Veuillez entrer votre nom');
    return;
  }
  
  if (!roomId) {
    showError('Veuillez entrer le code de la room');
    return;
  }
  
  socket.emit('join-room', { playerName, roomId });
});

// Room créée avec succès
socket.on('room-created', (data) => {
  localStorage.setItem('playerName', data.playerName);
  localStorage.setItem('roomId', data.roomId);
  localStorage.setItem('isHost', 'true');
  window.location.href = 'lobby.html';
});

// Rejoindre une room avec succès
socket.on('player-joined', (data) => {
  localStorage.setItem('playerName', playerNameInput.value.trim());
  localStorage.setItem('roomId', data.roomId);
  localStorage.setItem('isHost', 'false');
  window.location.href = 'lobby.html';
});

// Erreur
socket.on('error', (data) => {
  showError(data.message);
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 3000);
}
