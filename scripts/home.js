const { ipcRenderer } = require('electron');

let socket;
let serverUrl = 'http://localhost:3000';
let isHost = false;

const playerNameInput = document.getElementById('playerName');
const serverUrlInput = document.getElementById('serverUrl');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const errorMessage = document.getElementById('errorMessage');
const themeToggle = document.getElementById('themeToggle');

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

createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    showError('Please enter your name');
    return;
  }
  
  console.log('[v0] Creating room as host...');
  ipcRenderer.send('create-room', { playerName });
});

ipcRenderer.on('room-created', (event, data) => {
  console.log('[v0] Room created successfully');
  localStorage.setItem('playerName', data.playerName);
  localStorage.setItem('serverUrl', 'http://localhost:3000');
  localStorage.setItem('isHost', 'true');
  window.location.href = 'lobby.html';
});

joinRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const url = serverUrlInput.value.trim();
  
  if (!playerName) {
    showError('Please enter your name');
    return;
  }
  
  if (!url) {
    showError('Please enter the server URL');
    return;
  }
  
  console.log('[v0] Joining room as guest...');
  ipcRenderer.send('join-room', { playerName, serverUrl: url });
});

ipcRenderer.on('player-joined', (event, data) => {
  console.log('[v0] Successfully joined room');
  localStorage.setItem('playerName', playerNameInput.value.trim());
  localStorage.setItem('serverUrl', serverUrlInput.value.trim());
  localStorage.setItem('isHost', 'false');
  window.location.href = 'lobby.html';
});

ipcRenderer.on('join-error', (event, data) => {
  showError(data.message);
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 3000);
}
