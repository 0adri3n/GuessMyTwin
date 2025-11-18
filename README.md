<p align="center">
  <img src="https://github.com/user-attachments/assets/08f4c8c5-f46e-46b6-93f3-97382ded85a3" alt="GuessMyTwin Logo" width="200"/>
</p>

<h1 align="center">GuessMyTwin</h1>

<p align="center">
  A modern, moddable multiplayer “Guess Who?” game built with Electron and Socket.IO.
</p>

---

## 📌 Features

- 🎭 **Local Multiplayer** – Host games on your LAN or expose them online via pinggy/ngrok  
- 🧩 **Custom Character Mods** – Create or import your own character packs  
- 🧑‍🚀 **Player Profiles** – Personalize your name and avatar  
- ⚡ **Real-Time Gameplay** – Fully synchronized guessing & eliminations  
- 🌗 **Light & Dark Themes** – Saved automatically between sessions  

---

## 📥 Installation

### ✔️ Option 1 — Install with Windows Installer (Recommended)

1. Go to the **[Latest Release](https://github.com/0adri3n/GuessMyTwin/releases/latest)**  
2. Download the file:
```

GuessMyTwin-Setup.exe

````
3. Run the installer — the game will appear in your Start Menu 🎉

---

### ✔️ Option 2 — Run from Source

#### Prerequisites
- Node.js v14+  
- npm or yarn  

#### Setup

```bash
git clone https://github.com/0adri3n/GuessMyTwin.git
cd guessmytwin
npm install
npm run dev
````

---

## 🎮 How to Play

### 🏠 Hosting a Game

1. Launch the application
2. Configure your profile (optional)
3. Click **Create Room**
4. Share the displayed URL with your opponent
5. Once they join, choose a game mode
6. Press **Start Game**

### 🌍 Joining a Game

1. Launch the app
2. Configure your profile (optional)
3. Enter the host’s URL in the **Join a Room** field

   * Local play → `http://[host-ip]:3000`
   * Online play → ngrok or other tunnels
4. Wait for the host to start the game

### 🕹️ Gameplay Rules

* Click characters to eliminate them
* When ready, click **Make a Guess**
* Choose the character you think is your opponent’s
* First correct guess wins! 🎉

---

## 🖼️ Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/0f7726c8-e110-4471-a681-a4af217c0c46" width="800"/>
  <br/><br/>
  <img src="https://github.com/user-attachments/assets/83f5ca16-8e9a-405a-aa22-24ff276e41ab" width="800"/>
  <br/><br/>
  <img src="https://github.com/user-attachments/assets/216463c4-d7ff-4851-9ceb-69ac93283ff6" width="800"/>
</p>

---

## 🧩 Creating Custom Mods

### ✔️ Using the Built-In Mod Creator

1. From the Home page, click **Create a Mod**
2. Select your character images (16 recommended)
3. Name your mod
4. It will automatically appear in the mod list

---

### ✔️ Manual Mod Creation

File structure:

```
my-custom-mod/
├── characters.json
├── character1.jpg
├── character2.png
└── ...
```

`characters.json` format:

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
    "image": "character2.png"
  }
]
```

### ✔️ Importing Mods

1. Open the lobby
2. Click **Import Mod**
3. Select your mod folder
4. Your custom pack appears in the dropdown

---

## 🌐 Network Setup

### 🛜 Local Network Play

Host machine shares:

```
http://[local-ip]:3000
```

### 🌍 Online Play with Pinggy

1. Run:

```bash
ssh -p 443 -R0:127.0.0.1:3000 qr@free.pinggy.io
```

2. Share the HTTP/HTTPS URL provided by pinggy

---

## 📁 Project Structure

```
guessmytwin/           
│         
├── pages/
│   ├── home.html
│   ├── lobby.html
│   └── game.html
├── scripts/
│   ├── home.js
│   ├── lobby.js
│   └── game.js
├── styles/
│   ├── home.css
│   ├── lobby.css
│   └── game.css
└── electron/
    ├── main.js     # Electron main process & Socket.IO server
    └── preload.js  # Secure IPC bridge (useless)
```

---

## 🛠 Development

```bash
npm install
```

### Run in Dev Mode

```bash
npm run dev
```

### Build Production Packages

```bash
npm run build
```

---

## ❗ Troubleshooting

### 🔌 Can't connect to host

* Ensure both devices are on the same network
* Disable firewalls blocking port 3000
* Confirm the host created a room

### 🎬 Game won’t start

* Exactly **2 players** must be in the lobby
* Try restarting both clients

### 🖼️ Characters not showing

* Check image paths in `characters.json`
* Ensure supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`
* Mod folder must be structured correctly

---

## 🤝 Contributing

Pull requests are welcome!
Feel free to open issues, improve features, or add new mod tools.

---

## 📄 License

MIT License – free for personal and commercial use.

---

## ❤️ Credits

Developed with love using **Electron**, **Socket.IO**, and **vanilla JavaScript**.

```
