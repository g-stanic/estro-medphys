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
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}`);
        if (!response.ok) {
            throw new Error('Repository not found');
        }
        const data = await response.json();
        return {
            name: data.name,
            owner: data.owner.login,
            repo: data.name,
            description: data.description || '',
            language: data.language || 'Unknown',
            stars: data.stargazers_count,
            url: data.html_url
        };
    } catch (error) {
        console.error('Error fetching repo details:', error);
        throw error;
    }
}
