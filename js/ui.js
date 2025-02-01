import { isUserAuthenticated, authenticateWithGitHub, getCurrentGitHubUser } from './auth.js';
import { handleAddNewProject } from './proj.js';
import { getOctokit } from './proj.js';
import { fetchZenodoDOI } from './api.js';

// We should add a button that allows to open a project in a new overlay or window
// that will show all the information about the project.
// It will also allow the person who added the project to edit the project information.

export function addLoginButton() {
    const headerContainer = document.querySelector('.header-container');
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

    headerContainer.appendChild(loginButton);
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
                <label for="projectUrl">Project URL:<span class="required-star" style="color: red;">*</span></label>
                <input type="url" id="projectUrl">
            </div>
            <div class="input-wrapper">
                <label for="projectName">Full Project Name:<span class="required-star" style="color: red;">*</span></label>
                <input type="text" id="projectName">
            </div>
            <div class="input-wrapper">
                <label for="projectAbbreviation">Project Abbreviation:</label>
                <input type="text" id="projectAbbreviation">
            </div>
            <div class="input-wrapper">
                <label for="projectDescription">Project Description:</label>
                <textarea id="projectDescription"></textarea>
            </div>
            <div class="input-wrapper">
                <label for="projectLanguage">Project Language:</label>
                <input type="text" id="projectLanguage">
            </div>
            <div class="input-wrapper">
                <label for="projectKeywords">Keywords:</label>
                <select id="projectKeywords" multiple>
                    <option value="medical-physics">Medical Physics</option>
                    <option value="radiation-therapy">Radiation Therapy</option>
                    <option value="imaging">Imaging</option>
                    <option value="dosimetry">Dosimetry</option>
                    <option value="quality-assurance">Quality Assurance</option>
                </select>
            </div>
            <div class="input-wrapper">
                <label for="projectLicense">Project License:</label>
                <input type="text" id="projectLicense">
            </div>
            <div class="input-wrapper">
                <label for="projectDOI">
                    DOI:
                    <i class="fas fa-info-circle info-icon" 
                       title="If you do not have a DOI consider registering your project on Zenodo"></i>
                </label>
                <input type="text" id="projectDOI">
            </div>
            <div class="input-wrapper">
                <label for="projectStatus">Development Status:</label>
                <input type="text" id="projectStatus">
            </div>

            <h3>Section 2: Funding information</h3>
            <div class="input-wrapper">
                <label for="fundingInfo">Funding Information:</label>
                <input type="text" id="fundingInfo">
            </div>
            
            <h3>Section 3: Upload project logo</h3>
            <div class="input-wrapper">
                <label for="projectLogo">Project Logo:</label>
                <input type="file" id="projectLogo" accept="image/*">
            </div>
            
            <h3>Section 4: Submitter</h3>
            <div class="input-wrapper">
                <label for="githubUsername">GitHub Username:<span class="required-star" style="color: red;">*</span></label>
                <input type="text" id="githubUsername">
            </div>
            <div class="input-wrapper">
                <label for="submitterName">First and Last Name:</label>
                <input type="text" id="submitterName">
            </div>
            <div class="input-wrapper">
                <label for="orcidId">ORCID ID (if applicable):</label>
                <input type="text" id="orcidId">
            </div>
            
            <button id="submitRepo">Add Project</button>
            <p id="repoStatus"></p>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        clearAddProjectForm();
    });

    document.getElementById('projectUrl').addEventListener('change', handleProjectUrlChange);

    return overlay;
}

// Helper function to check if we're in production
function isProduction() {
    return window.location.hostname === 'g-stanic.github.io';
}

export async function showOverlay(platform = 'repository') {
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

    // Only auto-fill and lock GitHub username in production and for repository platforms
    if (isProduction() && platform === 'repository') {
        const currentUser = await getCurrentGitHubUser();
        const githubUsernameInput = document.getElementById('githubUsername');
        if (currentUser && githubUsernameInput) {
            githubUsernameInput.value = currentUser;
            githubUsernameInput.disabled = true;
            githubUsernameInput.style.backgroundColor = '#f0f0f0';
            githubUsernameInput.style.cursor = 'not-allowed';
        }
    }

    // Disable URL change handler for websites
    const projectUrlInput = document.getElementById('projectUrl');
    if (platform === 'website') {
        projectUrlInput.removeEventListener('change', handleProjectUrlChange);
    } else {
        projectUrlInput.addEventListener('change', handleProjectUrlChange);
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
        clearAddProjectForm();
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
    // Check if repo exists
    const encodedPath = encodeURIComponent(`${owner}/${repo}`);
    const baseUrl = `https://gitlab.com/api/v4/projects/${encodedPath}`;
    const response = await fetch(baseUrl);
    if (!response.ok) {
        console.error('Repository not found');
        return { name: '', description: '', language: '', license: '' };
    }

    try {
        const encodedPath = encodeURIComponent(`${owner}/${repo}`);
        const baseUrl = `https://gitlab.com/api/v4/projects/${encodedPath}`;
        const baseUrl_license = `https://gitlab.com/api/v4/projects/${encodedPath}/?license=true`;
        
        // Fetch both project info and languages in parallel
        const [projectResponse, languagesResponse] = await Promise.all([
            fetch(baseUrl_license),
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
            name: projectData.name || '',
            description: projectData.description || '',
            language: primaryLanguage,
            license: projectData.license?.name || ''
        };
    } catch (error) {
        console.error('Error fetching GitLab repository info:', error);
        return { name: '', description: '', language: '', license: '' };
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
            name: descriptionResponse.data.name || '',
            description: descriptionResponse.data.description || '',
            language: primaryLanguage,
            license: descriptionResponse.data.license?.spdx_id || ''
        };
    } catch (error) {
        console.error('Error fetching GitHub repository info:', error);
        return { name: '', description: '', language: '', license: '' };
    }
}

// Updated event listener function to handle URL changes
async function handleProjectUrlChange() {
    const projectUrl = document.getElementById('projectUrl').value.trim();
    const projectNameInput = document.getElementById('projectName');
    const languageInput = document.getElementById('projectLanguage');
    const descriptionInput = document.getElementById('projectDescription');
    const licenseInput = document.getElementById('projectLicense');
    const doiInput = document.getElementById('projectDOI');
    
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
            
            // Fetch Zenodo DOI
            const zenodoDOI = await fetchZenodoDOI(repo, projectUrl);
            if (zenodoDOI) {
                doiInput.value = zenodoDOI;
            } else {
                doiInput.value = '';
            }
        } else {
            console.warn('Unsupported repository platform');
            return;
        }

        // Update form fields with fetched information
        if (repoInfo.name) {
            projectNameInput.value = repoInfo.name;
        }
        if (repoInfo.language) {
            languageInput.value = repoInfo.language;
        }
        if (repoInfo.description) {
            descriptionInput.value = repoInfo.description;
        }
        if (repoInfo.license) {
            if (repoInfo.license === 'NOASSERTION') {
                licenseInput.value = 'Special license';
            } else {
                licenseInput.value = repoInfo.license;
            }
        }
    } catch (error) {
        console.error('Error updating repository information:', error);
    }
}

export function showPlatformSelector() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="popup platform-selector">
            <span class="close-btn">&times;</span>
            <h2>Choose the hosting platform</h2>
            <div class="platform-buttons">
                <button id="repoButton" class="platform-btn">
                    <i class="fab fa-github"></i> Github/Gitlab/Bitbucket
                </button>
                <button id="websiteButton" class="platform-btn">
                    <i class="fas fa-globe"></i> Website
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.style.display = 'block';

    // Add event listeners
    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });

    const repoButton = overlay.querySelector('#repoButton');
    repoButton.addEventListener('click', () => {
        overlay.remove();
        showOverlay('repository');
    });

    const websiteButton = overlay.querySelector('#websiteButton');
    websiteButton.addEventListener('click', () => {
        overlay.remove();
        showOverlay('website');
    });
}
