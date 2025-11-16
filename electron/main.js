const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');


let mainWindow;
let server;
let io;
let httpServer;

// Gestion des rooms
const rooms = new Map();
console.log(path.join(__dirname, "preload.js"));
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
    }
  });

  mainWindow.loadFile('pages/home.html');
  
  mainWindow.webContents.openDevTools();
}

// Démarrer le serveur Express + Socket.IO
function startServer() {
  const app = express();
  httpServer = http.createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.static('public'));

  // Socket.IO événements
  io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté:', socket.id);

    // Créer une room
    socket.on('create-room', (data) => {
      const roomId = generateRoomId();
      rooms.set(roomId, {
        id: roomId,
        host: socket.id,
        players: [{ id: socket.id, name: data.playerName, ready: false }],
        mode: null,
        gameState: null
      });
      
      socket.join(roomId);
      socket.emit('room-created', { roomId, playerName: data.playerName });
      console.log(`Room ${roomId} créée par ${data.playerName}`);
    });

    // Rejoindre une room
    socket.on('join-room', (data) => {
      const room = rooms.get(data.roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room non trouvée' });
        return;
      }
      
      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Room complète' });
        return;
      }

      room.players.push({ id: socket.id, name: data.playerName, ready: false });
      socket.join(data.roomId);
      
      // Notifier tous les joueurs de la room
      io.to(data.roomId).emit('player-joined', { 
        players: room.players,
        roomId: data.roomId
      });
      
      console.log(`${data.playerName} a rejoint la room ${data.roomId}`);
    });

    // Lancer la partie
    socket.on('start-game', (data) => {
      const room = rooms.get(data.roomId);
      
      if (!room || room.host !== socket.id) {
        return;
      }

      room.mode = data.mode;
      
      // Sélectionner des personnages aléatoires pour chaque joueur
      const characters = getCharactersByMode(data.mode);
      const player1Character = characters[Math.floor(Math.random() * characters.length)];
      const player2Character = characters[Math.floor(Math.random() * characters.length)];
      
      room.gameState = {
        characters: characters,
        player1: { id: room.players[0].id, character: player1Character },
        player2: { id: room.players[1].id, character: player2Character }
      };

      // Envoyer les données de jeu à chaque joueur
      io.to(room.players[0].id).emit('game-started', {
        characters: characters,
        yourCharacter: player1Character,
        opponentId: room.players[1].id
      });

      io.to(room.players[1].id).emit('game-started', {
        characters: characters,
        yourCharacter: player2Character,
        opponentId: room.players[0].id
      });

      console.log(`Partie lancée dans la room ${data.roomId} avec le mode ${data.mode}`);
    });

    // Deviner le personnage
    socket.on('guess-character', (data) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      const guesser = room.gameState.player1.id === socket.id ? room.gameState.player1 : room.gameState.player2;
      const opponent = room.gameState.player1.id === socket.id ? room.gameState.player2 : room.gameState.player1;

      const isCorrect = data.characterId === opponent.character.id;

      if (isCorrect) {
        io.to(data.roomId).emit('game-over', {
          winner: socket.id,
          character: opponent.character
        });
      } else {
        socket.emit('guess-wrong', { message: 'Ce n\'est pas le bon personnage!' });
      }
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log('Un joueur s\'est déconnecté:', socket.id);
      
      // Retirer le joueur de toutes les rooms
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('player-left', { players: room.players });
          }
        }
      });
    });
  });

    httpServer.listen(0, () => {
        const port = httpServer.address().port;
        console.log("Serveur interne sur :", port);

        // ENVOI DU PORT AU RENDERER via IPC
        if (mainWindow) {
            mainWindow.webContents.send("server-port", port);
        }
    });

}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getCharactersByMode(mode) {
  // Sets de personnages prédéfinis
  const modes = {
    classic: [
      { id: 1, name: 'Alice', image: '/woman-brown-hair.png' },
      { id: 2, name: 'Bob', image: '/thoughtful-man-glasses.png' },
      { id: 3, name: 'Charlie', image: '/bearded-man-portrait.png' },
      { id: 4, name: 'Diana', image: '/blonde-woman-portrait.png' },
      { id: 5, name: 'Eve', image: '/red-haired-woman.png' },
      { id: 6, name: 'Frank', image: '/bald-man.png' },
      { id: 7, name: 'Grace', image: '/curly-haired-woman.png' },
      { id: 8, name: 'Henry', image: '/man-with-mustache.jpg' },
      { id: 9, name: 'Iris', image: '/woman-black-hair.png' },
      { id: 10, name: 'Jack', image: '/young-man-contemplative.png' },
      { id: 11, name: 'Kate', image: '/short-haired-woman.png' },
      { id: 12, name: 'Leo', image: '/man-with-fedora.png' },
      { id: 13, name: 'Mia', image: '/woman-with-freckles.jpg' },
      { id: 14, name: 'Noah', image: '/long-haired-man.png' },
      { id: 15, name: 'Olivia', image: '/woman-with-pigtails.jpg' },
      { id: 16, name: 'Paul', image: '/elderly-man-contemplative.png' }
    ],
    animals: [
      { id: 17, name: 'Lion', image: '/cartoon-lion.png' },
      { id: 18, name: 'Tiger', image: '/cartoon-tiger.jpg' },
      { id: 19, name: 'Bear', image: '/cartoon-bear.png' },
      { id: 20, name: 'Elephant', image: '/cartoon-elephant.png' },
      { id: 21, name: 'Giraffe', image: '/cartoon-giraffe.png' },
      { id: 22, name: 'Zebra', image: '/cartoon-zebra.png' },
      { id: 23, name: 'Monkey', image: '/cartoon-monkey.png' },
      { id: 24, name: 'Panda', image: '/cartoon-panda.jpg' },
      { id: 25, name: 'Koala', image: '/cartoon-koala.jpg' },
      { id: 26, name: 'Penguin', image: '/cartoon-penguin.png' },
      { id: 27, name: 'Dolphin', image: '/cartoon-dolphin.png' },
      { id: 28, name: 'Owl', image: '/cartoon-owl.png' },
      { id: 29, name: 'Fox', image: '/cartoon-fox.png' },
      { id: 30, name: 'Rabbit', image: '/cartoon-rabbit.png' },
      { id: 31, name: 'Deer', image: '/cartoon-deer.jpg' },
      { id: 32, name: 'Squirrel', image: '/cartoon-squirrel.jpg' }
    ]
  };

  return modes[mode] || modes.classic;
}

app.whenReady().then(() => {
  createWindow();
  startServer();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (httpServer) {
    httpServer.close();
  }
  if (process.platform !== 'darwin') app.quit();
});
