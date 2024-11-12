import { fetchRepoDetails } from './api.js';
import { GITHUB_USERNAME, GITHUB_REPO} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import jsyaml from 'https://cdn.skypack.dev/js-yaml';
import { getGitLogoUrl} from './logoUtils.js';
import { getUserGitHubToken, getGitHubToken } from './auth.js';
import { GitHubSubmissionHandler } from './submissionHandler.js';
import { clearAddProjectForm } from './ui.js';

let projects = [];

// Initialize Octokit asynchronously
async function initializeOctokit() {
    const token = await getGitHubToken();
    return new Octokit({
        auth: token
    });
}

// Cache and retrieve Octokit instance
let octokit;
export async function getOctokit() {
    if (!octokit) {
        octokit = await initializeOctokit();
    }
    return octokit;
}

async function fetchProjects() {
    try {
        const octokit = await getOctokit();
        // Get all files from the _projects directory
        const response = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: '_projects',
            ref: 'site'   
        });

        console.log('Response received:', response);

        if (!response.data) {
            throw new Error('No data found in the response');
        }

        // Filter for .yml files only
        const ymlFiles = response.data.filter(file => file.name.endsWith('.yml'));
        
        // Fetch and parse each YAML file
        const projectPromises = ymlFiles.map(async file => {
            const fileContent = await octokit.repos.getContent({
                owner: GITHUB_USERNAME,
                repo: GITHUB_REPO,
                path: file.path,
                ref: 'site'
            });

            // Decode the base64 content
            const content = atob(fileContent.data.content);
            
            // Remove any leading/trailing document separators and whitespace
            const cleanContent = content.replace(/^---\n/, '').replace(/\n---$/, '').trim();
            
            // Parse YAML content
            const projectData = jsyaml.load(cleanContent);
            
            return {
                ...projectData,
                id: file.name.replace('.yml', '')
            };
        });

        // Wait for all projects to be fetched and parsed
        projects = await Promise.all(projectPromises);

    } catch (error) {
        console.error('Error in fetchProjects:', error);
        if (error.status === 404) {
            console.error('Repository or directory not found. Check your GitHub username, repo name, and path.');
        } else if (error.status === 403) {
            console.error('Authentication error or rate limit exceeded. Please ensure you are logged in.');
        }
        throw error;
    }
    return projects;
}

export async function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-project-id', project.id);
    card.style.cursor = 'pointer';
    
    let repoDetails = { hasReadme: false, license: null, latestRelease: null };
    
    if (project.repository) {
        try {
            const urlParts = project.repository.split('/');
            const owner = urlParts[3];
            const repo = urlParts[4];
            
            repoDetails = await fetchRepoDetails(owner, repo);
        } catch (error) {
            console.error('Error fetching repo details:', error);
        }
    }
    
    const logoUrl = project.logo ? 
        getGitLogoUrl(GITHUB_USERNAME, GITHUB_REPO, project.logo) : 
        'assets/logos/default-logo.png';

    card.innerHTML = `
        <div class="project-logo-container">
            <img src="${logoUrl}" 
                 alt="${project.name} logo" 
                 class="project-logo"
                 onerror="this.src='assets/logos/default-logo.png'">
        </div>
        <h2>${project.name}</h2>
        ${project.abbreviation ? `<p class="project-abbreviation">${project.abbreviation}</p>` : ''}
        ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
        <div class="project-indicators">
            <i class="fas fa-book readme-indicator ${repoDetails.hasReadme ? 'active' : 'inactive'}" 
               title="${repoDetails.hasReadme ? 'README available' : 'No README found'}"></i>
            <i class="fas fa-balance-scale license-indicator ${repoDetails.license ? 'active' : 'inactive'}" 
                title="${repoDetails.license ? `License: ${repoDetails.license}` : 'No license found'}"></i>
            <i class="fas fa-tag release-indicator ${repoDetails.latestRelease ? 'active' : 'inactive'}" 
               title="${repoDetails.latestRelease ? `Latest release: ${repoDetails.latestRelease}` : 'No releases found'}"></i>
        </div>
        ${project.repository ? 
            `<a href="${project.repository}" target="_blank" class="view-project">View on GitHub</a>` : 
            ''}
    `;

    // Add click event listener to the card
    card.addEventListener('click', () => {
        // Test function that does nothing
        openProjectDetails(project, repoDetails);
    });

    return card;
}

export async function displayProjects() {
    try {
        projects = await fetchProjects();
        const projectsContainer = document.getElementById('projects-container');
        projectsContainer.innerHTML = ''; // Clear existing content
        
        // Create all project cards asynchronously
        const projectCards = await Promise.all(
            projects.map(project => createProjectCard(project))
        );
        
        // Add all cards to the container
        projectCards.forEach(card => {
            projectsContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error displaying projects:', error.message);
        const projectsContainer = document.getElementById('projects-container');
        projectsContainer.innerHTML = `<p>Error loading projects: ${error.message}</p>`;
    }
}

export async function handleAddNewProject() {
    // This might not be necessary anymore since the button is disabled when not logged in
    const userToken = getUserGitHubToken();
    if (!userToken) {
        throw new Error("Please login with GitHub first to add a new project");
    }
    //////////////////////////////////////////////////////////////

    clearFieldErrors();

    const projectName = document.getElementById('projectName').value.trim();
    const projectAbbreviation = document.getElementById('projectAbbreviation').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const projectUrl = document.getElementById('projectUrl').value.trim();

    // Check if project already exists
    const exists = await checkProjectExists(projectUrl);
    if (exists) {
        const errorDiv = document.getElementById('overlayError');
        errorDiv.textContent = 'This project has already been added to the repository.';
        errorDiv.classList.add('show');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Clear any existing error message
    const errorDiv = document.getElementById('overlayError');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');

    const projectLanguage = document.getElementById('projectLanguage').value.trim();
    const projectKeywords = Array.from(document.getElementById('projectKeywords').selectedOptions).map(option => option.value);
    const githubUsername = document.getElementById('githubUsername').value.trim();
    const projectLicense = document.getElementById('projectLicense').value.trim();
    const orcidId = document.getElementById('orcidId').value.trim();
    const projectLogo = document.getElementById('projectLogo').files[0];

    let hasError = false;

    // Check each required field
    if (!projectName) {
        markFieldError('projectName');
        hasError = true;
    }
    if (!projectUrl) {
        markFieldError('projectUrl');
        hasError = true;
    }
    if (!githubUsername) {
        markFieldError('githubUsername');
        hasError = true;
    }
    if (hasError) {
        return;
    }

    let logoUrl = '';
    if (projectLogo) {
        const handler = await new GitHubSubmissionHandler({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            baseBranch: 'site',
            projectsPath: '_projects'
        }).initialize();
        logoUrl = await handler.uploadLogo(projectLogo, projectName);
    }

    const formData = {
        name: projectName,
        abbreviation: projectAbbreviation,
        description: projectDescription,
        repository: projectUrl,
        language: projectLanguage,
        website: '',
        tags: projectKeywords,
        license: projectLicense,
        logo: logoUrl,
        submitted_by: [githubUsername]
    };

    try {
        const urlParts = projectUrl.split('/');
        const owner = urlParts[3];
        const repoName = urlParts[4];
        const repoDetails = await fetchRepoDetails(owner, repoName);

        // Check if the user is in the contributors list
        const isContributor = repoDetails.contributors.some(
            contributor => contributor.login.toLowerCase() === githubUsername.toLowerCase()
        );

        if (!isContributor) {
            throw new Error("Only contributors to the repository can add the project.");
        }

        const handler = await new GitHubSubmissionHandler({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            baseBranch: 'site',
            projectsPath: '_projects'
        }).initialize();

        const result = await handler.submitProject(formData);

        const statusMessage = document.getElementById('addProjectStatus');
        
        if (result.success) {
            statusMessage.textContent = result.message;
            window.open(result.prUrl, '_blank');
            const overlay = document.querySelector('.overlay');
            overlay.style.display = 'none';
        } else {
            statusMessage.textContent = result.message;
        }

        // Create and display the new project card
        const projectsContainer = document.getElementById('projects-container');
        const newProjectCard = await createProjectCard(formData);
        projectsContainer.appendChild(newProjectCard);

        clearAddProjectForm();
    } catch (error) {
        console.error('Error adding new project:', error);
    }
}

async function checkProjectExists(projectUrl) {
    try {
        const projects = await fetchProjects();
        return projects.some(project => project.repository === projectUrl);
    } catch (error) {
        console.error('Error checking project existence:', error);
        return false;
    }
}

function markFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const wrapper = field.closest('.input-wrapper') || field.parentNode;
    field.classList.add('error-field');
    
    // Create error message if it doesn't exist
    if (!document.getElementById(`${fieldId}-error`)) {
        const errorMsg = document.createElement('div');
        errorMsg.id = `${fieldId}-error`;
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Please fill in';
        wrapper.insertBefore(errorMsg, wrapper.firstChild);
    }
}

function clearFieldErrors() {
    const errorFields = document.querySelectorAll('.error-field');
    const errorMessages = document.querySelectorAll('.error-message');
    
    errorFields.forEach(field => field.classList.remove('error-field'));
    errorMessages.forEach(msg => msg.remove());
}

export function openProjectDetails(project, repoDetails) {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const detailsWindow = window.open('', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
    
    const logoUrl = project.logo ? 
        getGitLogoUrl(GITHUB_USERNAME, GITHUB_REPO, project.logo) : 
        'assets/logos/default-logo.png';

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${project.name} - Project Details</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    color: #24292e;
                }
                .project-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .project-logo {
                    width: 150px;
                    height: 150px;
                    object-fit: contain;
                    margin-right: 20px;
                }
                .project-title {
                    flex-grow: 1;
                }
                .info-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f6f8fa;
                    border-radius: 6px;
                }
                .tag {
                    display: inline-block;
                    padding: 4px 8px;
                    margin: 2px;
                    background-color: #e1e4e8;
                    border-radius: 4px;
                }
                .indicator {
                    margin-right: 15px;
                }
                .indicator.active {
                    color: #2ea44f;
                }
                .indicator.inactive {
                    color: #586069;
                    opacity: 0.5;
                }
            </style>
        </head>
        <body>
            <div class="project-header">
                <img src="${logoUrl}" alt="${project.name} logo" class="project-logo">
                <div class="project-title">
                    <h1>${project.name}</h1>
                    ${project.abbreviation ? `<h3>${project.abbreviation}</h3>` : ''}
                </div>
            </div>

            <div class="info-section">
                <h2>Description</h2>
                <p>${project.description || 'No description available'}</p>
            </div>

            <div class="info-section">
                <h2>Project Details</h2>
                <p><strong>Repository:</strong> <a href="${project.repository}" target="_blank">${project.repository}</a></p>
                <p><strong>License:</strong> ${repoDetails.license || 'Not specified'}</p>
                <p><strong>Latest Release:</strong> ${repoDetails.latestRelease || 'No releases'}</p>
                <p><strong>Added Date:</strong> ${project.added_date || 'Not specified'}</p>
            </div>

            <div class="info-section">
                <h2>Tags</h2>
                <div>
                    ${project.tags ? project.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 'No tags'}
                </div>
            </div>

            <div class="info-section">
                <h2>Status Indicators</h2>
                <div>
                    <span class="indicator ${repoDetails.hasReadme ? 'active' : 'inactive'}">
                        <i class="fas fa-book"></i> README ${repoDetails.hasReadme ? 'Available' : 'Not available'}
                    </span>
                    <span class="indicator ${repoDetails.license ? 'active' : 'inactive'}">
                        <i class="fas fa-balance-scale"></i> License ${repoDetails.license ? 'Available' : 'Not available'}
                    </span>
                    <span class="indicator ${repoDetails.latestRelease ? 'active' : 'inactive'}">
                        <i class="fas fa-tag"></i> Releases ${repoDetails.latestRelease ? 'Available' : 'Not available'}
                    </span>
                </div>
            </div>
        </body>
        </html>
    `;

    detailsWindow.document.write(content);
    detailsWindow.document.close();
}