import { fetchRepoDetails } from './api.js';
import { GITHUB_USERNAME, GITHUB_REPO} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import jsyaml from 'https://cdn.skypack.dev/js-yaml';
import { getGitLogoUrl} from './logoUtils.js';
import { getGitHubToken } from './auth.js';
import { GitHubSubmissionHandler } from './submissionHandler.js';
import { clearAddProjectForm } from './ui.js';

let projects = [];

async function fetchProjects() {
    try {
        // Create a basic unauthenticated Octokit instance
        const octokit = new Octokit();
        
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
        }
        throw error;
    }
    return projects;
}

export async function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    let repoDetails = { hasReadme: false };
    
    // Only try to fetch repo details if we have a repository URL
    if (project.repository) {
        try {
            // Extract owner and repo from project URL
            const urlParts = project.repository.split('/');
            const owner = urlParts[3];
            const repo = urlParts[4];
            
            // Fetch repo details
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
        </div>
        ${project.repository ? 
            `<a href="${project.repository}" target="_blank" class="view-project">View on GitHub</a>` : 
            ''}
    `;
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

// async function saveProjectLocally(projectData) {
//     try {
//         const yaml = jsyaml.dump(projectData);
//         const fileName = `${projectData.name.toLowerCase().replace(/\s+/g, '-')}.yml`;
        
//         // Create a Blob containing the YAML data
//         const blob = new Blob([yaml], { type: 'text/yaml' });
        
//         // Create a download link
//         const downloadLink = document.createElement('a');
//         downloadLink.href = URL.createObjectURL(blob);
//         downloadLink.download = fileName;
        
//         // Trigger download
//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);
        
//         return { success: true, message: 'Project saved locally' };
//     } catch (error) {
//         console.error('Error saving project locally:', error);
//         return { success: false, message: error.message };
//     }
// }

export async function handleAddNewProject() {
    const token = getGitHubToken();
    if (!token) {
        throw new Error("Please login with GitHub first");
    }

    const projectName = document.getElementById('projectName').value.trim();
    const projectAbbreviation = document.getElementById('projectAbbreviation').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const projectUrl = document.getElementById('projectUrl').value.trim();
    const projectLanguage = document.getElementById('projectLanguage').value.trim();
    const projectKeywords = Array.from(document.getElementById('projectKeywords').selectedOptions).map(option => option.value);
    const githubUsername = document.getElementById('githubUsername').value.trim();
    const projectLicense = document.getElementById('projectLicense').value.trim();
    const orcidId = document.getElementById('orcidId').value.trim();
    const projectLogo = document.getElementById('projectLogo').files[0];

    if (!projectName || !projectUrl || !githubUsername) {
        throw new Error("Please fill in all required fields.");
    }

    let logoUrl = '';
    if (projectLogo) {
        const handler = new GitHubSubmissionHandler({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            baseBranch: 'site',
            projectsPath: '_projects'
        });
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
        const repoName = urlParts.slice(3).join('/');
        const repoDetails = await fetchRepoDetails(githubUsername, repoName);

        if (!repoDetails.isContributor) {
            throw new Error("Only contributors to the repository can add the project.");
        }

        const handler = new GitHubSubmissionHandler({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            baseBranch: 'site',
            projectsPath: '_projects'
        });

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
        const newProjectCard = createProjectCard(formData);
        projectsContainer.appendChild(newProjectCard);

        clearAddProjectForm();
    } catch (error) {
        console.error('Error adding new project:', error);
    }
}