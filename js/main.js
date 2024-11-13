import { displayProjects } from './proj.js';
import { addLoginButton, showOverlay, updateLoginButtonState } from './ui.js';
import { handleAuthCode } from './auth.js';

async function initializeApp() {
    addLoginButton();

    await displayProjects();

    const addProjectButton = document.getElementById('addProjectButton');
    if (addProjectButton) {
        addProjectButton.addEventListener('click', showOverlay);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('message', async function(event) {
    if (event.data.type === 'github-auth') {
        const success = await handleAuthCode(event.data.code);
        if (success) {
            // After successful authentication, update UI
            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                updateLoginButtonState(loginButton); // Update login button state
            }
            // await displayProjects();
            
            // Close the popup window if it's still open
            if (event.source) {
                event.source.close();
            }
        }
    }
});
