import { projects, createProjectCard, displayProjects } from './proj.js';
import { addLoginButton, createOverlay, showOverlay } from './ui.js';
import { handleAuthentication } from './auth.js';
import { checkRepo } from './api.js';

function initializeApp() {
    addLoginButton();
    handleAuthentication();

    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.addEventListener('click', showOverlay);

    // Add event listener for repo submission
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'submitRepo') {
            checkRepo();
        }
    });

    setTimeout(displayProjects, 100);
}

document.addEventListener('DOMContentLoaded', initializeApp);
