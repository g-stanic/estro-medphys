import { isUserAuthenticated, authenticateWithGitHub, getCurrentGitHubUser } from './auth.js';
import { handleAddNewProject } from './proj.js';
import { getOctokit } from './proj.js';

// We should add a button that allows to open a project in a new overlay or window
// that will show all the information about the project.
// It will also allow the person who added the project to edit the project information.

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
            <div id="overlayError" class="overlay-error"></div>
            
            <h3>Section 1: Project</h3>
            <div class="input-wrapper">
                <div class="input-container">
                    <span class="required-star" style="color: red;">*</span>
                    <input type="text" id="projectName" placeholder="Full project name">
                </div>
            </div>
            <input type="text" id="projectAbbreviation" placeholder="Project abbreviation">
            <div class="input-wrapper">
                <div class="input-container">
                    <span class="required-star" style="color: red;">*</span>
                    <input type="url" id="projectUrl" placeholder="Project URL">
                </div>
            </div>
            <textarea id="projectDescription" placeholder="Project description"></textarea>
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
            <input type="text" id="projectStatus" placeholder="Development status">

            <h3>Section 2: Funding information</h3>
            <input type="text" id="fundingInfo" placeholder="Funding information">
            
            <h3>Section 3: Upload project logo</h3>
            <input type="file" id="projectLogo" accept="image/*">
            
            <h3>Section 4: Submitter</h3>
            <input type="text" id="First and last name" placeholder="First and last name">
            <div class="input-wrapper">
                <div class="input-container">   
                    <span class="required-star" style="color: red;">*</span>
                    <input type="text" id="githubUsername" placeholder="GitHub Username">
            </div>
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

    document.getElementById('projectUrl').addEventListener('change', handleProjectUrlChange);

    return overlay;
}

// Helper function to check if we're in production
function isProduction() {
    return window.location.hostname === 'g-stanic.github.io';
}

export async function showOverlay() {
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

    // Only auto-fill and lock GitHub username in production
    if (isProduction()) {
        const currentUser = await getCurrentGitHubUser();
        const githubUsernameInput = document.getElementById('githubUsername');
        if (currentUser && githubUsernameInput) {
            githubUsernameInput.value = currentUser;
            githubUsernameInput.disabled = true;
            githubUsernameInput.style.backgroundColor = '#f0f0f0';
            githubUsernameInput.style.cursor = 'not-allowed';
        }
    }

    const statusMessage = document.getElementById('addProjectStatus');
    statusMessage.textContent = ''; // Clear any previous status message

    // Ensure event listeners are attached only once
    const submitBtn = overlay.querySelector('#submitRepo');
    submitBtn.removeEventListener('click', handleAddNewProject);
    submitBtn.addEventListener('click', handleAddNewProject);

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
    // Only clear GitHub username if not in production
    if (!isProduction()) {
        document.getElementById('githubUsername').value = '';
    }
    document.getElementById('orcidId').value = '';
    document.getElementById('projectLogo').value = '';
}

async function fetchRepoLanguage(owner, repo) {
    try {
        const octokit = await getOctokit();
        const response = await octokit.repos.listLanguages({
            owner,
            repo
        });
        
        // Get the language with the most bytes
        const languages = response.data;
        const primaryLanguage = Object.entries(languages)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
            
        return primaryLanguage;
    } catch (error) {
        console.error('Error fetching repository language:', error);
        return '';
    }
}

async function fetchRepoDescription(owner, repo) {
    try {
        const octokit = await getOctokit();
        const response = await octokit.repos.get({
            owner,
            repo
        });
            
        return response.data.description || '';
    } catch (error) {
        console.error('Error fetching repository description:', error);
        return '';
    }
}

async function fetchGitLabRepoInfo(owner, repo) {
    try {
        const encodedPath = encodeURIComponent(`${owner}/${repo}`);
        const baseUrl = `https://gitlab.com/api/v4/projects/${encodedPath}`;
        
        // Fetch both project info and languages in parallel
        const [projectResponse, languagesResponse] = await Promise.all([
            fetch(baseUrl),
            fetch(`${baseUrl}/languages`)
        ]);
        
        const [projectData, languages] = await Promise.all([
            projectResponse.json(),
            languagesResponse.json()
        ]);
        
        // Get the language with highest percentage
        const primaryLanguage = Object.entries(languages)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
        
        return {
            description: projectData.description || '',
            language: primaryLanguage
        };
    } catch (error) {
        console.error('Error fetching GitLab repository info:', error);
        return { description: '', language: '' };
    }
}

async function fetchGitHubRepoInfo(owner, repo) {
    try {
        const octokit = await getOctokit();
        const [languageResponse, descriptionResponse] = await Promise.all([
            octokit.repos.listLanguages({ owner, repo }),
            octokit.repos.get({ owner, repo })
        ]);
        
        // Get the primary language
        const languages = languageResponse.data;
        const primaryLanguage = Object.entries(languages)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
            
        return {
            description: descriptionResponse.data.description || '',
            language: primaryLanguage
        };
    } catch (error) {
        console.error('Error fetching GitHub repository info:', error);
        return { description: '', language: '' };
    }
}

// Updated event listener function to handle URL changes
async function handleProjectUrlChange() {
    const projectUrl = document.getElementById('projectUrl').value.trim();
    const languageInput = document.getElementById('projectLanguage');
    const descriptionInput = document.getElementById('projectDescription');
    
    if (!projectUrl) return;

    try {
        const urlParts = projectUrl.split('/');
        if (urlParts.length < 5) return;

        const owner = urlParts[3];
        const repo = urlParts[4];
        
        let repoInfo;
        if (projectUrl.includes('gitlab.com')) {
            repoInfo = await fetchGitLabRepoInfo(owner, repo);
        } else if (projectUrl.includes('github.com')) {
            repoInfo = await fetchGitHubRepoInfo(owner, repo);
        } else {
            console.warn('Unsupported repository platform');
            return;
        }

        // Update form fields with fetched information
        if (repoInfo.language) {
            languageInput.value = repoInfo.language;
        }
        if (repoInfo.description) {
            descriptionInput.value = repoInfo.description;
        }
    } catch (error) {
        console.error('Error updating repository information:', error);
    }
}
