/**
 * Main application script for initializing the app and handling authentication.
 * This script sets up event listeners and manages the UI state based on user actions.
 */

import { displayProjects } from './proj.js';
import { addLoginButton, showOverlay, updateLoginButtonState } from './ui.js';
import { handleAuthCode } from './auth.js';

/**
 * Initializes the application by setting up the login button and displaying projects.
 * This function is called when the DOM content is fully loaded.
 */
async function initializeApp() {
    // Add the login button to the UI
    addLoginButton();

    // Display the list of projects
    await displayProjects();

    // Set up the event listener for the "Add Project" button
    const addProjectButton = document.getElementById('addProjectButton');
    if (addProjectButton) {
        addProjectButton.addEventListener('click', showOverlay);
    }
}

// Event listener for when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Event listener for messages from other windows (e.g., authentication responses)
window.addEventListener('message', async function(event) {
    // Check if the message is related to GitHub authentication
    if (event.data.type === 'github-auth') {
        // Handle the authentication code received from GitHub
        const success = await handleAuthCode(event.data.code);
        if (success) {
            // After successful authentication, update the UI
            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                updateLoginButtonState(loginButton); // Update the state of the login button
            }
            // Close the popup window if it's still open
            if (event.source) {
                event.source.close();
            }
        }
    }
});