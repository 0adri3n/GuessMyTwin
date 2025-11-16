const { contextBridge, ipcRenderer } = require("electron");

let portResolve;
const portPromise = new Promise(res => portResolve = res);

ipcRenderer.on("server-port", (event, port) => {
  console.log("PRELOAD : Port reçu :", port);
  portResolve(port);
});

contextBridge.exposeInMainWorld("serverInfo", {
  getPort: () => portPromise
});
