import { fetchRepoDetails } from './api.js';

// List of projects to display
export let projects = [
    {
        name: "Whisper",
        owner: "openai",
        repo: "whisper",
        description: "Robust Speech Recognition via Large-Scale Weak Supervision",
        language: "Python",
        stars: 21000,
        url: "https://github.com/openai/whisper"
    },
    {
        name: "TensorFlow",
        owner: "tensorflow",
        repo: "tensorflow",
        description: "An open-source machine learning framework for everyone",
        language: "C++",
        stars: 166000,
        url: "https://github.com/tensorflow/tensorflow"
    },
    {
        name: "React",
        owner: "facebook",
        repo: "react",
        description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
        language: "JavaScript",
        stars: 190000,
        url: "https://github.com/facebook/react"
    },
    {
        name: "LLaMA",
        owner: "meta",
        repo: "llama",
        description: "Large Language Model Meta AI",
        language: "Python",
        stars: 21000,
        url: "https://github.com/meta/llama"
    }
    // Add more projects here...
];

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

export function displayProjects() {
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = ''; // Clear existing content
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
    });
}

export function addProject(newProject) {
    projects.push(newProject);
    saveProjects();
    displayProjects();
}

export function saveProjects() {
    localStorage.setItem('customProjects', JSON.stringify(projects.slice(4))); // Save only custom projects
}

export function loadProjects() {
    const customProjects = JSON.parse(localStorage.getItem('customProjects')) || [];
    projects = [...projects.slice(0, 4), ...customProjects]; // Combine default and custom projects
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
    const repoStatus = document.getElementById('repoStatus');

    if (!projectName || !projectAbbreviation || !projectUrl || !githubUsername) {
        repoStatus.textContent = "Please fill in all required fields.";
        return;
    }

    const urlParts = projectUrl.split('/');
    const repoOwner = urlParts[urlParts.length - 2];
    const repoName = urlParts[urlParts.length - 1];
    const repoDetails = await fetchRepoDetails(githubUsername, repoName);

    if (!repoDetails.isContributor) {
        repoStatus.textContent = "Only contributors to the repository can add the project.";
        return;
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

        addProject(newProject);
        repoStatus.textContent = "Project added successfully!";
        document.querySelector('.overlay').style.display = 'none';
    } catch (error) {
        repoStatus.textContent = "Error: " + error.message;
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
