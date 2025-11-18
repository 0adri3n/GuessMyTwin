const { ipcRenderer } = require('electron');

const isHost = localStorage.getItem('isHost') === 'true';
const gameData = JSON.parse(localStorage.getItem('gameData'));
console.log('[v0] Loaded game data:', gameData);
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
console.log('[v0] My socket ID:', mySocketId);

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

console.log(`[v0] Game: Loaded as ${isHost ? 'HOST' : 'GUEST'}`);
console.log(`[v0] Your character:`, yourCharacter.name);


yourCharacterDisplay.textContent = yourCharacter.name;
yourCharacterImage.src = yourCharacter.image;
yourCharacterName.textContent = yourCharacter.name;

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
        console.log('[v0] Guessing character:', character.name);
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
  console.log('[v0] Wrong guess!');
  alert(data.message);
});

ipcRenderer.on('game-over', (event, data) => {
  const isWinner = data.winner === mySocketId;
  var opponent_character = isWinner ? data.guesser_character : data.opponent_character;
  var opponent_name = isWinner ? data.guesser_name : data.opponent_name;

  console.log(`[v0] Game over! ${isWinner ? 'You won!' : 'You lost!'}`);
  
  document.getElementById('gameOverTitle').textContent = 
    isWinner ? '🎉 You Won!' : '😢 You Lost!';
  
  document.getElementById('winnerCharacterImage').src = opponent_character.image;
  document.getElementById('winnerCharacterName').textContent = 
    `${opponent_name} character was: ${opponent_character.name}`;
  
  gameOverModal.classList.add('show');
});

backToHomeBtn.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'home.html';
});
