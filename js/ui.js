import { authenticateWithGitHub } from './auth.js';

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

    const submitBtn = overlay.querySelector('#submitRepo');
    submitBtn.addEventListener('click', addNewProject);

    // Add event listener to fetch project language from GitHub
    const githubUsernameInput = overlay.querySelector('#githubUsername');
    const projectNameInput = overlay.querySelector('#projectName');
    const projectLanguageInput = overlay.querySelector('#projectLanguage');

    githubUsernameInput.addEventListener('blur', () => {
        if (githubUsernameInput.value && projectNameInput.value) {
            fetchProjectLanguage(githubUsernameInput.value, projectNameInput.value, projectLanguageInput);
        }
    });

    return overlay;
}

async function fetchProjectLanguage(username, repo, languageInput) {
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}`);
        if (response.ok) {
            const data = await response.json();
            languageInput.value = data.language || '';
        }
    } catch (error) {
        console.error('Error fetching project language:', error);
    }
}

export function showOverlay() {
    const overlay = document.querySelector('.overlay') || createOverlay();
    overlay.style.display = 'block';
}