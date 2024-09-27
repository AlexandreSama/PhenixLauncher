/* ContentPane */
const elements = {
    loginContent: document.getElementById('loginContent'),
    waitingContent: document.getElementById('waitingContent'),
    mainContent: document.getElementById('mainContent'),
    closeAppButton: document.getElementById('closeBtn'),
    reduceAppButton: document.getElementById('minimizeBtn'),
    loginWithMicrosoft: document.getElementById('loginOptionMicrosoft'),
    saveRamButton: document.getElementById('saveRam'),
    openGameFolderButton: document.getElementById('openGameFolder'),
    playButton: document.getElementById('playButton'),
    errorBox: document.getElementById('error-box'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorText'),
    profilePictureUser: document.getElementById('profilePicture'),
    username: document.getElementById('username'),
    ramLabel: document.getElementById('ramLabel'),
    ramRange: document.getElementById('ramRange'),
    progressBar: document.getElementById('progress-bar'),
    progressLabel: document.getElementById('progress-bar-text')
};

/* Initialisation de l'application */
window.app.versionApp().then(res => {
    document.title = `Phenix Launcher | V${res}`;
});

elements.closeAppButton.addEventListener('click', () => {
    window.app.closeApp();
});

elements.reduceAppButton.addEventListener('click', () => {
    window.app.reduceApp();
});

/* Gestion de l'authentification Microsoft */
elements.loginWithMicrosoft.addEventListener('click', () => {
    window.mc.loginMS();
    toggleContentVisibility(elements.waitingContent, elements.loginContent);
});

/* Gestion des erreurs */
const handleError = (errorElement, data, displayElement) => {
    elements.errorTitle.innerHTML = data.title;
    elements.errorMessage.innerHTML = data.message;
    errorElement.style.display = 'flex';
    toggleContentVisibility(displayElement, elements.waitingContent);
};

window.errors.onWeirdToken(() => toggleContentVisibility(elements.loginContent, elements.waitingContent));
window.errors.onUserCloseMicrosoftFrame((data) => handleError(elements.errorBox, data, elements.loginContent));
window.errors.onMinecraftNotOwned(() => toggleContentVisibility(elements.loginContent, elements.waitingContent));

/* Gestion de l'affichage principal */
window.mc.onLoginDone((__event, data) => {
    console.log(data);
    elements.profilePictureUser.src = `https://minotar.net/avatar/${data[1]}`;
    elements.username.innerHTML = data[0];
    toggleContentVisibility(elements.mainContent, elements.waitingContent);
});

elements.playButton.addEventListener('click', () => {
    window.mc.launchGame();
});

/* Gestion des événements Java */
window.mc.onJavaEvent((status, message) => {
    updateProgress(status, message);
});

/* Gestion des événements Forge */
window.mc.onForgeEvent((status, message) => {
    updateProgress(status, message);
});

/* Gestion des événements Mod */
window.mc.onModEvent((status, message) => {
    switch (status) {
        case "modsMissing":
            elements.progressLabel.innerHTML = message;
            break;
        case "modsDownloading":
        case "modsRemoved":
            const percent = (message[1] / message[2]) * 100;
            changeProgress(percent);
            elements.progressLabel.innerHTML = message[0];
            break;
        case "modsSync":
            updateProgress(status, message);
            break;
        case "modsError":
            showErrorProgress(message);
            break;
        default:
            break;
    }
});

/* Gestion du téléchargement des données */
window.mc.onDataDownload((__event, data) => {
    elements.progressLabel.innerHTML = `Téléchargement des ${data.type} : ${data.task} / ${data.total}`;
    const percent = (data.task / data.total) * 100;
    changeProgress(percent);
});

/* Gestion de la RAM */
elements.ramRange.addEventListener('input', () => {
    elements.ramLabel.innerText = `Ram : ${elements.ramRange.valueAsNumber}Go`;
});

elements.saveRamButton.addEventListener('click', () => {
    window.mc.saveRam(elements.ramRange.valueAsNumber);
    // Ajouter ici un feedback visuel pour informer l'utilisateur de la sauvegarde.
});

window.mc.getRam().then((ramValue) => {
    elements.ramLabel.innerText = `Ram : ${ramValue}Go`;
    elements.ramRange.value = ramValue;
});

/* Ouverture du dossier de jeu */
elements.openGameFolderButton.addEventListener('click', () => {
    window.app.openGameFolder();
});

/* Fonctions utilitaires */

// Change la largeur de la barre de progression
const changeProgress = (progress) => {
    elements.progressBar.style.width = `${progress}%`;
};

// Met à jour l'affichage de la progression avec différents états
const updateProgress = (status, message) => {
    elements.progressBar.style.width = '100%';
    elements.progressLabel.innerHTML = message;
    if (status === "forgeOrJavaError" || status === "modsError") {
        elements.progressBar.style.backgroundColor = 'red';
    }
};

// Affiche un message d'erreur dans la barre de progression
const showErrorProgress = (message) => {
    elements.progressBar.style.width = '100%';
    elements.progressBar.style.backgroundColor = 'red';
    elements.progressLabel.innerHTML = message;
};

// Basculer la visibilité des contenus
const toggleContentVisibility = (showElement, hideElement) => {
    showElement.classList.add('fadeIn');
    requestAnimationFrame(() => {
        showElement.classList.add('visible');
        hideElement.style.display = 'none';
    });
};
