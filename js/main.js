import { displayProjects} from './proj.js';
import { addLoginButton, showOverlay } from './ui.js';
import { handleAuthCode } from './auth.js';

async function initializeApp() {
    addLoginButton();
    await displayProjects();

    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.addEventListener('click', showOverlay); // handleAddProjectClick);
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('message', function(event) {
    if (event.data.type === 'github-auth') {
        handleAuthCode(event.data.code);
    }
});
