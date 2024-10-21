import { CLIENT_ID, REDIRECT_URI } from './config.js';

export function authenticateWithGitHub() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user`;
    const authWindow = window.open(authUrl, 'GitHub Authentication', 'width=600, height=600');
    
    if (authWindow) {
        // The opener will be available in the callback
        console.log('Authentication window opened successfully');
    } else {
        console.error('Unable to open authentication window. Please check your pop-up blocker settings.');
    }
}

export function handleAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // User has been authenticated
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.style.display = 'none'; // Hide the login button
        } else {
            console.warn('Login button not found');
        }
        // You might want to store the authentication state or token here
        console.log('User authenticated successfully');
        console.log('Authentication code:', code);
    } else {
        console.log('No authentication code found in URL');
    }

    // Return a value to make testing easier
    return { authenticated: !!code, code: code };
}
