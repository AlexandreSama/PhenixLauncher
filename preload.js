const { contextBridge, ipcRenderer } = require('electron')

// contextBridge.exposeInMainWorld permet d'exposer de manière sécurisée des 
// fonctions du processus principal (backend) a la page web (frontend) dans Electron.
// J'ai séparé les fonctions en plusieurs parties pour mieux se repérer
contextBridge.exposeInMainWorld('app', {
    nomApp: () => ipcRenderer.invoke('getAppName'),
    versionApp: () => ipcRenderer.invoke('getAppVersion'),
    closeApp: () => ipcRenderer.invoke('closeApp'),
    reduceApp: () => ipcRenderer.invoke('reduceApp'),
    openGameFolder: () => ipcRenderer.invoke('openGameFolder'),
})

contextBridge.exposeInMainWorld('mc', {
    loginMS: () => ipcRenderer.invoke('loginMS'),
    onLoginDone: (profile) => ipcRenderer.on('loginDone', (profile)),
    saveRam: (ramValue) => ipcRenderer.invoke('saveRam', ramValue),
    getRam: () => ipcRenderer.invoke('getRam'),
    launchGame : () => ipcRenderer.invoke('launchGame'),
    onJavaEvent: (callback) => {
        ipcRenderer.removeAllListeners('javaEvents');
        ipcRenderer.on('javaEvents', (event, status, message) => {
            callback(status, message);
        });
    },
    onForgeEvent: (callback) => {
        ipcRenderer.removeAllListeners('forgeEvents');
        ipcRenderer.on('forgeEvents', (event, status, message) => {
            callback(status, message);
        });
    },
    onModEvent: (callback) => {
        ipcRenderer.removeAllListeners('modEvents');
        ipcRenderer.on('modEvents', (event, status, message) => {
            callback(status, message);
        });
    },
    onDataDownload: (data) => ipcRenderer.on('dataDownload', (data)),
})

contextBridge.exposeInMainWorld('errors', {
    onWeirdToken: (callback) => ipcRenderer.on('weirdToken', (event, data) => callback(data)),
    onUserCloseMicrosoftFrame: (callback) => ipcRenderer.on('userCloseMicrosoftFrame', (event, data) => callback(data)),
    onMinecraftNotOwned: (callback) => ipcRenderer.on('noMinecraft', (event, data) => callback(data)),
});