import { fetchRepoDetails, updateGitHubRepository } from './api.js';

let projects = [];

async function fetchProjects() {
    try {
        const response = await fetch('https://api.github.com/repos/g-stanic/estro-medphys/contents/projects.json');
        const data = await response.json();
        const content = atob(data.content);
        projects = JSON.parse(content);
    } catch (error) {
        console.error('Error fetching projects:', error);
        projects = []; // Set to empty array if fetch fails
    }
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
    await fetchProjects();
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = ''; // Clear existing content
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
    });
}

export function addNewProject() {
    return new Promise(async (resolve, reject) => {
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
            return resolve({ success: false, error: "Please fill in all required fields." });
        }

        try {
            const urlParts = projectUrl.split('/');
            const repoName = urlParts.slice(3).join('/');
            const repoDetails = await fetchRepoDetails(githubUsername, repoName);

            if (!repoDetails.isContributor) {
                return resolve({ success: false, error: "Only contributors to the repository can add the project." });
            }
        } catch (error) {
            return resolve({ success: false, error: "Error: " + error.message });
        }

        try {
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

            // Update the GitHub repository with the new project
            await updateGitHubRepository(projects);

            return resolve({ success: true });
        } catch (error) {
            return resolve({ success: false, error: "Error: " + error.message });
        }
    });
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
