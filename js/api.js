import { getGitHubToken } from './auth.js';
import { PROXY_URL } from './config.js';

// Helper function to determine repository platform
function getRepoPlatform(url) {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    return null;
}

// Parse owner and repo from URL for either platform
function parseRepoUrl(url) {
    const urlParts = url.split('/');
    return {
        owner: urlParts[3],
        repo: urlParts[4]
    };
}

/**
 * Initializes a GraphQL client for GitHub's API
 */
async function initializeGraphQLClient() {
    const token = await getGitHubToken();
    return {
        query: async (query, variables) => {
            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, variables }),
            });
            return response.json();
        }
    };
}

async function fetchGitLabRepoDetails(owner, repo) {
    try {
        const encodedPath = encodeURIComponent(`${owner}/${repo}`);
        const response = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}?license=yes`, {
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Repository not found or inaccessible');
        }

        const data = await response.json();
        
        // Fetch additional details like releases and contributors
        const [releasesResponse, contributorsResponse] = await Promise.all([
            fetch(`https://gitlab.com/api/v4/projects/${data.id}/releases`),
            fetch(`https://gitlab.com/api/v4/projects/${data.id}/users`)
        ]);

        const releases = await releasesResponse.json();
        const contributors = await contributorsResponse.json();

        return {
            hasReadme: data.readme_url !== null,
            license: data.license?.key || null,
            latestRelease: releases[0]?.tag_name || null,
            contributors: contributors.map(c => ({
                login: c.username,
                avatar_url: c.avatar_url,
                contributions: c.commits || 0
            }))
        };
    } catch (error) {
        console.error('Error fetching GitLab repo details:', error);
        return {
            hasReadme: false,
            license: null,
            latestRelease: null,
            contributors: []
        };
    }
}

/**
 * Fetches the Zenodo token
 */
async function getZenodoToken() {
    try {
        const response = await fetch(`${PROXY_URL}/zenodo-token`);
        const data = await response.json();
        return data.token || null;
    } catch (error) {
        console.error('Error fetching Zenodo token:', error);
        return null;
    }
}

/**
 * Searches Zenodo for a project and returns its DOI if found
 * @param {string} projectName - The name of the project to search for
 * @param {string} [githubUrl] - Optional GitHub URL to help narrow the search
 * @returns {Promise<string|null>} - Returns the DOI if found, null otherwise
 */
export async function fetchZenodoDOI(projectName, githubUrl = null) {
    try {
        const token = await getZenodoToken();
        const encodedQuery = encodeURIComponent(`title:"${projectName}"`);
        
        // Build the search URL with relevant parameters
        let searchUrl = `https://zenodo.org/api/records?q=${encodedQuery}&type=software&size=1`;
        
        // If GitHub URL is provided, add it to narrow down results
        if (githubUrl) {
            const encodedGithub = encodeURIComponent(githubUrl);
            searchUrl += `&related_identifiers.identifier=${encodedGithub}`;
        }

        const headers = {
            'Accept': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(searchUrl, { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch from Zenodo API');
        }

        const data = await response.json();

        // Check if we found any matches
        if (data.hits.total > 0) {
            const record = data.hits.hits[0];
            return record.doi;
        }

        return null;

    } catch (error) {
        console.error('Error searching Zenodo:', error);
        return null;
    }
}

/**
 * Fetches repository details using a single GraphQL query
 */
export async function fetchRepoDetails(owner, repo, repoUrl) {
    const platform = getRepoPlatform(repoUrl);
    
    if (platform === 'gitlab') {
        return fetchGitLabRepoDetails(owner, repo);
    }
    
    // Existing GitHub implementation
    try {
        const client = await initializeGraphQLClient();
        
        const query = `
            query GetRepoDetails($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                    object(expression: "HEAD:README.md") { id }
                    licenseInfo { spdx_id: spdxId }
                    releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
                        nodes { tagName }
                    }
                    contributors: collaborators(first: 100) {
                        nodes {
                            login
                            avatarUrl
                            contributionsCollection {
                                totalCommitContributions
                            }
                        }
                    }
                }
                rateLimit {
                    limit
                    remaining
                    resetAt
                }
            }
        `;

        const { data } = await client.query(query, { owner, repo });
        
        if (data.rateLimit) {
            console.log(`GitHub API Rate Limit - Remaining: ${data.rateLimit.remaining}/${data.rateLimit.limit} | Resets at: ${new Date(data.rateLimit.resetAt).toLocaleString()}`);
        }

        if (!data?.repository) {
            throw new Error('Repository not found or inaccessible');
        }

        const repository = data.repository;

        // Fetch Zenodo DOI
        const zenodoDOI = await fetchZenodoDOI(repo, repoUrl);

        return {
            hasReadme: !!repository.object,
            license: repository.licenseInfo?.spdx_id || null,
            latestRelease: repository.releases?.nodes?.[0]?.tagName || null,
            contributors: repository.contributors?.nodes?.map(c => ({
                login: c.login,
                avatar_url: c.avatarUrl,
                contributions: c.contributionsCollection.totalCommitContributions
            })) || [],
            zenodoDOI
        };

    } catch (error) {
        console.error('Error fetching repo details:', error);
        return {
            hasReadme: false,
            license: null,
            latestRelease: null,
            contributors: [],
            zenodoDOI: null
        };
    }
}