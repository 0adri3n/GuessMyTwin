const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { pl } = require('date-fns/locale/pl');
const DiscordRPC = require("discord-rpc");


let mainWindow;
let httpServer;
let io;
let clientSocket; // Socket for guest mode

let gameRoom = {
  host: null,
  players: [],
  mode: null,
  gameState: null
};

const PROFILE_FILE = path.join(app.getPath('userData') || __dirname, 'profile.json');

const SAVED_MODS_FILE = path.join(app.getPath('userData'), 'saved-mods.json');

function loadSavedMods() {
  try {
    if (fs.existsSync(SAVED_MODS_FILE)) {
      const data = fs.readFileSync(SAVED_MODS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[gmt] Error loading saved mods:', error);
  }
  return [];
}

function saveMods(mods) {
  try {
    fs.writeFileSync(SAVED_MODS_FILE, JSON.stringify(mods, null, 2), 'utf8');
    console.log('[gmt] Mods saved successfully');
  } catch (error) {
    console.error('[gmt] Error saving mods:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 950,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../pages/img/logo.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile('pages/home.html');
  
  // mainWindow.webContents.openDevTools();

}


ipcMain.on('get-saved-mods', (event) => {
  const savedMods = loadSavedMods();
  event.reply('saved-mods-loaded', { mods: savedMods });
});


ipcMain.on('create-room', (event, data) => {
  console.log('[gmt] IPC: Create room request from', data.playerName);
  
  if (httpServer) {
    // ensure avatar is sent as data URI
    const avatarData = imageToDataUri(data.playerAvatar);
    event.reply('room-created', { playerName: data.playerName, playerAvatar: avatarData });
    return;
  }

  // Convert avatar to data URI for internal usage and network transfer
  const avatarData = imageToDataUri(data.playerAvatar);
  console.log('[gmt] create-room: avatar received length=', (data.playerAvatar || '').length, '-> dataURI length=', (avatarData || '').length);

  startServerAsHost(data.playerName, avatarData);
  connectAsGuest('http://localhost:3000', data.playerName, avatarData, event);

  event.reply('room-created', { playerName: data.playerName, playerAvatar: avatarData });
});

ipcMain.on('join-room', (event, data) => {
  console.log('[gmt] IPC: Join room request from', data.playerName, 'to', data.serverUrl);
  
  connectAsGuest(data.serverUrl, data.playerName, data.playerAvatar, event);
});

ipcMain.on('disconnect-socket', (event) => {
  console.log('[gmt] IPC: Disconnect socket request');
  
  if (io) {
    console.log('[gmt] Closing server...');
    io.close();
    io = null;
  }
  
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  
  if (clientSocket) {
    console.log('[gmt] Disconnecting client socket...');
    clientSocket.disconnect();
    clientSocket = null;
  }
  
  gameRoom = {
    host: null,
    players: [],
    mode: null,
    gameState: null
  };
  
  event.reply('socket-disconnected');
});

ipcMain.on('start-game', (event, data) => {
  console.log('[gmt] IPC: Start game request with mode', data.mode);
  
  if (!io) return;
  
  gameRoom.mode = data.mode;
  
  const characters = data.customCharacters || getCharactersByMode(data.mode);
  const player1Character = characters[Math.floor(Math.random() * characters.length)];
  const player2Character = characters[Math.floor(Math.random() * characters.length)];
  
  gameRoom.gameState = {
    characters: characters,
    player1: { id: gameRoom.players[0].id, name: gameRoom.players[0].name, character: player1Character },
    player2: { id: gameRoom.players[1].id, name: gameRoom.players[1].name, character: player2Character }
  };

  // Prepare characters and avatars as data URIs for network transfer
  const charactersData = characters.map(c => ({
    id: c.id,
    name: c.name,
    image: imageToDataUri(c.image)
  }));

  const player1CharData = {
    ...player1Character,
    image: imageToDataUri(player1Character.image)
  };

  const player2CharData = {
    ...player2Character,
    image: imageToDataUri(player2Character.image)
  };

  io.to(gameRoom.players[0].id).emit('game-started', {
    characters: charactersData,
    yourCharacter: player1CharData,
    yourId: gameRoom.players[0].id,
    opponentId: gameRoom.players[1].id,
    opponent: { name: gameRoom.players[1].name, avatar: imageToDataUri(gameRoom.players[1].avatar) }
  });

  console.log(imageToDataUri(gameRoom.players[0].avatar));

  io.to(gameRoom.players[1].id).emit('game-started', {
    characters: charactersData,
    yourCharacter: player2CharData,
    yourId: gameRoom.players[1].id,
    opponentId: gameRoom.players[0].id,
    opponent: { name: gameRoom.players[0].name, avatar: imageToDataUri(gameRoom.players[0].avatar) }
  });

  console.log('[gmt] Current game state:', gameRoom);

  console.log('[gmt] Game started with mode', data.mode);
});

ipcMain.on('guess-character', (event, data) => {
  console.log('[gmt] IPC: Guess character request', data.characterId);
  
  if (io) {
    // HOST mode
    handleGuess(data.characterId, data.socketId);
  } else if (clientSocket) {
    // GUEST mode
    clientSocket.emit('guess-character', { characterId: data.characterId });
  }
});

ipcMain.on('get-room-info', (event) => {
  console.log('[gmt] IPC: Get room info request');
  if (io) {
    // HOST mode
    event.reply('room-info', {
      host: gameRoom.host,
      players: gameRoom.players,
      mode: gameRoom.mode,
      gameState: gameRoom.gameState
    });
  } else if (clientSocket) {
    // GUEST mode
    clientSocket.emit('room-info', event);
  }
});

ipcMain.on('create-mod', async (event) => {
  console.log('[gmt] IPC: Create mod request');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    console.log('[gmt] Mod creation canceled');
    return;
  }
  
  const modNameResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Mod As',
    defaultPath: 'my-mod',
    properties: ['createDirectory']
  });
  
  if (modNameResult.canceled) {
    console.log('[gmt] Mod creation canceled');
    return;
  }
  
  try {
    const modDir = modNameResult.filePath;
    const modName = path.basename(modDir);
    
    if (!fs.existsSync(modDir)) {
      fs.mkdirSync(modDir, { recursive: true });
    }
    
    const characters = [];

    for (let i = 0; i < result.filePaths.length; i++) {
      const imagePath = result.filePaths[i];
      const originalBase = path.basename(imagePath); // keep original filename
      const parsed = path.parse(originalBase);
      const ext = parsed.ext;
      let candidateName = originalBase;
      let destPath = path.join(modDir, candidateName);

      // Resolve name collisions by appending a numeric suffix
      let counter = 1;
      while (fs.existsSync(destPath)) {
        candidateName = `${parsed.name}_${counter}${ext}`;
        destPath = path.join(modDir, candidateName);
        counter++;
      }

      fs.copyFileSync(imagePath, destPath);

      // Character name: filename without extension, capitalize first letter
      const rawName = path.parse(candidateName).name;
      const charName = rawName.length > 0 ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : `Character ${i + 1}`;

      characters.push({
        id: 100 + i + 1,
        name: charName,
        image: candidateName
      });
    }
    
    const modData = {
      name: modName,
      version: '1.0.0',
      characters: characters
    };
    
    fs.writeFileSync(
      path.join(modDir, 'mod.json'),
      JSON.stringify(modData, null, 2),
      'utf8'
    );
    
    console.log('[gmt] Mod created successfully:', modName);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Success',
      message: `Mod "${modName}" created successfully with ${characters.length} characters!`
    });
  } catch (error) {
    console.error('[gmt] Error creating mod:', error);
    dialog.showErrorBox('Error', 'Failed to create mod: ' + error.message);
  }
});

ipcMain.on('import-mod', async (event) => {
  console.log('[gmt] IPC: Import mod request');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    console.log('[gmt] Mod import canceled');
    return;
  }
  
  try {
    const modDir = result.filePaths[0];
    const modJsonPath = path.join(modDir, 'mod.json');
    
    if (!fs.existsSync(modJsonPath)) {
      event.reply('mod-import-error', { message: 'No mod.json found in the selected folder' });
      return;
    }
    
    const modData = JSON.parse(fs.readFileSync(modJsonPath, 'utf8'));
    
    if (!modData.characters || !Array.isArray(modData.characters)) {
      event.reply('mod-import-error', { message: 'Invalid mod.json format' });
      return;
    }
    
    const characters = modData.characters.map(char => ({
      id: char.id,
      name: char.name,
      image: path.join(modDir, char.image)
    }));
    
    const savedMods = loadSavedMods();
    const modEntry = {
      name: modData.name || path.basename(modDir),
      path: modDir,
      characters: characters
    };
    
    // Check if mod already exists, update if it does
    const existingIndex = savedMods.findIndex(m => m.path === modDir);
    if (existingIndex !== -1) {
      savedMods[existingIndex] = modEntry;
    } else {
      savedMods.push(modEntry);
    }
    
    saveMods(savedMods);

    // Convert character images to data URIs for renderer/network use
    const charactersWithData = characters.map(c => ({
      id: c.id,
      name: c.name,
      image: imageToDataUri(c.image, modDir)
    }));

    event.reply('mod-imported', {
      modName: modData.name || path.basename(modDir),
      characters: charactersWithData
    });
    
    console.log('[gmt] Mod imported successfully:', modData.name);
  } catch (error) {
    console.error('[gmt] Error importing mod:', error);
    event.reply('mod-import-error', { message: 'Failed to import mod: ' + error.message });
  }
});

ipcMain.on('select-avatar', async (event) => {
  console.log('[gmt] IPC: Select avatar request');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    console.log('[gmt] Avatar selection canceled');
    return;
  }
  
  const avatarPath = result.filePaths[0];
  // Return both the path and a data URI representation so renderers can display/send it directly
  const avatarData = imageToDataUri(avatarPath);
  console.log('[gmt] select-avatar: selected path=', avatarPath, 'dataURI length=', (avatarData || '').length);
  event.reply('avatar-selected', { avatarPath, avatar: avatarData });
});

// Save profile to a JSON file in userData
ipcMain.on('save-profile', (event, data) => {
  try {
    // Ensure avatar is stored as a data URI to avoid filesystem path issues when sharing
    const avatarData = data.avatar ? imageToDataUri(data.avatar) : '';
    const profile = {
      name: data.name || '',
      avatar: avatarData
    };
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf8');
    console.log('[gmt] Profile saved to', PROFILE_FILE, 'avatar length=', (avatarData || '').length);
    event.reply('profile-saved', profile);
  } catch (err) {
    console.error('[gmt] Error saving profile:', err);
    event.reply('profile-save-error', { message: err.message });
  }
});

// Load profile from JSON file
ipcMain.on('load-profile', (event) => {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const raw = fs.readFileSync(PROFILE_FILE, 'utf8');
      const profile = JSON.parse(raw);
      // Convert avatar path to data URI when possible
      const avatarData = profile.avatar ? imageToDataUri(profile.avatar) : '';
      event.reply('profile-loaded', { name: profile.name || '', avatar: avatarData });
      console.log('[gmt] Profile loaded from', PROFILE_FILE);
    } else {
      event.reply('profile-loaded', { name: '', avatar: '' });
    }
  } catch (err) {
    console.error('[gmt] Error loading profile:', err);
    event.reply('profile-load-error', { message: err.message });
  }
});

// Expose helper to convert an image path to a data URI for renderers
ipcMain.handle('to-data-uri', async (event, imagePath) => {
  try {
    const dataUri = imageToDataUri(imagePath);
    console.log('[gmt] to-data-uri: input length=', (imagePath || '').length, '-> dataURI length=', (dataUri || '').length);
    return dataUri;
  } catch (err) {
    console.error('[gmt] to-data-uri error:', err);
    return '';
  }
});

function startServerAsHost(playerName, playerAvatar) {
  const expressApp = express();
  httpServer = http.createServer(expressApp);
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });


  expressApp.use(express.static('public'));

  io.on('connection', (socket) => {
    console.log('[gmt] HOST: Player connected:', socket.id);

    // First connection is always the host
    if (gameRoom.players.length === 0) {
      gameRoom.host = socket.id;
      // Ensure host avatar is a data URI
      const hostAvatar = imageToDataUri(playerAvatar);
      console.log('[gmt] HOST: adding host player with avatar length=', (hostAvatar || '').length);
      gameRoom.players = [{ id: socket.id, name: playerName, avatar: hostAvatar, ready: false }];
      console.log('[gmt] HOST: Host player added to room');
      
      // Notify renderer process
      mainWindow.webContents.send('player-joined', { players: gameRoom.players });
    } else if (gameRoom.players.length === 1) {
      // Second connection is the guest
      socket.on('join-room', (data) => {
        if (gameRoom.players.length >= 2) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Convert guest avatar to data URI if possible
        const guestAvatar = imageToDataUri(data.playerAvatar);
        console.log('[gmt] HOST: guest join received avatar length=', (data.playerAvatar || '').length, '-> dataURI length=', (guestAvatar || '').length);
        gameRoom.players.push({ id: socket.id, name: data.playerName, avatar: guestAvatar, ready: false });
        
        io.emit('player-joined-event', { players: gameRoom.players });
        
        // Notify renderer process
        mainWindow.webContents.send('player-joined', { players: gameRoom.players });
        
        console.log('[gmt] HOST: Guest joined the room');
      });
    }

    socket.on('room-info', (event) => {
      socket.emit('room-info', {
        host: gameRoom.host,
        players: gameRoom.players,
        mode: gameRoom.mode,
        gameState: gameRoom.gameState
      });
    });

    socket.on('guess-character', (data) => {
      handleGuess(data.characterId, socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[gmt] HOST: Player disconnected:', socket.id);
      
      const playerIndex = gameRoom.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        gameRoom.players.splice(playerIndex, 1);
        
        if (gameRoom.players.length === 0) {
          gameRoom = {
            host: null,
            players: [],
            mode: null,
            gameState: null
          };
        } else {
          io.emit('player-left-event', { players: gameRoom.players });
          mainWindow.webContents.send('player-left', { players: gameRoom.players });
        }
      }
    });
  });

  const PORT = 3000;
  httpServer.listen(PORT, () => {
    console.log('[gmt] HOST: Server started on port', PORT);
  });


}

function connectAsGuest(serverUrl, playerName, playerAvatar, event) {
  const io = require('socket.io-client');
  clientSocket = io(serverUrl);
  
  clientSocket.on('connect', () => {
    console.log('[gmt] GUEST: Connected to server');
    // If avatar is a local file path, convert to data URI before sending
    let avatarToSend = playerAvatar;
    try {
      if (avatarToSend && typeof avatarToSend === 'string' && !avatarToSend.startsWith('data:') && fs.existsSync(avatarToSend)) {
        avatarToSend = imageToDataUri(avatarToSend);
      }
    } catch (err) {
      console.warn('[gmt] Could not convert avatar to data URI:', err);
    }

    console.log('[gmt] GUEST: emitting join-room with avatar length=', (avatarToSend || '').length);
    clientSocket.emit('join-room', { playerName, playerAvatar: avatarToSend });
  });
  
  clientSocket.on('connect_error', (error) => {
    console.log('[gmt] GUEST: Connection error', error);
    event.reply('join-error', { message: 'Cannot connect to server' });
  });

  // Notify renderer if the socket disconnects (server/host closed)
  clientSocket.on('disconnect', (reason) => {
    console.log('[gmt] GUEST: Disconnected from server, reason:', reason);
    try {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('socket-disconnected', { reason });
      }
    } catch (err) {
      console.error('[gmt] Error sending socket-disconnected to renderer:', err);
    }
  });

  clientSocket.on('room-info', (data) => {
    console.log('[gmt] GUEST: Room info received');
    console.log('[gmt] Current game room state:', data);
    mainWindow.webContents.send('room-info', {
      host: data.host,
      players: data.players,
      mode: data.mode,
      gameState: data.gameState
    });
  });
  
  clientSocket.on('player-joined-event', (data) => {
    console.log('[gmt] GUEST: Player joined event received');
    event.reply('player-joined', { players: data.players });
    mainWindow.webContents.send('player-joined', { players: data.players });
  });
  
  clientSocket.on('player-left-event', (data) => {
    console.log('[gmt] GUEST: Player left event received');
    mainWindow.webContents.send('player-left', { players: data.players });
  });
  
  clientSocket.on('game-started', (data) => {
    console.log('[gmt] GUEST: Game started event received');
    mainWindow.webContents.send('game-started', data);
  });
  
  clientSocket.on('guess-wrong', (data) => {
    console.log('[gmt] GUEST: Wrong guess');
    mainWindow.webContents.send('guess-wrong', data);
  });
  
  clientSocket.on('game-over', (data) => {
    console.log('[gmt] GUEST: Game over');
    mainWindow.webContents.send('game-over', data);
  });
  
  clientSocket.on('error', (data) => {
    console.log('[gmt] GUEST: Error', data.message);
    event.reply('join-error', data);
  });
}

function handleGuess(characterId, socketId) {
  if (!gameRoom.gameState) return;

  var opponent;
  var guesser_character

  if (gameRoom.gameState.player1.id === socketId) {
    opponent = gameRoom.gameState.player2;
    guesser_character = gameRoom.gameState.player1.character;
  }
  else {
    opponent = gameRoom.gameState.player1;
    guesser_character = gameRoom.gameState.player2.character;
  }
  
  const guesser = gameRoom.gameState.player1.id === socketId ? gameRoom.gameState.player1 : gameRoom.gameState.player2;

  console.log(guesser)
  console.log(opponent)

  console.log(`[gmt] HOST: Player ${socketId} guessed character ID ${characterId}`);
  console.log(`[gmt] HOST: Opponent's character ID is ${opponent.character.name} (ID: ${opponent.character.id})`);

  const isCorrect = characterId === opponent.character.id;

  // Always send character images as data URIs
  function withImageData(character) {
    return {
      ...character,
      image: imageToDataUri(character.image)
    };
  }

  if (isCorrect) {
    const gameOverData = {
      winner: socketId,
      guesser_character: withImageData(guesser_character),
      guesser_name: guesser.name,
      opponent_character: withImageData(opponent.character),
      opponent_name: opponent.name
    };
    if (io) {
      io.emit('game-over', gameOverData);
    }
    mainWindow.webContents.send('game-over', gameOverData);
  } else {
    const gameOverData = {
      winner: opponent.id,
      guesser_character: withImageData(guesser_character),
      guesser_name: guesser.name,
      opponent_character: withImageData(opponent.character),
      opponent_name: opponent.name
    };
    if (io) {
      io.emit('game-over', gameOverData);
    }
    mainWindow.webContents.send('game-over', gameOverData);
  }
}


function imgToBase64(imagePath) {
  try {
    if (!imagePath) return '';
    // If already a data URI, return as-is
    if (typeof imagePath === 'string' && imagePath.startsWith('data:')) return imagePath;

    // Resolve absolute path
    let absPath = imagePath;
    if (!path.isAbsolute(absPath)) {
      absPath = path.resolve(__dirname, imagePath);
    }

    if (!fs.existsSync(absPath)) return '';

    const file = fs.readFileSync(absPath);
    const ext = path.extname(absPath).substring(1) || 'png';
    return `data:image/${ext};base64,${file.toString('base64')}`;
  } catch (err) {
    console.error('[gmt] imgToBase64 error:', err);
    return '';
  }
}

// Convert various image references (absolute path, relative path, or data URI)
function imageToDataUri(imageRef, baseDir) {
  try {
    if (!imageRef) return '';
    if (typeof imageRef === 'string' && imageRef.startsWith('data:')) return imageRef;

    let resolved = imageRef;

    if (path.isAbsolute(imageRef)) {
      resolved = imageRef;
    } else if (baseDir && typeof imageRef === 'string') {
      resolved = path.join(baseDir, imageRef);
    } else if (typeof imageRef === 'string') {
      // Try resolving relative to project root (parent of electron)
      resolved = path.resolve(__dirname, imageRef);
    }

    if (!fs.existsSync(resolved)) {
      return '';
    }

    const buf = fs.readFileSync(resolved);
    const ext = path.extname(resolved).substring(1) || 'png';
    return `data:image/${ext};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[gmt] imageToDataUri error:', err);
    return '';
  }
}


function getCharactersByMode(mode) {
  const modes = {
    classic: [
      { id: 1, name: 'Alice', image: '../public/woman-brown-hair.png' },
      { id: 2, name: 'Bob', image: '../public/thoughtful-man-glasses.png' },
      { id: 3, name: 'Charlie', image: '../public/bearded-man-portrait.png' },
      { id: 4, name: 'Diana', image: '../public/blonde-woman-portrait.png' },
      { id: 5, name: 'Eve', image: '../public/red-haired-woman.png' },
      { id: 6, name: 'Frank', image: '../public/bald-man.png' },
      { id: 7, name: 'Grace', image: '../public/curly-haired-woman.png' },
      { id: 8, name: 'Henry', image: '../public/man-with-mustache.jpg' },
      { id: 9, name: 'Iris', image: '../public/woman-black-hair.png' },
      { id: 10, name: 'Jack', image: '../public/young-man-contemplative.png' },
      { id: 11, name: 'Kate', image: '../public/short-haired-woman.png' },
      { id: 12, name: 'Leo', image: '../public/man-with-fedora.png' },
      { id: 13, name: 'Mia', image: '../public/woman-with-freckles.jpg' },
      { id: 14, name: 'Noah', image: '../public/long-haired-man.png' },
      { id: 15, name: 'Olivia', image: '../public/woman-with-pigtails.jpg' },
      { id: 16, name: 'Paul', image: '../public/elderly-man-contemplative.png' }
    ],
    animals: [
      { id: 17, name: 'Lion', image: '../public/cartoon-lion.png' },
      { id: 18, name: 'Tiger', image: '../public/cartoon-tiger.jpg' },
      { id: 19, name: 'Bear', image: '../public/cartoon-bear.png' },
      { id: 20, name: 'Elephant', image: '../public/cartoon-elephant.png' },
      { id: 21, name: 'Giraffe', image: '../public/cartoon-giraffe.png' },
      { id: 22, name: 'Zebra', image: '../public/cartoon-zebra.png' },
      { id: 23, name: 'Monkey', image: '../public/cartoon-monkey.png' },
      { id: 24, name: 'Panda', image: '../public/cartoon-panda.jpg' },
      { id: 25, name: 'Koala', image: '../public/cartoon-koala.jpg' },
      { id: 26, name: 'Penguin', image: '../public/cartoon-penguin.png' },
      { id: 27, name: 'Dolphin', image: '../public/cartoon-dolphin.png' },
      { id: 28, name: 'Owl', image: '../public/cartoon-owl.png' },
      { id: 29, name: 'Fox', image: '../public/cartoon-fox.png' },
      { id: 30, name: 'Rabbit', image: '../public/cartoon-rabbit.png' },
      { id: 31, name: 'Deer', image: '../public/cartoon-deer.jpg' },
      { id: 32, name: 'Squirrel', image: '../public/cartoon-squirrel.jpg' }
    ]
  };

  return modes[mode] || modes.classic;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (httpServer) {
    httpServer.close();
  }
  if (clientSocket) {
    clientSocket.disconnect();
  }
  if (process.platform !== 'darwin') app.quit();
});

const clientId = "1440384818948079706";
DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: "ipc" });

const startTimestamp = new Date();

rpc.on("ready", () => {
  rpc.setActivity({
    details: "Guessing with twin...",
    largeImageKey: "logo_v1",
    largeImageText: "Guess My Twin",
    instance: false,
    startTimestamp,
  });  
});

rpc.login({ clientId }).catch(console.error);