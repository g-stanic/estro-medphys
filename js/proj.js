import { fetchRepoDetails } from './api.js';
import { GITHUB_USERNAME, GITHUB_REPO} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import jsyaml from 'https://cdn.skypack.dev/js-yaml';
import { getGitLogoUrl, generateLogoPath } from './logoUtils.js';
import { getGitHubToken } from './auth.js';

// Initialize Octokit without authentication for now
export const octokit = new Octokit({
    auth: getGitHubToken() || undefined
});

// Re-initialize octokit when token changes
export function updateOctokit() {
    const token = getGitHubToken();
    if (token) {
        octokit.auth = token;
    }
}

let projects = [];

async function fetchProjects() {
    try {
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

export function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
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
        <a href="${project.url}" target="_blank" class="view-project">View on GitHub</a>
    `;
    return card;
}

export async function displayProjects() {
    try {
        projects = await fetchProjects();
        const projectsContainer = document.getElementById('projects-container');
        projectsContainer.innerHTML = ''; // Clear existing content
        projects.forEach(project => {
            const projectCard = createProjectCard(project);
            projectsContainer.appendChild(projectCard);
        });
    } catch (error) {
        console.error('Error displaying projects:', error.message);
        const projectsContainer = document.getElementById('projects-container');
        projectsContainer.innerHTML = `<p>Error loading projects: ${error.message}</p>`;
    }
}

async function saveProjectLocally(projectData) {
    try {
        const yaml = jsyaml.dump(projectData);
        const fileName = `${projectData.name.toLowerCase().replace(/\s+/g, '-')}.yml`;
        
        // Create a Blob containing the YAML data
        const blob = new Blob([yaml], { type: 'text/yaml' });
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        return { success: true, message: 'Project saved locally' };
    } catch (error) {
        console.error('Error saving project locally:', error);
        return { success: false, message: error.message };
    }
}

export async function addNewProject() {
    const projectName = document.getElementById('projectName').value.trim();
    const projectAbbreviation = document.getElementById('projectAbbreviation').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const projectUrl = document.getElementById('projectUrl').value.trim();
    const projectLanguage = document.getElementById('projectLanguage').value.trim();
    const projectKeywords = Array.from(document.getElementById('projectKeywords').selectedOptions).map(option => option.value);
    const githubUsername = document.getElementById('githubUsername').value.trim();
    const orcidId = document.getElementById('orcidId').value.trim();
    const projectLogo = document.getElementById('projectLogo').files[0];

    if (!projectName || !projectAbbreviation || !projectUrl || !githubUsername) {
        throw new Error("Please fill in all required fields.");
    }

    if (!GITHUB_CLIENT_ID) {
        throw new Error('GitHub client ID is not available');
    }

    try {
        const urlParts = projectUrl.split('/');
        const repoName = urlParts.slice(3).join('/');
        const repoDetails = await fetchRepoDetails(githubUsername, repoName);

        if (!repoDetails.isContributor) {
            throw new Error("Only contributors to the repository can add the project.");
        }

        let logoUrl = '';
        if (projectLogo) {
            logoUrl = await uploadLogo(projectLogo);
        }

        const newProject = {
            name: projectName,
            abbreviation: projectAbbreviation,
            description: projectDescription,
            url: projectUrl,
            language: projectLanguage,
            keywords: projectKeywords,
            owner: githubUsername,
            orcidId: orcidId,
            logo: logoUrl
        };

        // Check if we're in development/testing mode
        const isTestMode = true;

        let result;
        if (isTestMode) {
            result = await saveProjectLocally(newProject);
        } else {
            // Existing GitHub submission logic
            projects.push(newProject);
            await updateGitHubRepository(projects);
            result = { success: true };
        }

        if (result.success) {
            // Create and display the new project card
            const projectsContainer = document.getElementById('projects-container');
            const newProjectCard = createProjectCard(newProject);
            projectsContainer.appendChild(newProjectCard);
        }

        return result;
    } catch (error) {
        console.error('Error adding new project:', error);
        throw error;
    }
}

export async function uploadLogo(file, projectName) {
    try {
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const logoPath = generateLogoPath(projectName, fileExtension);
        
        // Convert file to base64 for GitHub API
        const base64Content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const token = getGitHubToken();
        const octokit = new Octokit({ auth: token });

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: logoPath,
            message: `Add logo for ${projectName}`,
            content: base64Content,
            branch: 'site'
        });

        return logoPath;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
}
// Test