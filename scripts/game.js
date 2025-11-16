
var port = null;
(async () => {
  port = await window.serverInfo.getPort();
  console.log("Port dispo :", port);
})();

const socket = io(`http://localhost:${port}`);
const roomId = localStorage.getItem('roomId');
const gameData = JSON.parse(localStorage.getItem('gameData'));

const yourCharacter = gameData.yourCharacter;
const characters = gameData.characters;

const roomIdDisplay = document.getElementById('roomId');
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

let eliminatedCharacters = new Set();

// Afficher les informations
roomIdDisplay.textContent = roomId;
yourCharacterDisplay.textContent = yourCharacter.name;
yourCharacterImage.src = yourCharacter.image;
yourCharacterName.textContent = yourCharacter.name;

// Afficher tous les personnages
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

// Bouton deviner
guessBtn.addEventListener('click', () => {
  guessModal.classList.add('show');
  
  // Afficher uniquement les personnages non éliminés
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
        socket.emit('guess-character', { roomId, characterId: character.id });
        guessModal.classList.remove('show');
      });
      
      guessGrid.appendChild(card);
    }
  });
});

cancelGuessBtn.addEventListener('click', () => {
  guessModal.classList.remove('show');
});

// Mauvaise réponse
socket.on('guess-wrong', (data) => {
  alert(data.message);
});

// Fin de partie
socket.on('game-over', (data) => {
  const isWinner = data.winner === socket.id;
  
  document.getElementById('gameOverTitle').textContent = 
    isWinner ? '🎉 Vous avez gagné !' : '😢 Vous avez perdu !';
  
  document.getElementById('winnerCharacterImage').src = data.character.image;
  document.getElementById('winnerCharacterName').textContent = 
    `Le personnage était : ${data.character.name}`;
  
  gameOverModal.classList.add('show');
});

backToHomeBtn.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'home.html';
});
