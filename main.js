const { app, BrowserWindow, ipcMain, shell, event } = require("electron");
const { Client } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const authManager = new Auth("select_account");
const path = require("path");

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
ipcMain.handle("getAppName", () => app.getName());
ipcMain.handle("getAppVersion", () => app.getVersion());
ipcMain.handle("closeApp", () => app.exit())
ipcMain.handle("reduceApp", () => mainWindow.minimize());
ipcMain.handle("loginMS", async (event, data) => {
    try {
        const xboxManager = await authManager.launch("electron");
        token = await xboxManager.getMinecraft();

        if (token) {
            if (token.mcToken) {
                // Handle Minecraft token object
                console.log("Minecraft token detected");
                mainWindow.webContents.send("loginDone", [token.profile.name, token.profile.id]);
            } else if (token.msToken) {
                // Handle Xbox token object
                console.log("Xbox token detected");
                let profileInfo = await token.getMinecraft();
                let username = profileInfo.profile.name;
                let uid = profileInfo.profile.id;
                // Assuming Xbox token object structure; adjust as necessary
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