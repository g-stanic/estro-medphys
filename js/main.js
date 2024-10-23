import { projects, createProjectCard, displayProjects, loadProjects } from './proj.js';
import { addLoginButton, createOverlay, showOverlay } from './ui.js';
import { handleAuthCode } from './auth.js';
import { addNewProject } from './proj.js';

function initializeApp() {
    // loadProjects();
    addLoginButton();
    displayProjects();

    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.addEventListener('click', showOverlay);

    // Add event listener for repo submission
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'submitRepo') {
            addNewProject();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('message', function(event) {
    if (event.data.type === 'github-auth') {
        handleAuthCode(event.data.code);
    }
});
