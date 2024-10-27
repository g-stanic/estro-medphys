import { fetchRepoDetails, updateGitHubRepository } from './api.js';
import { GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO } from './config.js';
import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";

let octokit = new Octokit({auth: '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'});

let projects = [];

async function fetchProjects() {
    try {
        const response = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: 'projects.json',
            ref: 'dev/projectCommit'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.content) {
            throw new Error('No content found in the response');
        }
        
        // Decode the base64 encoded content
        const content = atob(data.content);
        projects = JSON.parse(content);

    } catch (error) {
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

    if (!GITHUB_TOKEN) {
        throw new Error('GitHub token is not available');
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
