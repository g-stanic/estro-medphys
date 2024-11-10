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
        
        // Fetch all promises in parallel
        const [readmeResponse, repoResponse, releases, contributors] = await Promise.all([
            octokit.repos.getReadme({
                owner,
                repo,
                mediaType: { format: 'raw' },
            }).catch(() => null),
            
            octokit.repos.get({
                owner,
                repo,
            }),
            
            octokit.rest.repos.listReleases({
                owner,
                repo,
            }),
            
            octokit.rest.repos.listContributors({
                owner,
                repo,
            }).catch(() => ({ data: [] }))
        ]);

        return {
            hasReadme: !!readmeResponse,
            license: repoResponse.data.license?.spdx_id || null,
            latestRelease: releases.data[0]?.tag_name || null,
            contributors: contributors.data.map(c => ({
                login: c.login,
                avatar_url: c.avatar_url,
                contributions: c.contributions
            }))
        };
        
    } catch (error) {
        console.error('Error fetching repo details:', error);
        return {
            hasReadme: false,
            license: null,
            latestRelease: null,
            contributors: []
        };
    }
}