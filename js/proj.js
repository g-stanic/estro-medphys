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
        <p>${project.description}</p>
        <p>Owner: ${project.owner}</p>
        <p>Stars: ${project.stars}</p>
        <p>Language: ${project.language}</p>
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
    const usernameInput = document.getElementById('usernameInput');
    const repoInput = document.getElementById('repoInput');
    const repoStatus = document.getElementById('repoStatus');

    const username = usernameInput.value.trim();
    const repo = repoInput.value.trim();

    if (!username || !repo) {
        repoStatus.textContent = "Please enter both username and repository name.";
        return;
    }

    try {
        const projectDetails = await fetchRepoDetails(username, repo);

        if (!projectDetails.isContributor) {
            repoStatus.textContent = "Only contributors can add projects for this repository.";
            return;
        }

        addProject(projectDetails);
        repoStatus.textContent = "Project added successfully!";
        usernameInput.value = '';
        repoInput.value = '';
        setTimeout(() => {
            document.querySelector('.overlay').style.display = 'none';
        }, 2000);
    } catch (error) {
        repoStatus.textContent = "Error: " + error.message;
    }
}
