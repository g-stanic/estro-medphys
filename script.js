// List of projects to display
const projects = [
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

function createProjectCard(project) {
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

function displayProjects() {
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = ''; // Clear existing content
    
    // Add the "Add new project" button
    const addProjectButton = createAddProjectButton();
    projectsContainer.appendChild(addProjectButton);
    
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
    });
}

function createHeader() {
    const header = document.createElement('header');
    header.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        padding: 10px;
        z-index: 1000;
    `;

    const loginButton = document.createElement('button');
    loginButton.id = 'loginButton'; // Add an ID for easy access
    loginButton.textContent = 'Login with GitHub';
    loginButton.onclick = authenticateWithGitHub;
    loginButton.style.cssText = `
        padding: 8px 16px;
        background-color: #24292e;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    header.appendChild(loginButton);
    document.body.insertBefore(header, document.body.firstChild);
}

// Add these new functions and variables

const CLIENT_ID = 'Ov23li90C8HHNhrfSWVH';
const REDIRECT_URI = 'https://g-stanic.github.io/estro-medphys/callback.html';

function authenticateWithGitHub() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user`;
    window.location.href = authUrl;
}

function handleAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // User has been authenticated
        document.getElementById('loginButton').style.display = 'none'; // Hide the login button
        showProjectForm(); // Assuming this function exists to show the project form
    }
}

function createAddProjectButton() {
    const button = document.createElement('button');
    button.textContent = 'Add new project';
    button.id = 'addProjectButton';
    button.style.cssText = `
        background-color: #2ecc71;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 16px;
        border-radius: 5px;
        cursor: pointer;
        margin: 20px auto;
        display: block;
    `;
    button.onclick = () => {
        // TODO: Implement the logic to add a new project
        console.log('Add new project button clicked');
    };
    return button;
}

// Call this function when the page loads
window.onload = function() {
    createHeader();
    displayProjects();
    handleAuthentication();
};
