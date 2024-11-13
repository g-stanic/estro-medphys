import { REDIRECT_URI, PROXY_URL} from './config.js';
import { Octokit } from 'https://cdn.skypack.dev/@octokit/rest@18.12.0';

export async function authenticateWithGitHub() {
    const response = await fetch(`${PROXY_URL}/client-id`);
    const data = await response.json();
    const GITHUB_CLIENT_ID = data.clientId;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user repo`;  // Added 'repo' scope
    window.open(authUrl, 'GitHub Authentication', 'width=600,height=600');
}

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

// Get server token for general API operations
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

// Get user token (if they're logged in)
export function getUserGitHubToken() {
    return sessionStorage.getItem('github_token');
}

// General purpose token getter - prefers server token for API operations
export async function getGitHubToken() {
    const serverToken = await getServerGitHubToken();
    return serverToken;
}

// Check if user is authenticated
export function isUserAuthenticated() {
    return !!getUserGitHubToken();
}

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