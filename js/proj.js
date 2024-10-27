import { fetchRepoDetails, updateGitHubRepository } from './api.js';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_USERNAME, GITHUB_REPO } from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import { createOAuthAppAuth } from 'https://cdn.skypack.dev/@octokit/auth-oauth-app@5.0.5';

export const octokit = new Octokit({
    authStrategy: createOAuthAppAuth({
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
    }),
});

let projects = [];

async function fetchProjects() {
    try {
        // Authenticate the app
        const appAuthentication = await createOAuthAppAuth({
            clientId: GITHUB_CLIENT_ID,
            clientSecret: GITHUB_CLIENT_SECRET,
        })({
            type: "oauth-app",
        });

        // Use the app authentication token
        const response = await octokit.rest.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: 'projects.json',
            ref: 'dev/projectCommit',
            headers: {
                authorization: `token ${appAuthentication.token}`,
                accept: 'application/vnd.github+json'
            }
        });

        console.log('Response received:', response);

        if (!response.data) {
            throw new Error('No data found in the response');
        }

        if (!response.data.content) {
            throw new Error('No content found in the response');
        }

        // Decode the base64 encoded content
        const content = atob(response.data.content);
        projects = JSON.parse(content);

    } catch (error) {
        console.error('Error in fetchProjects:', error);
        if (error.status === 401) {
            console.error('Authentication failed. Check your OAuth credentials.');
        } else if (error.status === 404) {
            console.error('Repository or file not found. Check your GitHub username, repo name, and file path.');
        }
        throw error;
    }
    return projects;
}

export function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
        <h2>${project.name}</h2>
        <p>${project.abbreviation}</p>
        ${project.logo ? `<img src="${project.logo}" alt="${project.name} logo" class="project-logo">` : ''}
        <a href="${project.url}" target="_blank">View on GitHub</a>
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

        projects.push(newProject);

        // Create and display the new project card
        const projectsContainer = document.getElementById('projects-container');
        const newProjectCard = createProjectCard(newProject);
        projectsContainer.appendChild(newProjectCard);

        // Update the GitHub repository with the new project
        await updateGitHubRepository(projects);

        return { success: true };
    } catch (error) {
        console.error('Error adding new project:', error);
        throw error;
    }
}

async function uploadLogo(file) {
    // In a real application, you would upload the file to a server here
    // For this example, we'll use a data URL
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
