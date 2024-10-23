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

export function fetchRepoDetails(username, repo) {
    try {
        const [repoResponse, contributorsResponse] = ([
            fetch(`https://api.github.com/repos/${repo}`),
            fetch(`https://api.github.com/repos/${repo}/contributors`)
        ]);

        if (!repoResponse.ok || !contributorsResponse.ok) {
            throw new Error('Repository not found or unable to fetch contributors');
        }

        const repoData = repoResponse.json();
        const contributorsData = contributorsResponse.json();

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
