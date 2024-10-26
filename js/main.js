import { displayProjects} from './proj.js';
import { addLoginButton, showOverlay } from './ui.js';
import { handleAuthCode } from './auth.js';
import { addNewProject } from './proj.js';

async function initializeApp() {
    addLoginButton();
    await displayProjects();

    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.addEventListener('click', handleAddProjectClick);

    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated) {
        showAddProjectButton();
    } else {
        hideAddProjectButton();
    }

    // Listen for authentication state changes
    window.addEventListener('authStateChanged', handleAuthStateChange);
}

function handleAddProjectClick() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated) {
        showOverlay();
    } else {
        alert('Please log in to add a project.');
    }
}

function handleAuthStateChange(event) {
    if (event.detail.isAuthenticated) {
        showAddProjectButton();
    } else {
        hideAddProjectButton();
    }
}

function showAddProjectButton() {
    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.style.display = 'block';
}

function hideAddProjectButton() {
    const addProjectButton = document.getElementById('addProjectButton');
    addProjectButton.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('message', function(event) {
    if (event.data.type === 'github-auth') {
        handleAuthCode(event.data.code);
    }
});
