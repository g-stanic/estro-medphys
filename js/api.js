import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';

export async function fetchRepoDetails(owner, repo) {
    const octokit = new Octokit();
    try {
        // Check if README exists
        const readmeResponse = await octokit.repos.getReadme({
            owner,
            repo,
            mediaType: {
                format: 'raw',
            },
        }).catch(() => null);

        // Check if user is contributor
        const contributorResponse = await octokit.repos.listContributors({
            owner,
            repo,
        });

        return {
            hasReadme: !!readmeResponse,
            isContributor: true  // Your existing contributor check logic
        };
    } catch (error) {
        console.error('Error fetching repo details:', error);
        return {
            hasReadme: false,
            isContributor: false
        };
    }
}