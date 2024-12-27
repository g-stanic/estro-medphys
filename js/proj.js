import { fetchRepoDetails } from './api.js';
import { GITHUB_USERNAME, GITHUB_REPO} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import jsyaml from 'https://cdn.skypack.dev/js-yaml';
import { getGitLogoUrl} from './logoUtils.js';
import { getUserGitHubToken, getGitHubToken, getCurrentGitHubUser } from './auth.js';
import { GitHubSubmissionHandler } from './submissionHandler.js';
import { clearAddProjectForm, createOverlay} from './ui.js';

let projects = [];
let projectsCache = {
    data: null,
    lastFetched: null,
    cacheExpiry: 5 * 60 * 1000 // 5 minutes in milliseconds
};

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

async function fetchProjects(forceRefresh = false) {
    // Return cached data if available and not expired
    if (!forceRefresh && 
        projectsCache.data && 
        projectsCache.lastFetched && 
        (Date.now() - projectsCache.lastFetched) < projectsCache.cacheExpiry) {
        return projectsCache.data;
    }

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

        // Update cache with new data
        projectsCache.data = await Promise.all(projectPromises);
        projectsCache.lastFetched = Date.now();
        
        return projectsCache.data;
    } catch (error) {
        console.error('Error in fetchProjects:', error);
        throw error;
    }
}

// Add a function to force refresh the cache
export async function refreshProjectsCache() {
    return await fetchProjects(true);
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
            
            repoDetails = await fetchRepoDetails(owner, repo, project.repository);
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
            <i class="fas fa-balance-scale license-indicator ${repoDetails.license === 'NOASSERTION' ? 'active' : (repoDetails.license ? 'active' : 'inactive')}" 
                title="${repoDetails.license === 'NOASSERTION' ? 'Check GitHub' : (repoDetails.license ? `License: ${repoDetails.license}` : 'No license found')}"></i>
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

export async function displayProjects(forceRefresh = false) {
    // Create and show loading curtain
    const curtain = document.createElement('div');
    curtain.className = 'loading-curtain';
    curtain.innerHTML = `
        <div class="loading-content">
            <div class="loading-text">Waiting for a response from ESTRO ...</div>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
        </div>
    `;
    document.body.appendChild(curtain);

    // Add skeleton cards
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = Array(4).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-logo"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-description"></div>
            <div class="skeleton-indicators">
                <div class="skeleton skeleton-indicator"></div>
            </div>
            <div class="skeleton skeleton-github-link"></div>
        </div>
    `).join('');

    try {
        // Get the progress bar element
        const progressBar = curtain.querySelector('.progress');
        
        // Add transition style and start progress animation
        progressBar.style.transition = 'width 1.5s ease-in-out';
        setTimeout(() => {
            progressBar.style.width = '80%';
        }, 100);

        // Fetch projects
        projects = await fetchProjects(forceRefresh);
        
        // Create all project cards asynchronously
        const projectCards = await Promise.all(
            projects.map(project => createProjectCard(project))
        );
        
        // Update transition for final progress (90-100%)
        progressBar.style.transition = 'width 1s ease-in-out';
        progressBar.style.width = '100%';
        
        // Wait for progress bar animation to complete
        await new Promise(resolve => setTimeout(resolve, 1300));
        
        // Remove the curtain
        curtain.remove();
        
        // Clear container and add real cards
        projectsContainer.innerHTML = '';
        projectCards.forEach(card => {
            projectsContainer.appendChild(card);
        });

    } catch (error) {
        // In case of error, remove curtain and show error message
        curtain.remove();
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

    const projectUrl = document.getElementById('projectUrl').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const projectAbbreviation = document.getElementById('projectAbbreviation').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();

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
        const repoDetails = await fetchRepoDetails(owner, repoName, projectUrl);

        // Check if the user is in the contributors list
        const isContributor = repoDetails.contributors.some(
            contributor => contributor.login.toLowerCase() === githubUsername.toLowerCase()
        );

        if (!isContributor) {
            const errorDiv = document.getElementById('overlayError');
            errorDiv.textContent = 'Only contributors to the repository can add the project.';
            errorDiv.classList.add('show');
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
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
            const overlay = document.querySelector('.overlay');
            overlay.style.display = 'none';
        } else {
            statusMessage.textContent = result.message;
        }

        // Refresh the projects cache to update the new project
        await refreshProjectsCache();   

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

export async function openProjectDetails(project, repoDetails) {
    // Hide existing elements
    document.querySelector('.search-container').style.display = 'none';
    document.querySelector('.add-project-container').style.display = 'none';
    document.getElementById('projects-container').style.display = 'none';
    document.getElementById('loginButton').style.display = 'none';

    // Create back button
    const backButton = document.createElement('button');
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Projects';
    backButton.className = 'back-button';
    backButton.onclick = () => {
        document.querySelector('.search-container').style.display = 'flex';
        document.querySelector('.add-project-container').style.display = 'flex';
        document.getElementById('projects-container').style.display = 'flex';
        document.getElementById('loginButton').style.display = 'block';
        document.getElementById('project-details').remove();
        backButton.remove();
    };

    // Get current user
    const currentUser = await getCurrentGitHubUser();
    const isSubmitter = currentUser && project.submitted_by && 
                       project.submitted_by.some(submitter => 
                           submitter.toLowerCase() === currentUser.toLowerCase());

    // Create and insert the back button and project details
    const main = document.querySelector('main');
    main.insertBefore(backButton, main.firstChild);

    const logoUrl = project.logo ? 
        getGitLogoUrl(GITHUB_USERNAME, GITHUB_REPO, project.logo) : 
        'assets/logos/default-logo.png';

    const detailsContainer = document.createElement('div');
    detailsContainer.id = 'project-details';

    detailsContainer.innerHTML = `
        <div class="project-header">
            <div class="project-details-logo">
                <img src="${logoUrl}" alt="${project.name} logo" class="project-details-image">
            </div>
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
            <p><strong>Submitted by:</strong> ${project.submitted_by ? project.submitted_by.join(', ') : 'Not specified'}</p>
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

        ${isSubmitter ? `
            <div class="project-actions-container" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button class="edit-project-button">
                    <i class="fas fa-edit"></i> Edit Project
                </button>
                <button class="remove-project-button">
                    <i class="fas fa-trash"></i> Remove Project
                </button>
            </div>
        ` : ''}
    `;

    main.appendChild(detailsContainer);

    // Add event listeners for action buttons if user is submitter
    if (isSubmitter) {
        const removeButton = detailsContainer.querySelector('.remove-project-button');
        const editButton = detailsContainer.querySelector('.edit-project-button');

        removeButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to remove this project?')) {
                try {
                    const handler = await new GitHubSubmissionHandler({
                        owner: GITHUB_USERNAME,
                        repo: GITHUB_REPO,
                        baseBranch: 'site',
                        projectsPath: '_projects'
                    }).initialize();

                    await handler.removeProject(project.name);
                    
                    // Show message about pending removal
                    alert('Project removal request submitted. It will take a minute for the action to take effect. If you still see your project after some time, contact the administrator.');
                    
                    // Go back to main view
                    backButton.click();

                    // Refresh the projects cache
                    await refreshProjectsCache();

                } catch (error) {
                    console.error('Error removing project:', error);
                    alert('Failed to remove project. Please try again later.');
                }
            }
        });

        editButton.addEventListener('click', () => {
            // Show the overlay with pre-filled project data
            const overlay = document.querySelector('.overlay') || createOverlay();
            overlay.style.display = 'block';

            // Pre-fill the form with existing project data
            document.getElementById('projectName').value = project.name || '';
            document.getElementById('projectAbbreviation').value = project.abbreviation || '';
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('projectUrl').value = project.repository || '';
            document.getElementById('projectLanguage').value = project.language || '';
            document.getElementById('githubUsername').value = project.submitted_by?.[0] || '';
            document.getElementById('orcidId').value = project.orcid_id || '';

            // Set selected keywords if they exist
            const keywordsSelect = document.getElementById('projectKeywords');
            if (project.tags) {
                Array.from(keywordsSelect.options).forEach(option => {
                    option.selected = project.tags.includes(option.value);
                });
            }

            // Update submit button text to indicate editing
            const submitButton = document.getElementById('submitRepo');
            submitButton.textContent = 'Update Project';
            
            // Store the original project name for reference
            submitButton.dataset.editMode = 'true';
            submitButton.dataset.originalName = project.name;
        });
    }
}