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

let appPaths = path.join(app.getPath("appData"), "Phenix Launcher");
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

async function downloadFile({ url, directory, fileName }) {
    const downloader = new Downloader({
        url,
        directory,
        fileName,
        cloneFiles: false // Ajoutez d'autres options selon vos besoins
    });

    try {
        await downloader.download();
        console.log(`Downloaded: ${fileName}`);
    } catch (error) {
        console.error(`Error downloading ${fileName}:`, error);
        throw error; // Rethrow l'erreur pour arrêter la boucle en cas de problème avec un téléchargement
    }
}

async function checkJavaAndForge(rootFolder, javaFolder, event) {
    try {
        // Vérifie si Java est déjà installé
        const files = await fs.readdir(javaFolder);
        if (files.length === 0) {
            event.sender.send("javaEvents", "javaNotInstalled", "Java n'est pas installé ! Je le télécharge...");
            await downloadFile({
                url: "https://phenixlauncher.kashir.fr/java", // Assurez-vous que l'URL est correcte
                directory: javaFolder,
                fileName: "java.zip"
            });
            event.sender.send("javaEvents", "javaExtract", "Java est téléchargé et est entrain d'être installé");
            const zip = new AdmZip(path.join(javaFolder, "java.zip"));
            zip.extractAllTo(javaFolder, true);
            await fs.unlink(path.join(javaFolder, "java.zip"));
            event.sender.send("javaEvents", "javaInstalled", "Java est installé ! ");
        } else {
            event.sender.send("javaEvents", "javaAlreadyInstalled", "Java est déjà installé !");
        }

        // Vérifie si Forge est déjà installé
        const forgeFilePath = path.join(rootFolder, "forge.jar");
        try {
            await fs.access(forgeFilePath);
            event.sender.send("forgeEvents", "forgeAlreadyDownloaded", "Forge est déjà téléchargé !");
        } catch {
            event.sender.send("forgeEvents", "forgeDownloading", "Forge n'est pas téléchargé ! Je le télécharge...");
            await downloadFile({
                url: "https://phenixlauncher.kashir.fr/forge", // Assurez-vous que l'URL est correcte
                directory: rootFolder,
                fileName: "forge.jar"
            });
            event.sender.send("forgeEvents", "forgeDownloaded", "Forge téléchargé !");
        }

        event.sender.send("forgeEvents", "forgeAndJavaDownloaded", "Vérification de Java et Forge complète !");
        return true;
    } catch (error) {
        console.log(error);
        event.sender.send("forgeEvents", "forgeOrJavaError", "Error checking Java and Forge : " + error.message);
        return false;
    }
}

async function synchronizeFilesWithJSON(modsPath, event) {
    try {
        const response = await axios.get("https://phenixlauncher.kashir.fr/modlist");
        const jsonContent = response.data;
        const folderFiles = await fs.readdir(modsPath);

        // Identifier les fichiers manquants
        const missingFiles = jsonContent.filter(file => !folderFiles.includes(file));

        // Télécharger les fichiers manquants un par un
        if (missingFiles.length > 0) {
            event.sender.send("modEvents", "modsMissing", `${missingFiles.length} files are missing from the folder!`);
            for (let i = 0; i < missingFiles.length; i++) {
                const file = missingFiles[i];
                await downloadFile({
                    url: `https://phenixlauncher.kashir.fr/mod/${file}`,
                    directory: modsPath,
                    fileName: file
                });
                event.sender.send("modEvents", "modsDownloading", `Downloaded file: ${i + 1} / ${missingFiles.length}`);
            }
        }

        // Supprimer les fichiers en trop
        const extraFiles = folderFiles.filter(file => !jsonContent.includes(file));
        if (extraFiles.length > 0) {
            for (const file of extraFiles) {
                await fs.unlink(path.join(modsPath, file));
            }
            event.sender.send("modEvents", "modsRemoved", `${extraFiles.length} unnecessary files were removed.`);
        }

        event.sender.send("modEvents", "modsSync", "Synchronisation des mods compléte!");
        return true;
    } catch (error) {
        console.error("Error synchronizing files", error);
        event.sender.send("modEvents", "modsError", "Error synchronizing files");
        return false;
    }
}

async function launchGame(token, rootFolder, javaFolder, event, mainWindow) {
    // Charger la configuration de la RAM depuis electron-store
    const ramUsage = store.get('ramUsage', '8'); // Utilise '8G' comme valeur par défaut

    const opts = {
        clientPackage: null,
        authorization: token.mclc(),
        root: rootFolder,
        forge: path.join(rootFolder, "forge.jar"),
        javaPath: path.join(javaFolder, "java", "bin", "java.exe"),
        version: {
            number: "1.20.1",
            type: "release",
        },
        memory: {
            max: ramUsage + "G",
            min: "4G",
        },
    };

    launcher.launch(opts);

    launcher.on("close", (e) => {
        const errorMessage = (e === 1) ? "closed the Minecraft Process" : "Minecraft Process has crashed";
        mainWindow.show();
        event.sender.send("stoppingGame", `The Minecraft Process stopped with code: ${e}. ${errorMessage}`);
    });

    launcher.on("debug", (e) => {
        console.log(`["Minecraft-Debug"] ${e}`);
    });

    launcher.on("progress", (e) => {
        console.log(e);
        event.sender.send("dataDownload", {
            type: e.type,
            task: e.task,
            total: e.total,
        });
    });

    launcher.once("data", () => {
        mainWindow.hide();
        event.sender.send("LaunchingGame");
    });
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
    })

    mainWindow.loadFile("./views/main.html");
}

app.whenReady().then(() => {
    createWindow();
    checkAndCreateFolders(gameFolders).then(() => {
        console.log("Vérification et création des dossiers terminées.");
    }).catch(error => {
        console.error("Erreur lors de la vérification ou de la création des dossiers :", error);
    });

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
ipcMain.handle('openGameFolder', async (event) => {
    shell.openPath(appPaths)
})

ipcMain.handle('launchGame', async (event) => {

    checkAndCreateFolders(gameFolders).then(() => {
        checkJavaAndForge(gameFolders[0], gameFolders[1], event).then(() => {
            synchronizeFilesWithJSON(gameFolders[2], event).then(() => {
                launchGame(token, gameFolders[0], gameFolders[1], event, mainWindow);
            }).catch(error => {
                console.error("Erreur :", error);
            })
        }).catch(error => {
            console.error("Erreur :", error);
        })
    }).catch(error => {
        console.error("Erreur lors de la vérification ou de la création des dossiers :", error);
    });
})