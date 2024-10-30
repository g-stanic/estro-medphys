import { REDIRECT_URI, PROXY_URL} from './config.js';

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
                
                const loginButton = document.getElementById('loginButton');
                if (loginButton) {
                    loginButton.style.display = 'none';
                }
                console.log('User authenticated successfully');
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
        }
    }
}

export function getGitHubToken() {
    return sessionStorage.getItem('github_token');
}
