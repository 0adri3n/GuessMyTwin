const { ipcRenderer } = require('electron');

let socket;
let serverUrl = 'http://localhost:3000';
let isHost = false;

let currentProfile = { name: '', avatar: '' };

const playerNameInput = document.getElementById('playerName');
const serverUrlInput = document.getElementById('serverUrl');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createModBtn = document.getElementById('createModBtn');
const errorMessage = document.getElementById('errorMessage');
const themeToggle = document.getElementById('themeToggle');

const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const profileName = document.getElementById('profileName');
const avatarPreview = document.getElementById('avatarPreview');
const avatarPlaceholder = document.getElementById('avatarPlaceholder');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');

const howToPlayBtn = document.getElementById('howToPlayBtn');
const howToPlayModal = document.getElementById('howToPlayModal');
const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn');
const createModInfoBtn = document.getElementById('createModInfoBtn');
const createModModal = document.getElementById('createModModal');
const closeCreateModBtn = document.getElementById('closeCreateModBtn');


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

window.addEventListener('load', () => {
  console.log('[gmt] Home page loaded, disconnecting any existing sockets...');
  ipcRenderer.send('disconnect-socket');
  // Load saved profile from disk
  ipcRenderer.send('load-profile');
});

profileBtn.addEventListener('click', () => {
  profileName.value = currentProfile.name || '';
  if (currentProfile.avatar) {
    const img = document.createElement('img');
    img.src = currentProfile.avatar;
    avatarPreview.innerHTML = '';
    avatarPreview.appendChild(img);
  } else {
    avatarPreview.innerHTML = '<span id="avatarPlaceholder">👤</span>';
  }
  
  profileModal.classList.add('show');
});

cancelProfileBtn.addEventListener('click', () => {
  profileModal.classList.remove('show');
});

uploadAvatarBtn.addEventListener('click', () => {
  ipcRenderer.send('select-avatar');
});

ipcRenderer.on('avatar-selected', (event, data) => {
  const img = document.createElement('img');
  img.src = data.avatarPath;
  avatarPreview.innerHTML = '';
  avatarPreview.appendChild(img);
  // update current profile avatar immediately
  currentProfile.avatar = data.avatarPath;
});

saveProfileBtn.addEventListener('click', () => {
  const name = profileName.value.trim();
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  // Save profile to disk via main process
  const avatarImg = avatarPreview.querySelector('img');
  const avatarSrc = avatarImg ? avatarImg.src : '';
  currentProfile.name = name;
  currentProfile.avatar = avatarSrc;
  ipcRenderer.send('save-profile', { name: currentProfile.name, avatar: currentProfile.avatar });
  profileModal.classList.remove('show');
});

createModBtn.addEventListener('click', () => {
  console.log('[gmt] Opening mod creator...');
  ipcRenderer.send('create-mod');
});

createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    showError('Please enter your name');
    return;
  }

  const playerAvatar = currentProfile.avatar || null;

  console.log('[gmt] Creating room as host...');
  ipcRenderer.send('create-room', { playerName, playerAvatar });
});

ipcRenderer.on('room-created', (event, data) => {
  console.log('[gmt] Room created successfully');
  localStorage.setItem('playerName', data.playerName);
  localStorage.setItem('playerAvatar', data.playerAvatar || '');
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
  
  console.log('[gmt] Joining room as guest...');
  const playerAvatar = currentProfile.avatar || null;
  ipcRenderer.send('join-room', { playerName, serverUrl: url, playerAvatar });
});

ipcRenderer.on('player-joined', (event, data) => {
  console.log('[gmt] Successfully joined room');
  localStorage.setItem('playerName', playerNameInput.value.trim());
  localStorage.setItem('playerAvatar', currentProfile.avatar || '');
  localStorage.setItem('serverUrl', serverUrlInput.value.trim());
  localStorage.setItem('isHost', 'false');
  window.location.href = 'lobby.html';
});

// handle profile loaded/saved events
ipcRenderer.on('profile-loaded', (event, data) => {
  currentProfile = data || { name: '', avatar: '' };
  if (currentProfile.name) playerNameInput.value = currentProfile.name;
  if (currentProfile.avatar) {
    const img = document.createElement('img');
    img.src = currentProfile.avatar;
    avatarPreview.innerHTML = '';
    avatarPreview.appendChild(img);
  }
});

ipcRenderer.on('profile-saved', (event, data) => {
  currentProfile = data || currentProfile;
  // reflect saved name in input
  if (currentProfile.name) playerNameInput.value = currentProfile.name;
  console.log('[gmt] Profile saved to disk');
});

ipcRenderer.on('profile-load-error', (event, data) => {
  console.error('[gmt] Profile load error:', data.message);
});

ipcRenderer.on('profile-save-error', (event, data) => {
  console.error('[gmt] Profile save error:', data.message);
  alert('Error saving profile: ' + data.message);
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

howToPlayBtn.addEventListener('click', () => {
  howToPlayModal.classList.add('show');
});

closeHowToPlayBtn.addEventListener('click', () => {
  howToPlayModal.classList.remove('show');
});

howToPlayModal.addEventListener('click', (e) => {
  if (e.target === howToPlayModal) {
    howToPlayModal.classList.remove('show');
  }
});

// Create Mod instructions modal handlers
if (createModInfoBtn && createModModal && closeCreateModBtn) {
  createModInfoBtn.addEventListener('click', () => {
    createModModal.classList.add('show');
  });

  closeCreateModBtn.addEventListener('click', () => {
    createModModal.classList.remove('show');
  });

  createModModal.addEventListener('click', (e) => {
    if (e.target === createModModal) {
      createModModal.classList.remove('show');
    }
  });
}