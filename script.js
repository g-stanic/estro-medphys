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
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
    });
}

// Call this function when the page loads
displayProjects();