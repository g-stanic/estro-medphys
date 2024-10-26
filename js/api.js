import { GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO } from './config.js';

export async function checkRepo() {
    const repoInput = document.getElementById('repoInput');
    const repoStatus = document.getElementById('repoStatus');
    const repo = repoInput.value.trim();

    if (!repo) {
        repoStatus.textContent = "Please enter a repository.";
        return;
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (response.ok) {
            repoStatus.textContent = "The repo exists.";
        } else {
            repoStatus.textContent = "The repo does not exist.";
        }
    } catch (error) {
        repoStatus.textContent = "An error occurred while checking the repository.";
        console.error('Error:', error);
    }
}

export async function fetchRepoDetails(username, repo) {
    try {
        const [repoResponse, contributorsResponse] = await Promise.all([
            fetch(`https://api.github.com/repos/${repo}`),
            fetch(`https://api.github.com/repos/${repo}/contributors`)
        ]);

        if (!repoResponse.ok || !contributorsResponse.ok) {
            throw new Error('Repository not found or unable to fetch contributors');
        }

        const repoData = await repoResponse.json();
        const contributorsData = await contributorsResponse.json();

        const isContributor = contributorsData.some(contributor => contributor.login.toLowerCase() === username.toLowerCase());

        return {
            name: repoData.name,
            owner: repoData.owner.login,
            repo: repoData.name,
            description: repoData.description || '',
            language: repoData.language || 'Unknown',
            stars: repoData.stargazers_count,
            url: repoData.html_url,
            isContributor: isContributor
        };
    } catch (error) {
        console.error('Error fetching repo details:', error);
        throw error;
    }
}

export async function updateGitHubRepository(projects) {
    const token = GITHUB_TOKEN; // Replace with your GitHub Personal Access Token
    const owner = GITHUB_USERNAME; // Replace with your GitHub username
    const repo = GITHUB_REPO;
    const path = 'projects.json';
    const branch = 'dev/projectCommit';

    const content = btoa(JSON.stringify(projects, null, 2));

    try {
        const currentFile = await getCurrentFile(owner, repo, path, branch, token);
    
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            }, 
            body: JSON.stringify({
                message: 'Update projects',
                content: content,
                sha: currentFile ? currentFile.sha : null,
                branch: branch
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error('Failed to update GitHub repository');
        }

        console.log('GitHub repository updated successfully');
    } catch (error) {
        console.error('Error updating GitHub repository:', error);
        throw error;
    }
}

async function getCurrentFile(owner, repo, path, branch, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch current file: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching current file:', error);
        return null;
    }
}
