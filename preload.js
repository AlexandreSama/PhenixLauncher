const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('app', {
    nomApp: () => ipcRenderer.invoke('getAppName'),
    versionApp: () => ipcRenderer.invoke('getAppVersion'),
    closeApp: () => ipcRenderer.invoke('closeApp'),
    reduceApp: () => ipcRenderer.invoke('reduceApp'),
    //nous pouvons aussi exposer des variables, pas seulement des fonctions
})

contextBridge.exposeInMainWorld('mc', {
    loginMS: () => ipcRenderer.invoke('loginMS'),
    onLoginDone: (profile) => ipcRenderer.on('loginDone', (profile)),
    //nous pouvons aussi exposer des variables, pas seulement des fonctions
})

contextBridge.exposeInMainWorld('errors', {
    onWeirdToken: (callback) => ipcRenderer.on('weirdToken', (event, data) => callback(data)),
    onUserCloseMicrosoftFrame: (callback) => ipcRenderer.on('userCloseMicrosoftFrame', (event, data) => callback(data)),
    onMinecraftNotOwned: (callback) => ipcRenderer.on('noMinecraft', (event, data) => callback(data)),
});