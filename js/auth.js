import { REDIRECT_URI, PROXY_URL} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';

/**
 * Authenticates the user with GitHub by opening the OAuth authorization URL.
 * The user is redirected to GitHub to authorize the application.
 */
export async function authenticateWithGitHub() {
    const response = await fetch(`${PROXY_URL}/client-id`);
    const data = await response.json();
    const GITHUB_CLIENT_ID = data.clientId;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user repo`;  // Added 'repo' scope
    window.open(authUrl, 'GitHub Authentication', 'width=600,height=600');
}

/**
 * Handles the authorization code received from GitHub after user authentication.
 * Exchanges the code for an access token and stores it in session storage.
 * 
 * @param {string} code - The authorization code received from GitHub.
 * @returns {boolean} - Returns true if the token is successfully retrieved and stored, otherwise false.
 */
export async function handleAuthCode(code) {
    if (code) {
        try {
            const response = await fetch(`${PROXY_URL}/exchange-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            if (data.access_token) {
                sessionStorage.setItem('github_token', data.access_token);
                return true;
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            throw error;
        }
    }
    return false;
}

/**
 * Fetches a server token for general API operations from the proxy server.
 * 
 * @returns {string|null} - Returns the GitHub token if available, otherwise null.
 */
export async function getServerGitHubToken() {
    try {
        const response = await fetch(`${PROXY_URL}/github-token`);
        const data = await response.json();
        return data.token || null;
    } catch (error) {
        console.error('Error fetching GitHub token:', error);
        return null;
    }
}

/**
 * Retrieves the user token from session storage if the user is logged in.
 * 
 * @returns {string|null} - Returns the GitHub token from session storage or null if not found.
 */
export function getUserGitHubToken() {
    return sessionStorage.getItem('github_token');
}

/**
 * General purpose token getter that prefers the server token for API operations.
 * 
 * @returns {string|null} - Returns the server token or null if not available.
 */
export async function getGitHubToken() {
    const serverToken = await getServerGitHubToken();
    return serverToken;
}

/**
 * Checks if the user is authenticated by verifying the presence of a user token.
 * 
 * @returns {boolean} - Returns true if the user is authenticated, otherwise false.
 */
export function isUserAuthenticated() {
    return !!getUserGitHubToken();
}

/**
 * Fetches the current authenticated GitHub user's login name.
 * 
 * @returns {string|null} - Returns the GitHub username if authenticated, otherwise null.
 */
export async function getCurrentGitHubUser() {
    const token = sessionStorage.getItem('github_token');
    if (!token) return null;

    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.users.getAuthenticated();
        return data.login;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}