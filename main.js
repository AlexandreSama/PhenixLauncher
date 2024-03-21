const { app, BrowserWindow, ipcMain, shell, event } = require("electron");
const { Client } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const authManager = new Auth("select_account");
const path = require("path");
const Store = require('electron-store');
const store = new Store();


let mainWindow;
let token;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1115,
        height: 720,
        // icon: "./build/icon.ico",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            devTools: true
        },
        autoHideMenuBar: true,
        frame: false,
    })

    mainWindow.loadFile("./views/main.html");
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

/* Tout ce qui concerne le fonctionnement de l'application */
ipcMain.handle("getAppName", () => app.getName());
ipcMain.handle("getAppVersion", () => app.getVersion());
ipcMain.handle("closeApp", () => app.exit())
ipcMain.handle("reduceApp", () => mainWindow.minimize());

/* 
    Cet parti gère la connexion a Microsoft a l'aide du package "msmc".
    C'est lui qui ouvre la fenêtre de connexion et gère tout le délire
    avec Oauth2. Tout ce que nous on fait, c'est vérifier si tout se passe bien
*/
ipcMain.handle("loginMS", async (event, data) => {
    try {
        const xboxManager = await authManager.launch("electron");
        token = await xboxManager.getMinecraft();

        //On vérifie s'il y a un token
        if (token) {
            //Si le token est un token de l'ancien système (Mojang)
            if (token.mcToken) {
                // Handle Minecraft token object
                console.log("Minecraft token detected");
                mainWindow.webContents.send("loginDone", [token.profile.name, token.profile.id]);
            
            //Ou s'il est un token du nouveau système (Microsoft)
            } else if (token.msToken) {
                // On récupère l'objet minecraft
                let profileInfo = await token.getMinecraft();

                //Et ici on récupère le pseudo de l'utilisateur et son id (ou uid comme tu préfère)
                let username = profileInfo.profile.name;
                let uid = profileInfo.profile.id;

                //Et on envoi les informations (qui nous permettrons d'afficher son pseudo et son skin)
                mainWindow.webContents.send("loginDone", [username, uid]);
            } else {
                console.log("Unknown token type");
                mainWindow.webContents.send("noMinecraft", {
                    title: "Ca c'est chelou",
                    message: "Va falloir en parler a Djinn"
                });
            }
        } else {
            mainWindow.webContents.send("noMinecraft", {
                title: "Pas de Minecraft",
                message: "Vous n'avez pas de version de Minecraft assigné a votre compte Microsoft"
            });
        }
    } catch (error) {
        console.error("Error occurred in handler for 'loginMS':", error);
        mainWindow.webContents.send("userCloseMicrosoftFrame", {
            title: "Connexion Annulée",
            message: "La fenêtre de connexion a été fermée avant la fin du processus."
        });
    }
});

ipcMain.handle('saveRam', async (event, data) => {
    store.set('ramUsage', data);
})
ipcMain.handle('getRam', async (event) => {
    const ramValue = store.get('ramUsage');
    //Si l'utilisateur n'a pas choisi de ram, on lui donne 5 par défaut
    if (ramValue === undefined) {
        return 5; // Valeur par défaut
    } else {
        return ramValue;
    }
})