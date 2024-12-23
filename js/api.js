import { getGitHubToken } from './auth.js';

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

/**
 * Fetches repository details using a single GraphQL query
 */
export async function fetchRepoDetails(owner, repo) {
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

        return {
            hasReadme: !!repository.object,
            license: repository.licenseInfo?.spdx_id || null,
            latestRelease: repository.releases?.nodes?.[0]?.tagName || null,
            contributors: repository.contributors?.nodes?.map(c => ({
                login: c.login,
                avatar_url: c.avatarUrl,
                contributions: c.contributionsCollection.totalCommitContributions
            })) || []
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