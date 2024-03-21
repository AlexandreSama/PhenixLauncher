/* ContentPane */
const loginContent = document.getElementById('loginContent');
const waitingContent = document.getElementById('waitingContent');
const mainContent = document.getElementById('mainContent');

/* Buttons */
const closeAppButton = document.getElementById('closeBtn');
const reduceAppButton = document.getElementById('minimizeBtn');
const loginWithMicrosoft = document.getElementById('loginOptionMicrosoft');
const saveRamButton = document.getElementById('saveRam');

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



/* End Params part */
