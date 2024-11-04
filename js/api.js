import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';
import { getGitHubToken } from './auth.js';

// Initialize Octokit with async token
async function initializeOctokit() {
    const token = await getGitHubToken();
    const octokit = new Octokit({
        auth: token
    });

    // Check rate limit after initialization
    try {
        const { data: rateLimit } = await octokit.rest.rateLimit.get();
        console.log('GitHub API Rate Limit:', {
            remaining: rateLimit.rate.remaining,
            limit: rateLimit.rate.limit,
            resetAt: new Date(rateLimit.rate.reset * 1000).toLocaleString()
        });
    } catch (error) {
        console.error('Error checking rate limit:', error);
    }

    return octokit;
}

export async function fetchRepoDetails(owner, repo) {
    try {
        const octokit = await initializeOctokit();
        
        // Check if README exists
        const readmeResponse = await octokit.repos.getReadme({
            owner,
            repo,
            mediaType: {
                format: 'raw',
            },
        }).catch(() => null);

        // Get repository details including license
        const repoResponse = await octokit.repos.get({
            owner,
            repo,
        });

        return {
            hasReadme: !!readmeResponse,
            license: repoResponse.data.license?.spdx_id || null,
        };
    } catch (error) {
        console.error('Error fetching repo details:', error);
        return {
            hasReadme: false,
            license: null
        };
    }
}