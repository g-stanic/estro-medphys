import { projects, createProjectCard, displayProjects } from './proj.js';
import { addLoginButton, createOverlay, showOverlay } from './ui.js';
import { handleAuthCode } from './auth.js';
import { checkRepo } from './api.js';

function initializeApp() {
    addLoginButton();
    displayProjects();

    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.addEventListener('click', showOverlay);

    // Add event listener for repo submission
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'submitRepo') {
            checkRepo();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('message', function(event) {
    if (event.data.type === 'github-auth') {
        handleAuthCode(event.data.code);
    }
});
