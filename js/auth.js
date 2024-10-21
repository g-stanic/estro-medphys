import { CLIENT_ID, REDIRECT_URI } from './config.js';

export function authenticateWithGitHub() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user`;
    window.location.href = authUrl;
}

export function handleAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // User has been authenticated
        document.getElementById('loginButton').style.display = 'none'; // Hide the login button
    }
}
