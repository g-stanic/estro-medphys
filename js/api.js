import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";
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
    const token = GITHUB_TOKEN;
    const owner = GITHUB_USERNAME;
    const repo = GITHUB_REPO;
    const path = 'projects.json';
    const branch = 'dev/projectCommit'; // or whatever branch you're using

    const content = btoa(JSON.stringify(projects, null, 2));

    console.log('Updating GitHub repository...');
    console.log('Token (first 10 chars):', token.substring(0, 10) + '...');

    try {
        // First, get the current file (if it exists)
        const currentFile = await getCurrentFile(owner, repo, path, branch, token);

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
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
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers));
            console.error('Error data:', errorData);
            throw new Error(`Failed to update GitHub repository: ${errorData.message}`);
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
            return null; // File doesn't exist yet
        }

        if (!response.ok) {
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers));
            throw new Error(`Failed to get current file: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting current file:', error);
        return null;
    }
}
