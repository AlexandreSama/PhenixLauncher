/* ContentPane */
const loginContent = document.getElementById('loginContent');
const waitingContent = document.getElementById('waitingContent');
const mainContent = document.getElementById('mainContent');

/* Buttons */
const closeAppButton = document.getElementById('closeBtn');
const reduceAppButton = document.getElementById('minimizeBtn');
const loginWithMicrosoft = document.getElementById('loginOptionMicrosoft');
const saveRamButton = document.getElementById('saveRam');
const openGameFolderButton = document.getElementById('openGameFolder');
const playButton = document.getElementById('playButton');

/* Error-Box */
const errorBox = document.getElementById('error-box');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorText');

/* User Infos */
const profilePictureUser = document.getElementById('profilePicture');
const username = document.getElementById('username');

/* Ram Range*/
const ramLabel = document.getElementById('ramLabel');
const ramRange = document.getElementById('ramRange');

/* Progress */
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-bar-text');

/* App */
window.app.versionApp().then(res => {
    document.title = `Phenix Launcher | V${res}`;
});

closeAppButton.addEventListener('click', () => {
    window.app.closeApp();
})

reduceAppButton.addEventListener('click', () => {
    window.app.reduceApp();
})
/* End App part */

/* Login part */
loginWithMicrosoft.addEventListener('click', () => {
    window.mc.loginMS();
    waitingContent.classList.add('fadeIn');

    // Utilisez requestAnimationFrame pour vous assurer que la classe fadeIn est appliquée
    // et que le navigateur a eu le temps de re-calculer les styles avant de commencer la transition.
    requestAnimationFrame(() => {
        waitingContent.classList.add('visible');
        loginContent.style.display = 'none';
    });
})
/* End Login part */

/* Errors part */
window.errors.onWeirdToken((__event, data) => {
    loginContent.classList.add('fadeIn');

    requestAnimationFrame(() => {
        loginContent.classList.add('visible');
        waitingContent.style.display = 'none';
    });
})

window.errors.onUserCloseMicrosoftFrame((data) => {
    errorTitle.innerHTML = data.title;
    errorMessage.innerHTML = data.message;
    errorBox.style.display = 'flex';
    loginContent.style.display = 'flex'

    requestAnimationFrame(() => {
        loginContent.classList.add('visible');
        waitingContent.style.display = 'none';
    });
});

window.errors.onMinecraftNotOwned((__event, data) => {
    loginContent.classList.add('fadeIn');

    requestAnimationFrame(() => {
        loginContent.classList.add('visible');
        waitingContent.style.display = 'none';
    });
})

/* End Errors part */

/* Main part */
const changeProgress = progress => {
    progressBar.style.width = `${progress}%`;
};

window.mc.onLoginDone((__event, data) => {
    console.log(data);
    mainContent.classList.add('fadeIn');
    profilePictureUser.src = `https://minotar.net/avatar/${data[1]}`;
    username.innerHTML = data[0];

    requestAnimationFrame(() => {
        mainContent.classList.add('visible');
        waitingContent.style.display = 'none';
    });
})

playButton.addEventListener('click', () => {
    window.mc.launchGame();
})

window.mc.onJavaEvent((status, message) => {
    switch (status) {
        case "javaAlreadyInstalled":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "javaNotInstalled":
            progressLabel.innerHTML = message;
            break;
        case "javaExtract":
            progressLabel.innerHTML = message;
            break;
        case "javaInstalled":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        default:
            break;
    }
});

// Pour écouter les événements Forge
window.mc.onForgeEvent((status, message) => {
    switch (status) {
        case "forgeAlreadyDownloaded":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "forgeDownloading":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "forgeDownloaded":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "forgeAndJavaDownloaded":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "forgeOrJavaError":
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = 'red';
            progressLabel.innerHTML = message;
            break;
        default:
            break;
    }
});

window.mc.onModEvent((status, message) => {
    switch (status) {
        case "modsMissing":
            progressLabel.innerHTML = message;
            break;
        case "modsDownloading":
            console.log(message);
            let percent = (message[1] / message[2]) * 100;
            changeProgress(percent)
            progressLabel.innerHTML = message[0];
            break;
        case "modsRemoved":
            percent = (message[1] / message[2]) * 100;
            changeProgress(percent)
            progressLabel.innerHTML = message[0];
            break;
        case "modsSync":
            progressBar.style.width = '100%';
            progressLabel.innerHTML = message;
            break;
        case "modsError":
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = 'red';
            progressLabel.innerHTML = message;
            break;
        default:
            break;
    }
});

window.mc.onDataDownload((__event, data) => {
    progressLabel.innerHTML = `Téléchargement des ${data.type} : ${data.task} / ${data.total}`;
    const percent = (data.task / data.total) * 100;
    changeProgress(percent);
});


/* End Main part */

/* Params part */

ramRange.addEventListener('input', () => {
    ramLabel.innerText = 'Ram : ' + ramRange.valueAsNumber + 'Go';
})

saveRamButton.addEventListener('click', () => {
    window.mc.saveRam(ramRange.valueAsNumber);
    //Reste plus qu'a implémenter une petite box pour dire "C'est sauvegardé tkt"
})

window.mc.getRam().then((ramValue) => {
    // On affiche la valeur de la ram (5 ou le nombre qu'a choisi l'utilisateur)
    ramLabel.innerText = 'Ram : ' + ramValue + 'Go';
    ramRange.value = ramValue;
});

openGameFolderButton.addEventListener('click', () => {
    window.app.openGameFolder();
})

/* End Params part */
