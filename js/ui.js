import { authenticateWithGitHub } from './auth.js';
import { checkRepo } from './api.js';

export function addLoginButton() {
    const header = document.querySelector('header');
    
    const loginButton = document.createElement('button');
    loginButton.id = 'loginButton';
    loginButton.textContent = 'Login with GitHub';
    loginButton.onclick = authenticateWithGitHub;
    loginButton.style.cssText = `
        padding: 8px 16px;
        background-color: #24292e;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        position: absolute;
        top: 10px;
        right: 10px;
    `;

    header.appendChild(loginButton);
}

export function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="popup">
            <span class="close-btn">&times;</span>
            <h3>Add GitHub Repository</h3>
            <input type="text" id="usernameInput" placeholder="GitHub Username">
            <input type="text" id="repoInput" placeholder="Repository Name">
            <button id="submitRepo">Add Project</button>
            <p id="repoStatus"></p>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    const submitBtn = overlay.querySelector('#submitRepo');
    submitBtn.addEventListener('click', addNewProject);

    return overlay;
}

export function showOverlay() {
    const overlay = document.querySelector('.overlay') || createOverlay();
    overlay.style.display = 'block';
}
