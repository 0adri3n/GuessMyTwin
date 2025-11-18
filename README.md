# GuessMyTwin 🎮

A multiplayer "Guess Who?" game built with Electron, featuring custom character mods and real-time gameplay over local networks.

## Features

- **Local Multiplayer**: Host a game and let others join via your network URL (using ngrok or similar tunneling)
- **Custom Character Mods**: Create and import your own character sets with custom images
- **Built-in Character Sets**: Two default modes (Classic and Animals) with 16 characters each
- **Profile System**: Set your player name and avatar that persists across sessions
- **Real-time Gameplay**: Eliminate characters and make guesses in real-time
- **Dark/Light Theme**: Toggle between themes with persistent preferences
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/guessmytwin.git
cd guessmytwin
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## How to Play

### Hosting a Game

1. Launch the application
2. (Optional) Configure your profile by clicking the settings icon
3. Click **"Create Room"**
4. Wait for another player to join
5. Select a character mode (Classic, Animals, or a custom imported mod)
6. Click **"Start Game"** when ready

### Joining a Game

1. Launch the application
2. (Optional) Configure your profile
3. Enter the host's URL in the **"Join a Room"** field
   - For local network: `http://[host-ip]:3000`
   - For remote: Use ngrok or similar tunneling service
4. Wait for the host to start the game

### Gameplay

- Click on character images to eliminate them (they become greyed out)
- When you think you know your opponent's character, click **"Make a Guess"**
- Select the character you think is your opponent's
- First player to guess correctly wins!

## Creating Custom Mods

### Using the Mod Creator

1. On the home screen, click **"Create a Mod"**
2. Select multiple images (16 recommended for balanced gameplay)
3. Enter a name for your mod
4. The mod is automatically saved and can be imported in the lobby

### Manual Mod Creation

Create a folder with this structure:

```
my-custom-mod/
├── characters.json
├── character1.jpg
├── character2.jpg
└── ...
```

**characters.json format:**
```json
[
  {
    "id": 1,
    "name": "Character 1",
    "image": "character1.jpg"
  },
  {
    "id": 2,
    "name": "Character 2",
    "image": "character2.jpg"
  }
]
```

### Importing Mods

1. In the lobby, click **"Import Mod"**
2. Select the folder containing your mod
3. The mod appears in the dropdown for future games

## Network Setup

### Local Network

The host's game runs on port 3000. Other players on the same network can join using:
```
http://[host-local-ip]:3000
```

### Remote Play (via ngrok)

1. Install [ngrok](https://ngrok.com/)
2. Start your game (create a room)
3. In a terminal, run:
```bash
ngrok http 3000
```
4. Share the ngrok URL (e.g., `https://abc123.ngrok.io`) with your friend
5. They can enter this URL to join your game

## Project Structure

```
guessmytwin/
├── main.js              # Electron main process & Socket.IO server
├── pages/               # HTML pages
│   ├── home.html       # Main menu
│   ├── lobby.html      # Waiting room
│   └── game.html       # Game interface
├── scripts/            # Client-side JavaScript
│   ├── home.js
│   ├── lobby.js
│   └── game.js
├── styles/             # CSS stylesheets
│   ├── home.css
│   ├── lobby.css
│   └── game.css
└── assets/             # Character images and resources
    ├── classic/
    └── animals/
```

## Technologies Used

- **Electron**: Desktop application framework
- **Socket.IO**: Real-time bidirectional communication
- **Node.js**: Backend runtime
- **HTML/CSS/JavaScript**: Frontend interface

## Development

### Running in Development

```bash
npm start
```

### Building for Production

```bash
npm run build
```

## Troubleshooting

**Issue**: Can't connect to host
- Ensure both players are on the same network (for local play)
- Check firewall settings allow connections on port 3000
- Verify the host has actually created a room

**Issue**: Game doesn't start after clicking "Start Game"
- Make sure exactly 2 players are in the lobby
- Try refreshing both clients and reconnecting

**Issue**: Characters not displaying
- Check that image files exist in the mod folder
- Verify the paths in characters.json are correct
- Ensure image formats are supported (jpg, png, gif)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

Developed with ❤️ using Electron and Socket.IO
