const { app, BrowserWindow, ipcMain, shell, event } = require("electron");
const { Client } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const authManager = new Auth("select_account");
const path = require("path");
const Store = require('electron-store');
const store = new Store();
const fs = require('fs').promises;
const axios = require('axios');
const AdmZip = require('adm-zip');
const Downloader = require("nodejs-file-downloader");

let mainWindow;
let token;

let appPaths = path.join(app.getPath("appData"), "Kashir Launcher");
let gameFolders = [appPaths, path.join(appPaths, "java"), path.join(appPaths, "mods")];
const launcher = new Client();

async function checkAndCreateFolders(folders) {
    for (const folderPath of folders) {
        try {
            await fs.access(folderPath); // Vérifie si le dossier existe
            console.log(`Le dossier existe déjà : ${folderPath}`);
        } catch {
            await fs.mkdir(folderPath, { recursive: true }); // Crée le dossier s'il n'existe pas
            console.log(`Dossier créé : ${folderPath}`);
        }
    }
}

// Télécharge un fichier avec gestion des erreurs
async function downloadFile({ url, directory, fileName }) {
    const downloader = new Downloader({
        url,
        directory,
        fileName,
        cloneFiles: false
    });

    try {
        await downloader.download();
        console.log(`Downloaded: ${fileName}`);
    } catch (error) {
        console.error(`Error downloading ${fileName}:`, error);
        throw error;
    }
}

// Gère l'installation de Java
async function handleJavaInstallation(javaFolder, event) {
    try {
        const files = await fs.readdir(javaFolder);
        if (files.length === 0) {
            event.sender.send("javaEvents", "javaNotInstalled", "Java n'est pas installé ! Je le télécharge...");
            await downloadFile({
                url: "https://launcher.kashir.fr/java",
                directory: javaFolder,
                fileName: "java.zip"
            });
            event.sender.send("javaEvents", "javaExtract", "Java est téléchargé et est en train d'être installé");
            const zip = new AdmZip(path.join(javaFolder, "java.zip"));
            zip.extractAllTo(javaFolder, true);
            await fs.unlink(path.join(javaFolder, "java.zip"));
            event.sender.send("javaEvents", "javaInstalled", "Java est installé !");
        } else {
            event.sender.send("javaEvents", "javaAlreadyInstalled", "Java est déjà installé !");
        }
    } catch (error) {
        console.error(`Error handling Java installation: ${error.message}`);
        throw error;
    }
}

// Gère l'installation de Forge
async function handleForgeInstallation(rootFolder, event) {
    const forgeFilePath = path.join(rootFolder, "forge.jar");
    try {
        await fs.access(forgeFilePath);
        event.sender.send("forgeEvents", "forgeAlreadyDownloaded", "Forge est déjà téléchargé !");
    } catch {
        event.sender.send("forgeEvents", "forgeDownloading", "Forge n'est pas téléchargé ! Je le télécharge...");
        await downloadFile({
            url: "https://launcher.kashir.fr/forge",
            directory: rootFolder,
            fileName: "forge.jar"
        });
        event.sender.send("forgeEvents", "forgeDownloaded", "Forge téléchargé !");
    }
}

// Vérifie et installe Java et Forge si nécessaire
async function checkJavaAndForge(rootFolder, javaFolder, event) {
    try {
        await handleJavaInstallation(javaFolder, event);
        await handleForgeInstallation(rootFolder, event);
        event.sender.send("forgeEvents", "forgeAndJavaDownloaded", "Vérification de Java et Forge complète !");
        return true;
    } catch (error) {
        console.error(`Error checking Java and Forge: ${error.message}`);
        event.sender.send("forgeEvents", "forgeOrJavaError", `Error checking Java and Forge: ${error.message}`);
        return false;
    }
}

// Synchronise les fichiers avec la liste JSON
async function synchronizeFilesWithJSON(modsPath, event) {
    try {
        const { data: jsonContent } = await axios.get("https://launcher.kashir.fr/modlist");
        const folderFiles = await fs.readdir(modsPath);

        // Identifier les fichiers manquants
        const missingFiles = jsonContent.filter(file => !folderFiles.includes(file));
        const extraFiles = folderFiles.filter(file => !jsonContent.includes(file));

        // Télécharger les fichiers manquants
        if (missingFiles.length > 0) {
            event.sender.send("modEvents", "modsMissing", `${missingFiles.length} mods manquants !`);
            for (let i = 0; i < missingFiles.length; i++) {
                const file = missingFiles[i];
                await downloadFile({
                    url: `https://launcher.kashir.fr/mod/${file}`,
                    directory: modsPath,
                    fileName: file
                });
                event.sender.send("modEvents", "modsDownloading", [`Téléchargement de: ${i + 1} / ${missingFiles.length} mods`, i + 1, missingFiles.length]);
            }
        }

        // Supprimer les fichiers en trop
        if (extraFiles.length > 0) {
            for (const file of extraFiles) {
                await fs.unlink(path.join(modsPath, file));
            }
            event.sender.send("modEvents", "modsRemoved", `${extraFiles.length} fichiers inutiles ont été supprimés.`);
        }

        event.sender.send("modEvents", "modsSync", "Synchronisation des mods complète!");
        return true;
    } catch (error) {
        console.error("Error synchronizing files", error);
        event.sender.send("modEvents", "modsError", `Erreur de synchronisation des fichiers: ${error.message}`);
        return false;
    }
}

// Lance le jeu avec les paramètres donnés
async function launchGame(token, rootFolder, javaFolder, event, mainWindow) {
    try {
        const ramUsage = store.get('ramUsage', '8'); // Utilise '8G' comme valeur par défaut

        const opts = {
            clientPackage: null,
            authorization: token.mclc(),
            root: rootFolder,
            forge: path.join(rootFolder, "forge.jar"),
            javaPath: path.join(javaFolder, "java", "bin", "java.exe"),
            version: {
                number: "1.20.1",
                type: "release"
            },
            memory: {
                max: `${ramUsage}G`,
                min: "4G"
            }
        };

        launcher.launch(opts);

        launcher.on("close", (e) => {
            const errorMessage = (e === 1) ? "closed the Minecraft Process" : "Minecraft Process has crashed";
            mainWindow.show();
            event.sender.send("stoppingGame", `Le processus Minecraft s'est arrêté avec le code: ${e}. ${errorMessage}`);
        });

        launcher.on("debug", (e) => {
            console.log(`["Minecraft-Debug"] ${e}`);
        });

        launcher.on("progress", (e) => {
            console.log(e);
            event.sender.send("dataDownload", {
                type: e.type,
                task: e.task,
                total: e.total
            });
        });

        launcher.once("data", () => {
            mainWindow.hide();
            event.sender.send("LaunchingGame");
        });
    } catch (error) {
        console.error("Error launching game", error);
        event.sender.send("gameError", `Erreur de lancement du jeu: ${error.message}`);
    }
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1115,
        height: 720,
        icon: "./build/icon.ico",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            devTools: true
        },
        autoHideMenuBar: true,
        frame: false,
    });

    mainWindow.loadFile("./views/main.html");
};

// Application prête
app.whenReady().then(async () => {
    createWindow();

    try {
        await checkAndCreateFolders(gameFolders);
        console.log("Vérification et création des dossiers terminées.");
    } catch (error) {
        console.error("Erreur lors de la vérification ou de la création des dossiers :", error);
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Fermeture de l'application sur toutes les fenêtres fermées
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Handlers IPC
ipcMain.handle("getAppName", () => app.getName());
ipcMain.handle("getAppVersion", () => app.getVersion());
ipcMain.handle("closeApp", () => app.exit());
ipcMain.handle("reduceApp", () => mainWindow.minimize());

ipcMain.handle("loginMS", async (event, data) => {
    try {
        const xboxManager = await authManager.launch("electron");
        token = await xboxManager.getMinecraft();

        if (token) {
            handleToken(token);
        } else {
            mainWindow.webContents.send("noMinecraft", {
                title: "Pas de Minecraft",
                message: "Vous n'avez pas de version de Minecraft assigné à votre compte Microsoft"
            });
        }
    } catch (error) {
        console.error("Erreur dans le handler 'loginMS':", error);
        mainWindow.webContents.send("userCloseMicrosoftFrame", {
            title: "Connexion Annulée",
            message: "La fenêtre de connexion a été fermée avant la fin du processus."
        });
    }
});

// Fonction pour gérer le token reçu
async function handleToken(token) {
    if (token.mcToken) {
        console.log("Minecraft token detected");
        mainWindow.webContents.send("loginDone", [token.profile.name, token.profile.id]);
    } else if (token.msToken) {
        try {
            const profileInfo = await token.getMinecraft();
            const username = profileInfo.profile.name;
            const uid = profileInfo.profile.id;
            mainWindow.webContents.send("loginDone", [username, uid]);
        } catch (error) {
            console.error("Erreur lors de la récupération du profil Minecraft:", error);
        }
    } else {
        console.log("Type de token inconnu");
        mainWindow.webContents.send("noMinecraft", {
            title: "Ca c'est chelou",
            message: "Va falloir en parler à Djinn"
        });
    }
}

ipcMain.handle('saveRam', (event, data) => {
    store.set('ramUsage', data);
});

ipcMain.handle('getRam', () => {
    return store.get('ramUsage', 5); // Retourne 5 par défaut si aucune valeur n'est définie
});

ipcMain.handle('openGameFolder', () => {
    shell.openPath(appPaths);
});

ipcMain.handle('launchGame', async (event) => {
    try {
        await checkAndCreateFolders(gameFolders);
        await checkJavaAndForge(gameFolders[0], gameFolders[1], event);
        await synchronizeFilesWithJSON(gameFolders[2], event);
        launchGame(token, gameFolders[0], gameFolders[1], event, mainWindow);
    } catch (error) {
        console.error("Erreur lors du lancement du jeu :", error);
    }
});