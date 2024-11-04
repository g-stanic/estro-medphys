import { isUserAuthenticated, authenticateWithGitHub } from './auth.js';
import { handleAddNewProject } from './proj.js';

export function addLoginButton() {
    const header = document.querySelector('header');
    const loginButton = document.createElement('button');
    loginButton.id = 'loginButton';
    loginButton.className = 'login-button';
    
    // Update button text based on auth status
    updateLoginButtonState(loginButton);
    
    loginButton.addEventListener('click', async () => {
        if (!isUserAuthenticated()) {
            await authenticateWithGitHub();
        } else {
            // Handle logout
            sessionStorage.removeItem('github_token');
            updateLoginButtonState(loginButton);
            
            // Update add project button status
            const statusMessage = document.getElementById('addProjectStatus');
            if (statusMessage) {
                statusMessage.textContent = '';
            }
        }
    });

    header.appendChild(loginButton);
}

export function updateLoginButtonState(button) {
    if (isUserAuthenticated()) {
        button.textContent = 'Logout';
        button.classList.add('logged-in');
        
        // Enable add project button
        const addProjectButton = document.getElementById('addProjectButton');
        if (addProjectButton) {
            addProjectButton.disabled = false;
        }
    } else {
        button.textContent = 'Login with GitHub';
        button.classList.remove('logged-in');
        
        // Disable add project button
        const addProjectButton = document.getElementById('addProjectButton');
        if (addProjectButton) {
            addProjectButton.disabled = true;
        }
    }
}

export function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="popup">
            <span class="close-btn">&times;</span>
            <h2>Add New Project</h2>
            
            <h3>Section 1: Project</h3>
            <input type="text" id="projectName" placeholder="Full project name">
            <input type="text" id="projectAbbreviation" placeholder="Project abbreviation">
            <textarea id="projectDescription" placeholder="Project description"></textarea>
            <input type="url" id="projectUrl" placeholder="Project URL">
            <input type="text" id="projectLanguage" placeholder="Project language">
            <select id="projectKeywords" multiple>
                <option value="medical-physics">Medical Physics</option>
                <option value="radiation-therapy">Radiation Therapy</option>
                <option value="imaging">Imaging</option>
                <option value="dosimetry">Dosimetry</option>
                <option value="quality-assurance">Quality Assurance</option>
                <!-- Add more options as needed -->
            </select>
            <select id="projectLicense">
                <option value="GPL-3.0">GPL-3.0</option>
                <option value="MIT">MIT</option>
                <option value="Apache-2.0">Apache-2.0</option>
            </select>
            
            <!-- New logo input field -->
            <input type="file" id="projectLogo" accept="image/*">
            <label for="projectLogo">Upload Project Logo</label>
            
            <h3>Section 2: Contact Info</h3>
            <input type="text" id="githubUsername" placeholder="GitHub Username">
            <input type="text" id="orcidId" placeholder="ORCID ID (if applicable)">
            
            <button id="submitRepo">Add Project</button>
            <p id="repoStatus"></p>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    return overlay;
}

// async function fetchProjectLanguage(username, repo, languageInput) {
//     try {
//         const response = await fetch(`https://api.github.com/repos/${username}/${repo}`);
//         if (response.ok) {
//             const data = await response.json();
//             languageInput.value = data.language || '';
//         }
//     } catch (error) {
//         console.error('Error fetching project language:', error);
//     }
// }

export function showOverlay() {
    // Check authentication before showing overlay
    if (!isUserAuthenticated()) {
        const statusMessage = document.getElementById('addProjectStatus');
        statusMessage.textContent = 'Please login with GitHub first to add a new project';
        statusMessage.style.color = 'red';
        return;
    }

    let overlay = document.querySelector('.overlay');
    if (!overlay) {
        overlay = createOverlay();
    }
    overlay.style.display = 'block';

    const statusMessage = document.getElementById('addProjectStatus');
    statusMessage.textContent = ''; // Clear any previous status message

    // Ensure event listeners are attached only once
    const submitBtn = overlay.querySelector('#submitRepo');
    submitBtn.removeEventListener('click', handleAddNewProject); // Remove any existing listener
    submitBtn.addEventListener('click', handleAddNewProject); // Add new listener

    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
}

export function clearAddProjectForm() {
    document.getElementById('projectName').value = '';
    document.getElementById('projectAbbreviation').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectUrl').value = '';
    document.getElementById('projectLanguage').value = '';
    document.getElementById('projectKeywords').selectedIndex = -1;
    document.getElementById('githubUsername').value = '';
    document.getElementById('orcidId').value = '';
    document.getElementById('projectLogo').value = '';
}
